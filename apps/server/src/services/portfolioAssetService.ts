import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { config } from "#config";

import { prisma } from "#utils/prisma";
import { ApiError } from "#utils/errors";
import { logger } from "#utils/logger";
import { getRedis } from "#utils/redis";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const maxBytes = 5 * 1024 * 1024;
const releaseLockLuaScript = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  end
  return 0
`;
let client: S3Client | null = null;

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
      { expiresIn: 600 },
    );

    return { assetId: asset.id, uploadUrl, expiresInSeconds: 600 };
  }

  static async complete(userId: string, assetId: string, checksum?: string) {
    const asset = await prisma.portfolioAsset.findFirst({ where: { id: assetId, userId } });

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

    const updated = await prisma.portfolioAsset.update({
      where: { id: asset.id },
      data: { status: "READY", checksum },
    });

    return { id: updated.id, url: `${config.r2.publicBaseUrl}/${updated.key}` };
  }

  static async cleanupStaleAssets() {
    const redis = getRedis();
    const lockKey = "portfolio:assets:cleanup:lock";
    const lockValue = randomUUID();
    const lockAcquired = (await redis.set(lockKey, lockValue, { NX: true, EX: 300 })) === "OK";

    if (!lockAcquired) return;

    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const staleAssets = await prisma.portfolioAsset.findMany({
        where: {
          status: "PENDING",
          createdAt: { lt: oneDayAgo },
        },
      });

      if (staleAssets.length === 0) return;

      const s3 = getClient();
      const deletedIds: string[] = [];
      for (const asset of staleAssets) {
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: config.r2.bucket, Key: asset.key }));
          deletedIds.push(asset.id);
        } catch (error) {
          logger.warn("Failed to delete stale R2 asset; retaining metadata for retry", {
            assetId: asset.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (deletedIds.length === 0) return;

      await prisma.portfolioAsset.deleteMany({
        where: { id: { in: deletedIds } },
      });
    } finally {
      await redis
        .eval(releaseLockLuaScript, { keys: [lockKey], arguments: [lockValue] })
        .catch((error) => logger.warn("Failed to release portfolio asset cleanup lock", error));
    }
  }

  static async delete(userId: string, assetId: string) {
    const asset = await prisma.portfolioAsset.findFirst({ where: { id: assetId, userId } });

    if (!asset) throw new ApiError(404, "Portfolio asset not found.");

    await getClient().send(new DeleteObjectCommand({ Bucket: config.r2.bucket, Key: asset.key }));
    await prisma.portfolioAsset.delete({ where: { id: asset.id } });
  }
}
