import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { config } from "#config";

import { prisma } from "#lib/prisma";
import { ApiError } from "#lib/errors";
import { logger } from "#lib/logger";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const maxBytes = 5 * 1024 * 1024;
const MAX_UPLOADS_PER_WINDOW = 20;
const UPLOAD_WINDOW_MS = 60 * 60 * 1000;
/** How long a presigned PUT URL stays valid. */
const UPLOAD_URL_TTL_SECONDS = 600;
/**
 * How long a DELETED row is kept: past the URL's life (with clock-skew room), nothing can PUT to
 * its key any more, so deleting the object then is final (V-224).
 */
const DELETED_ASSET_HOLD_MS = (UPLOAD_URL_TTL_SECONDS + 5 * 60) * 1000;
/** How long an abandoned upload, or a completed image nothing references, is kept. */
const STALE_ASSET_AGE_MS = 24 * 60 * 60 * 1000;
let client: S3Client | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assetIdOf(value: unknown): string | null {
  return isRecord(value) && typeof value.id === "string" && value.id ? value.id : null;
}

/**
 * Calls `visit` with every image slot of a portfolio body: the avatar, the social image, and each
 * item's cover on the main page and on every extra page. `visit` gets the slot's value and a
 * setter for it. Reads JSON without parsing it against the schema, so an older or partly invalid
 * body is still walked.
 */
function forEachImageSlot(
  content: unknown,
  visit: (value: unknown, set: (next: unknown) => void) => void,
) {
  if (!isRecord(content)) return;

  const slot = (holder: unknown, field: string) => {
    if (isRecord(holder)) visit(holder[field], (next) => (holder[field] = next));
  };

  slot(content.identity, "avatar");
  slot(content.seo, "socialImage");

  const sectionLists = [
    content.sections,
    ...(Array.isArray(content.pages)
      ? content.pages.map((page) => (isRecord(page) ? page.sections : null))
      : []),
  ];

  for (const sections of sectionLists) {
    if (!Array.isArray(sections)) continue;
    for (const section of sections) {
      if (!isRecord(section) || !Array.isArray(section.items)) continue;
      for (const item of section.items) slot(item, "coverImage");
    }
  }
}

/**
 * Every asset id a stored portfolio body references (see `forEachImageSlot`), so an older or
 * partly invalid body still protects the images it shows.
 */
export function referencedAssetIds(content: unknown): Set<string> {
  const ids = new Set<string>();
  forEachImageSlot(content, (value) => {
    const id = assetIdOf(value);
    if (id) ids.add(id);
  });
  return ids;
}

/** Whether any image slot holds something other than empty or an uploaded asset reference. */
export function hasUnownedImageSlot(content: unknown): boolean {
  let found = false;
  forEachImageSlot(content, (value) => {
    if (value !== null && value !== undefined && !assetIdOf(value)) found = true;
  });
  return found;
}

/**
 * A copy of `content` whose every image url is rebuilt from the stored object's key (V-227): the
 * posted url is a request, and a published site must never hot-link an image that skipped the
 * upload cap and the type checks. `keys` maps each referenced asset id to its key.
 */
export function withStoredAssetUrls<T>(content: T, keys: Map<string, string>): T {
  const copy = structuredClone(content);
  forEachImageSlot(copy, (value, set) => {
    const id = assetIdOf(value);
    const key = id ? keys.get(id) : undefined;
    if (id && key) set({ ...(value as Record<string, unknown>), id, url: publicAssetUrl(key) });
  });
  return copy;
}

/** The `suspensionReason` of the user's own Unpublish (see `PortfolioService`). */
export const USER_UNPUBLISHED_REASON = "user_unpublished";

/**
 * Whether the stored snapshot can come back without a new publish, so its images must stay. A
 * billing lapse or an admin takedown suspends the row but keeps the snapshot: a renewal
 * (`BillingService`) or an admin lift (`adminPortfolioService.updatePublicationStatus`) sets it
 * LIVE again as it was. Only the user's own Unpublish retires it: republishing uses the draft.
 */
function snapshotRestorable(publication: { status: string; suspensionReason: string | null }) {
  return !(
    publication.status === "SUSPENDED" && publication.suspensionReason === USER_UNPUBLISHED_REASON
  );
}

/**
 * The asset ids any of this user's portfolio bodies still reference: every PORTFOLIO document,
 * soft-deleted ones included (a restore brings their images back), and the published snapshot
 * whatever its status, unless the user unpublished it (`snapshotRestorable`).
 */
async function assetIdsInUse(userId: string): Promise<Set<string>> {
  const [documents, publication] = await Promise.all([
    prisma.document.findMany({ where: { userId, type: "PORTFOLIO" }, select: { content: true } }),
    prisma.portfolioPublication.findUnique({
      where: { userId },
      select: { snapshot: true, status: true, suspensionReason: true },
    }),
  ]);

  const inUse = new Set<string>();
  for (const document of documents)
    for (const id of referencedAssetIds(document.content)) inUse.add(id);
  if (publication && snapshotRestorable(publication))
    for (const id of referencedAssetIds(publication.snapshot)) inUse.add(id);

  return inUse;
}

/**
 * Deletes the R2 object, then the row. An R2 failure keeps the row (logged), so the object is
 * never left without a record; the stale sweep retries it later.
 */
async function deleteAssetObject(s3: S3Client, asset: { id: string; key: string }) {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: config.r2.bucket, Key: asset.key }));
  } catch (error) {
    logger.warn("Failed to delete R2 asset; retaining metadata for retry", {
      assetId: asset.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  await prisma.portfolioAsset.deleteMany({ where: { id: asset.id } });
}

/** The public media URL of a stored object. Only ever built from the key we chose. */
export function publicAssetUrl(key: string) {
  return `${config.r2.publicBaseUrl}/${key}`;
}

function getClient() {
  if (
    !config.r2.endpoint ||
    !config.r2.bucket ||
    !config.r2.accessKeyId ||
    !config.r2.secretAccessKey
  )
    throw new ApiError(503, "Portfolio media uploads are not configured.");

  client ??= new S3Client({
    region: "auto",
    endpoint: config.r2.endpoint,
    credentials: { accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey },
  });

  return client;
}

export class PortfolioAssetService {
  static async createUploadUrl(
    userId: string,
    input: {
      kind: "AVATAR" | "PROJECT_COVER" | "SOCIAL_IMAGE";
      mimeType: string;
      sizeBytes: number;
    },
  ) {
    const extension = allowedTypes.get(input.mimeType);

    if (!extension) throw new ApiError(400, "Upload a JPG, PNG, or WebP image.");
    if (input.sizeBytes <= 0 || input.sizeBytes > maxBytes)
      throw new ApiError(400, "Image must be 5 MB or smaller.");

    // Each call writes a row and mints a live R2 PUT URL, so without a cap a single account can
    // spam storage and the assets table. Every upload started in the window counts, completed or
    // not: counting only PENDING rows let an upload-then-complete loop store 5 MB per call
    // without limit (V-045).
    const recentUploads = await prisma.portfolioAsset.count({
      where: { userId, createdAt: { gt: new Date(Date.now() - UPLOAD_WINDOW_MS) } },
    });

    if (recentUploads >= MAX_UPLOADS_PER_WINDOW)
      throw new ApiError(429, "Too many image uploads this hour. Try again later.");

    const key = `portfolio/${userId}/${randomUUID()}.${extension}`;
    const asset = await prisma.portfolioAsset.create({ data: { userId, key, ...input } });

    const uploadUrl = await getSignedUrl(
      getClient(),
      new PutObjectCommand({
        Bucket: config.r2.bucket,
        Key: key,
        ContentType: input.mimeType,
        ContentLength: input.sizeBytes,
      }),
      { expiresIn: UPLOAD_URL_TTL_SECONDS },
    );

    return { assetId: asset.id, uploadUrl, expiresInSeconds: UPLOAD_URL_TTL_SECONDS };
  }

  static async complete(userId: string, assetId: string, checksum?: string) {
    const asset = await prisma.portfolioAsset.findFirst({
      where: { id: assetId, userId, status: { not: "DELETED" } },
    });

    if (!asset) throw new ApiError(404, "Portfolio asset not found.");

    if (!config.r2.publicBaseUrl)
      throw new ApiError(503, "Portfolio media delivery is not configured.");

    const meta = await getClient().send(
      new HeadObjectCommand({ Bucket: config.r2.bucket, Key: asset.key }),
    );

    if (meta.ContentLength !== asset.sizeBytes) {
      throw new ApiError(
        400,
        `Uploaded file size (${meta.ContentLength} bytes) does not match expected size (${asset.sizeBytes} bytes).`,
      );
    }

    if (meta.ContentType !== asset.mimeType) {
      throw new ApiError(
        400,
        `Uploaded file type (${meta.ContentType}) does not match expected type (${asset.mimeType}).`,
      );
    }

    if (checksum) {
      const s3Checksum = meta.ETag ? meta.ETag.replace(/"/g, "") : null;
      if (s3Checksum && s3Checksum !== checksum) {
        throw new ApiError(
          400,
          `Uploaded file checksum (${s3Checksum}) does not match expected checksum (${checksum}).`,
        );
      }
    }

    // Conditional: a delete that landed during the HEAD keeps the row DELETED.
    const updated = await prisma.portfolioAsset.updateMany({
      where: { id: asset.id, status: { not: "DELETED" } },
      data: { status: "READY", checksum },
    });
    if (updated.count === 0) throw new ApiError(404, "Portfolio asset not found.");

    return { id: asset.id, url: publicAssetUrl(asset.key) };
  }

  /**
   * Deletes PENDING uploads abandoned for a day, and completed images nothing has referenced for
   * a day (V-045): one uploaded and never saved into a portfolio, or one a path dropped without
   * releasing it. Takes no lock and throws on failure: the hourly portfolio access sweep runs it
   * under its own job lock and reports a failure to `/health/jobs`. An R2 delete that fails
   * keeps the row for the next run and is not a failure.
   *
   * READY rows are taken oldest `updatedAt` first and the ones still in use are touched, so more
   * than one batch of images in use rotates instead of hiding the orphans behind it every run.
   */
  static async cleanupStaleAssets() {
    const staleBefore = new Date(Date.now() - STALE_ASSET_AGE_MS);

    // Bounded so one run can't try to issue an unbounded number of sequential R2 deletes;
    // the job runs on a schedule and drains any remainder on the next tick.
    const [pending, ready] = await Promise.all([
      prisma.portfolioAsset.findMany({
        where: {
          OR: [
            { status: "PENDING", createdAt: { lt: staleBefore } },
            // Deleted by the owner while the PUT URL was valid: the object a late PUT wrote goes now.
            { status: "DELETED", createdAt: { lt: new Date(Date.now() - DELETED_ASSET_HOLD_MS) } },
          ],
        },
        select: { id: true, key: true },
        take: 500,
      }),
      prisma.portfolioAsset.findMany({
        where: { status: "READY", updatedAt: { lt: staleBefore } },
        select: { id: true, key: true, userId: true },
        orderBy: { updatedAt: "asc" },
        take: 500,
      }),
    ]);

    const orphans: Array<{ id: string; key: string }> = [];
    const inUseIds: string[] = [];

    for (const userId of new Set(ready.map((asset) => asset.userId))) {
      const inUse = await assetIdsInUse(userId);
      for (const asset of ready.filter((candidate) => candidate.userId === userId)) {
        if (inUse.has(asset.id)) inUseIds.push(asset.id);
        else orphans.push(asset);
      }
    }

    if (inUseIds.length > 0)
      await prisma.portfolioAsset.updateMany({
        where: { id: { in: inUseIds } },
        data: { updatedAt: new Date() },
      });

    if (pending.length === 0 && orphans.length === 0) return;

    const s3 = getClient();
    for (const asset of [...pending, ...orphans]) await deleteAssetObject(s3, asset);
  }

  /**
   * Called once a draft save or a publish has committed, with the asset ids the body it replaced
   * referenced (V-045). The ones no portfolio body references any more (the old avatar, a removed
   * project cover) are deleted from R2 and the table. Never throws: the save already succeeded,
   * and anything left behind is picked up by the stale sweep.
   */
  static async releaseReplacedAssets(userId: string, previousIds: Iterable<string>) {
    try {
      const candidates = [...new Set(previousIds)];
      if (candidates.length === 0) return;

      const inUse = await assetIdsInUse(userId);
      const unused = candidates.filter((id) => !inUse.has(id));
      if (unused.length === 0) return;

      const assets = await prisma.portfolioAsset.findMany({
        where: { id: { in: unused }, userId, status: "READY" },
        select: { id: true, key: true },
      });
      if (assets.length === 0) return;

      const s3 = getClient();
      for (const asset of assets) await deleteAssetObject(s3, asset);
    } catch (error) {
      logger.warn("Could not release replaced portfolio assets; the stale sweep will retry", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * The owner removes an image. The object goes at once; the row goes too, unless the upload's
   * presigned PUT URL is still valid (V-224): then it stays as DELETED until the stale sweep, so it
   * keeps counting toward the hourly upload cap (deleting it gave the slot back while the URL could
   * still write an object no row knew of) and the sweep removes whatever a late PUT wrote.
   */
  static async delete(userId: string, assetId: string) {
    const asset = await prisma.portfolioAsset.findFirst({
      where: { id: assetId, userId, status: { not: "DELETED" } },
    });

    if (!asset) throw new ApiError(404, "Portfolio asset not found.");

    // The live page serves the published snapshot, not the draft: deleting an image it shows
    // breaks the public site until the next publish (V-045).
    const publication = await prisma.portfolioPublication.findUnique({
      where: { userId },
      select: { snapshot: true, status: true, suspensionReason: true },
    });

    if (
      publication &&
      snapshotRestorable(publication) &&
      referencedAssetIds(publication.snapshot).has(asset.id)
    )
      throw new ApiError(
        409,
        "Your published portfolio still shows this image. Publish without it first.",
      );

    await getClient().send(new DeleteObjectCommand({ Bucket: config.r2.bucket, Key: asset.key }));

    if (asset.createdAt.getTime() > Date.now() - DELETED_ASSET_HOLD_MS)
      await prisma.portfolioAsset.update({ where: { id: asset.id }, data: { status: "DELETED" } });
    else await prisma.portfolioAsset.delete({ where: { id: asset.id } });
  }

  /**
   * Best-effort R2 removal of keys whose rows are already gone. Account deletion reads the
   * keys before its cascade and calls this after commit (V-018); a failure here is logged,
   * never thrown, because the account no longer exists to report it to.
   */
  static async deleteAssetKeys(keys: string[]) {
    if (keys.length === 0) return;

    let s3: S3Client;
    try {
      s3 = getClient();
    } catch {
      logger.warn("Skipping R2 cleanup after account deletion: storage is not configured", {
        keys: keys.length,
      });
      return;
    }

    for (const key of keys) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: config.r2.bucket, Key: key }));
      } catch (error) {
        logger.warn("Failed to delete R2 object after account deletion", {
          key,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}
