import { randomUUID } from "node:crypto";

import { DocumentType, Visibility, Prisma, type Document } from "@prisma/client";
import {
  projectToResume,
  parseMasterProfile,
  projectToCoverLetter,
  salvageMasterProfile,
  unflattenLegacySections,
  hasLegacyCompatibilitySections,
} from "@veriworkly/profile-core";

import { ShareService } from "#services/shareService";

import { prisma } from "#lib/prisma";
import { logger } from "#lib/logger";
import { ApiError } from "#lib/errors";
import { buildUniqueSlugHelper, RESERVED_SUBDOMAINS } from "#utils/slugs";
import { cacheGet, cacheSet, cacheDel } from "#lib/redis";
import { bumpGeneration, resolveGenerationalKey } from "#lib/cacheGeneration";
import { cacheNamespaces, documentCacheNamespaces, userProfileCacheKey } from "#lib/cacheKeys";
import {
  invalidatePublicPortfolioCaches,
  revalidatePublicPortfolios,
} from "#utils/portfolioPublicationCache";

import { assertFreeTierCapacity } from "#services/documentCapacity";
import {
  decodeDocumentListCursor,
  encodeDocumentListCursor,
  type DocumentListFilter,
  type DocumentListPosition,
} from "#services/documentListCursor";
import {
  isModerationLocked,
  NOT_MODERATION_LOCKED,
  recordOwnerUnpublishUnderLock,
} from "#services/portfolioService";

const MODERATED_PRIVATE_MESSAGE = "This document was made private by a moderator.";

const MAX_DOCUMENTS_PER_LIST = 500;

/**
 * How far behind the query start the reported sync cursor sits. `@updatedAt` is stamped when
 * the statement runs, not when its transaction commits, so a write that commits just after
 * our snapshot can carry an `updatedAt` earlier than a cursor taken at query start and would
 * never be returned. Backing the cursor off and comparing with `>=` turns that gap into a
 * harmless overlap: the client sees such a document twice instead of never.
 */
const SYNC_CURSOR_SLACK_MS = 5_000;

type DocumentCreateInput = {
  id?: string;
  type: DocumentType;
  title?: string;
  slug?: string;
  tags?: string[];
  content?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  templateId?: string;
  visibility?: Visibility;
};

type DocumentUpdateInput = {
  title?: string;
  slug?: string;
  updateShareSlug?: boolean;
  tags?: string[];
  content?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  templateId?: string;
  visibility?: Visibility;
  revision: number;
};

type DocumentListItem = {
  id: string;
  type: DocumentType;
  title: string;
  slug: string;
  tags: string[];
  metadata: Prisma.JsonValue;
  templateId: string;
  visibility: Visibility;
  revision: number;
  lastSyncedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
  /** Present only when the list was requested with `includeContent`. */
  content?: unknown;
};

type PreparedCreate = {
  title: string;
  slugSource: string;
  initialContent: Prisma.InputJsonValue | undefined;
  resolvedTemplateId: string;
  seededDocumentId: string | undefined;
};

const MAX_DOCUMENT_PAYLOAD_BYTES = 1_000_000;

function assertDocumentPayloadSize(content: Prisma.InputJsonValue | undefined) {
  if (content && JSON.stringify(content).length > MAX_DOCUMENT_PAYLOAD_BYTES) {
    throw new ApiError(413, "Document content payload is too large");
  }
}

/**
 * Lazily migrates a stored RESUME body from the flattened section model to the typed one.
 *
 * LAZY ON READ, not a backfill script. A backfill would have to rewrite every RESUME row in
 * one pass, with no way to roll back a bad mapping and no signal about which rows it got
 * wrong — and the mapping has genuinely ambiguous cases (a reference written by the editor
 * and one mirrored from a profile disagree about which field holds the organization). On
 * read, the same `unflattenLegacySections` the studio uses runs against one document at a
 * time, the original row is untouched until the user saves, and a document nobody opens
 * costs nothing.
 *
 * The migrated shape is persisted on the next save: the studio normalises before writing,
 * so the first edit after a read stores the typed arrays.
 */
function migrateResumeContent(content: unknown): unknown {
  if (!hasLegacyCompatibilitySections(content)) return content;

  return { ...(content as Record<string, unknown>), ...unflattenLegacySections(content) };
}

/** Applies {@link migrateResumeContent} to a row and ensures row.templateId is the authoritative single source of truth. */
function withMigratedContent<
  T extends { type: DocumentType; templateId?: string; content?: unknown },
>(document: T | null): T | null {
  if (!document || document.content === undefined || document.content === null) {
    return document;
  }

  let content: unknown = document.content;
  if (document.type === "RESUME") {
    content = migrateResumeContent(content);
  }

  if (
    document.templateId &&
    typeof content === "object" &&
    content !== null &&
    !Array.isArray(content) &&
    "templateId" in content
  ) {
    content = { ...(content as Record<string, unknown>), templateId: document.templateId };
  }

  return { ...document, content };
}

/**
 * The keyset condition "strictly after `position`" in the given order, with `id` breaking ties
 * between rows stamped in the same millisecond.
 */
function keysetAfter(
  column: "updatedAt" | "deletedAt",
  position: DocumentListPosition,
  direction: Prisma.SortOrder,
): Prisma.DocumentWhereInput {
  const at = new Date(position.at);
  const beyond = direction === "asc" ? "gt" : "lt";

  return {
    OR: [{ [column]: { [beyond]: at } }, { [column]: at, id: { [beyond]: position.id } }],
  };
}

export class DocumentService {
  /**
   * A PORTFOLIO document never gets a reserved subdomain as its slug (V-300), so `login`,
   * `billing`, `admin`... are skipped like a taken name ("login-2"). A draft's subdomain has its
   * own column since V-301 (`portfolioSubdomain`); this keeps a reserved name out of the slug a
   * draft never saved through the portfolio routes still shows as its subdomain.
   */
  private static async buildUniqueSlug(
    userId: string,
    title: string,
    documentId?: string,
    client: Prisma.TransactionClient = prisma,
    type?: DocumentType,
  ) {
    return buildUniqueSlugHelper(title, async (candidate) => {
      if (type === "PORTFOLIO" && RESERVED_SUBDOMAINS.has(candidate)) return true;

      const existing = await client.document.findFirst({
        where: {
          userId,
          slug: candidate,
          ...(documentId ? { id: { not: documentId } } : {}),
        },
        select: { id: true },
      });

      return !!existing;
    });
  }

  /**
   * List documents for a user, optionally filtered by type and by modification time.
   *
   * `content` is only included when `includeContent` is set. The client's document
   * library renders from metadata alone, and `content` is by far the largest column —
   * shipping it for every document made a 50-resume list a ~600KB response. Full bodies come
   * from `getDocument` instead, and a list that includes them is never cached.
   *
   * `updatedSince` lets the client pull only what changed since its last hydrate. The cursor
   * is server-authoritative: every response carries `serverTime`, read on this clock before
   * the query, and the client sends it back as the next `updatedSince`. The comparison is
   * `updatedAt >= since` (a write stamped at exactly the cursor is returned twice rather than
   * never). Documents soft-deleted at or after the cursor come back as `{ id, deletedAt }`
   * tombstones so the other device can drop them. Incremental responses are never cached:
   * they are small, and a cached one would hand the same cursor out twice.
   *
   * LEGACY (V-263): this unpaged list (up to 500, newest first) is served only to a request with
   * no `limit` and no `cursor`, while the studio switches to {@link listDocumentPage}. Deploy the
   * server after the studio; a later change makes `limit` default to 20 and removes this path.
   */
  static async listDocuments(
    userId: string,
    type?: DocumentType,
    options?: { updatedSince?: Date; includeContent?: boolean },
  ): Promise<{
    documents: DocumentListItem[];
    deleted: Array<{ id: string; deletedAt: Date }>;
    serverTime: Date;
  }> {
    const includeContent = options?.includeContent ?? false;
    const since = options?.updatedSince;
    // Only the plain metadata list is cached (V-027/V-104): full bodies are too large for one
    // Redis value and incremental cursors would mint a new key per call. The generation is
    // read before the query, so a write that lands mid-read strands this value (V-122).
    const cacheKey =
      since || includeContent
        ? null
        : await resolveGenerationalKey(cacheNamespaces.documentList(userId), type || "all", "v3");

    if (cacheKey) {
      const cached = await cacheGet<{ documents: DocumentListItem[]; serverTime: string }>(
        cacheKey,
      );

      if (cached) {
        return {
          documents: cached.documents,
          deleted: [],
          serverTime: new Date(cached.serverTime),
        };
      }
    }

    const serverTime = new Date(Date.now() - SYNC_CURSOR_SLACK_MS);

    const documents = await prisma.document.findMany({
      where: {
        userId,
        type,
        deletedAt: null,
        ...(since ? { updatedAt: { gte: since } } : {}),
      },
      select: {
        id: true,
        type: true,
        title: true,
        slug: true,
        tags: true,
        metadata: true,
        templateId: true,
        visibility: true,
        revision: true,
        lastSyncedAt: true,
        updatedAt: true,
        createdAt: true,
        content: includeContent,
      },
      orderBy: { updatedAt: "desc" },
      // Bounded so an account with hundreds of documents cannot produce a multi-megabyte
      // response body (or, for the metadata list, cache entry).
      take: MAX_DOCUMENTS_PER_LIST,
    });

    // Migrated before the value is cached, so a cache hit serves the same shape a miss does.
    const migrated = (
      includeContent ? documents.map((document) => withMigratedContent(document)) : documents
    ) as DocumentListItem[];

    if (since) {
      const deleted = await prisma.document.findMany({
        where: { userId, type, deletedAt: { gte: since } },
        select: { id: true, deletedAt: true },
        orderBy: { deletedAt: "desc" },
        take: MAX_DOCUMENTS_PER_LIST,
      });

      return {
        documents: migrated,
        deleted: deleted as Array<{ id: string; deletedAt: Date }>,
        serverTime,
      };
    }

    if (cacheKey) await cacheSet(cacheKey, { documents: migrated, serverTime }, 1800);

    return { documents: migrated, deleted: [], serverTime };
  }

  /**
   * One page of a keyset walk over the user's documents (V-263). The paged successor to
   * {@link listDocuments}, which stays only for clients that send no `limit` or `cursor`.
   *
   * Order: a sync walk (`updatedSince` set, or `includeContent`) goes oldest first by
   * `(updatedAt, id)`. A document edited mid-walk gets a newer `updatedAt` than anything already
   * returned, so it comes round again later in the same walk instead of being skipped. The plain
   * library list goes newest first, `(updatedAt desc, id desc)`; there an edit mid-walk can move
   * a document past the reader, which a dashboard can live with and a sync could not.
   *
   * Tombstones (only with `updatedSince`) are walked beside the documents in the same cursor,
   * oldest first by `(deletedAt, id)`, up to `limit` per page as well. Each list keeps its own
   * position, so neither can push the other's rows off a page; `nextCursor` is null only once
   * both are exhausted. A document deleted mid-walk carries a `deletedAt` newer than any tombstone
   * returned so far, so it too still turns up.
   *
   * `serverTime` is read on the first page and carried in the cursor, so every page of one walk
   * reports the same value; the client adopts it as its next `updatedSince` after the last page.
   * `total` is the user's live documents of this type, whatever `updatedSince` says.
   *
   * Only the first page of the plain metadata list is cached (keyed by `limit`); a later page, a
   * sync page or a page with bodies always comes from Postgres.
   */
  static async listDocumentPage(
    userId: string,
    type: DocumentType | undefined,
    options: { updatedSince?: Date; includeContent?: boolean; limit: number; cursor?: string },
  ): Promise<{
    documents: DocumentListItem[];
    deleted: Array<{ id: string; deletedAt: Date }>;
    serverTime: Date;
    nextCursor: string | null;
    total: number;
  }> {
    const includeContent = options.includeContent ?? false;
    const since = options.updatedSince;
    const limit = options.limit;
    const filter: DocumentListFilter = {
      type: type ?? null,
      updatedSince: since ? since.toISOString() : null,
      includeContent,
    };
    const resumed = options.cursor ? decodeDocumentListCursor(options.cursor, filter) : null;
    const syncWalk = Boolean(since) || includeContent;
    const direction: Prisma.SortOrder = syncWalk ? "asc" : "desc";

    const cacheKey =
      resumed || syncWalk
        ? null
        : await resolveGenerationalKey(
            cacheNamespaces.documentList(userId),
            type || "all",
            "page",
            String(limit),
            "v1",
          );

    type CachedPage = {
      documents: DocumentListItem[];
      serverTime: string;
      nextCursor: string | null;
      total: number;
    };

    if (cacheKey) {
      const cached = await cacheGet<CachedPage>(cacheKey);

      if (cached) {
        return {
          documents: cached.documents,
          deleted: [],
          serverTime: new Date(cached.serverTime),
          nextCursor: cached.nextCursor,
          total: cached.total,
        };
      }
    }

    const serverTime = resumed
      ? new Date(resumed.serverTime)
      : new Date(Date.now() - SYNC_CURSOR_SLACK_MS);
    const documentsFrom = resumed ? resumed.documents : null;
    const deletedFrom = resumed ? resumed.deleted : null;

    const [documents, deleted, total] = await Promise.all([
      prisma.document.findMany({
        where: {
          userId,
          type,
          deletedAt: null,
          AND: [
            since ? { updatedAt: { gte: since } } : {},
            documentsFrom ? keysetAfter("updatedAt", documentsFrom, direction) : {},
          ],
        },
        select: {
          id: true,
          type: true,
          title: true,
          slug: true,
          tags: true,
          metadata: true,
          templateId: true,
          visibility: true,
          revision: true,
          lastSyncedAt: true,
          updatedAt: true,
          createdAt: true,
          content: includeContent,
        },
        orderBy: [{ updatedAt: direction }, { id: direction }],
        take: limit + 1,
      }),
      !since
        ? Promise.resolve([])
        : prisma.document.findMany({
            where: {
              userId,
              type,
              AND: [
                { deletedAt: { gte: since } },
                deletedFrom ? keysetAfter("deletedAt", deletedFrom, "asc") : {},
              ],
            },
            select: { id: true, deletedAt: true },
            orderBy: [{ deletedAt: "asc" }, { id: "asc" }],
            take: limit + 1,
          }),
      prisma.document.count({ where: { userId, type, deletedAt: null } }),
    ]);

    const documentPage = documents.slice(0, limit);
    const deletedPage = (deleted as Array<{ id: string; deletedAt: Date }>).slice(0, limit);
    const moreDocuments = documents.length > limit;
    const moreDeleted = deleted.length > limit;

    const lastDocument = documentPage[documentPage.length - 1];
    const lastDeleted = deletedPage[deletedPage.length - 1];
    const nextCursor =
      moreDocuments || moreDeleted
        ? encodeDocumentListCursor({
            v: 1,
            filter,
            serverTime: serverTime.toISOString(),
            // A list that ran dry keeps its position (not "done"): the next page looks again, so
            // a document edited or deleted after its list emptied still turns up in this walk.
            documents: lastDocument
              ? { at: lastDocument.updatedAt.toISOString(), id: lastDocument.id }
              : documentsFrom,
            deleted: lastDeleted
              ? { at: lastDeleted.deletedAt.toISOString(), id: lastDeleted.id }
              : deletedFrom,
          })
        : null;

    // The two lists come from separate queries, so a delete landing between them can put one
    // document in both. A tombstone at or after the live copy's `updatedAt` wins; the cursor above
    // still advances past the dropped row. A newer live copy (a restore) is kept.
    const deletedAtById = new Map(
      deletedPage.map((tombstone) => [tombstone.id, tombstone.deletedAt]),
    );
    const livePage = documentPage.filter((document) => {
      const deletedAt = deletedAtById.get(document.id);
      return !deletedAt || deletedAt < document.updatedAt;
    });

    const migrated = (
      includeContent ? livePage.map((document) => withMigratedContent(document)) : livePage
    ) as DocumentListItem[];

    if (cacheKey) {
      await cacheSet(cacheKey, { documents: migrated, serverTime, nextCursor, total }, 1800);
    }

    return { documents: migrated, deleted: deletedPage, serverTime, nextCursor, total };
  }

  /**
   * Get a single document by ID.
   * Results are cached for 1 hour.
   */

  static async getDocument(userId: string, documentId: string) {
    // Generation read before the DB load, so a write that lands in between strands this value.
    const cacheKey = await resolveGenerationalKey(cacheNamespaces.document(userId, documentId));
    const cached = cacheKey ? await cacheGet(cacheKey) : null;

    if (cached) return cached;

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
        deletedAt: null,
      },
    });

    const migrated = withMigratedContent(document);

    if (migrated && cacheKey) await cacheSet(cacheKey, migrated, 3600);

    return migrated;
  }

  /**
   * Create a new document.
   * If content is not provided, it attempts to seed from MasterProfile.
   */

  /** See `services/documentCapacity`; kept here for the existing callers. */
  static async assertFreeTierCapacity(
    userId: string,
    type: DocumentType,
    client: Prisma.TransactionClient = prisma,
  ) {
    await assertFreeTierCapacity(userId, type, client);
  }

  /**
   * What a create with a client-supplied id does when that id is already a row.
   *
   * The same user's live document is adopted: the stored row comes back unchanged and the
   * caller answers 200, so a double sync (S-002) or a retry that lost the first response
   * settles on the server's revision instead of retrying for ever. A soft-deleted row is a
   * 409 carrying `deletedAt`: the client must not silently resurrect what the user deleted on
   * another device. Another user's id is a bare 409.
   */
  private static adoptOrConflict(
    userId: string,
    existing: Document,
  ): { document: Document; created: false } {
    if (existing.userId !== userId) throw new ApiError(409, "Document ID already in use");

    if (existing.deletedAt) {
      throw new ApiError(409, "Document was deleted", {
        id: existing.id,
        deletedAt: existing.deletedAt,
      });
    }

    return { document: existing, created: false };
  }

  /**
   * Create a new document, or adopt the one this user already stored under `input.id`.
   * If content is not provided, it attempts to seed from MasterProfile.
   *
   * The insert itself runs under `pg_advisory_xact_lock(hashtext(userId))`, the same per-user
   * lock `billingService` uses, so the id check, the free-tier count, the slug probe and the
   * insert are serialised per user. An advisory lock rather than Serializable isolation because
   * every writer here is the same user (two tabs, a double sync), the lock costs one round trip,
   * and there is no retry loop to get wrong: a Serializable failure (P2034) would have to be
   * retried from the top, seeding included.
   *
   * `tx` lets the imports run the insert inside their own transaction (quota + profile +
   * document commit together). A P2002 inside a caller-supplied transaction is the caller's to
   * handle, because the aborted transaction cannot be retried from here.
   *
   * `created` is false when an existing row was adopted; nothing was written and no cache
   * needs clearing.
   */

  static async createDocument(
    userId: string,
    input: DocumentCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<{ document: Document; created: boolean }> {
    const prepared = await this.prepareCreate(userId, input);

    const result = tx
      ? await this.insertDocument(tx, userId, input, prepared)
      : await this.insertDocumentWithRetry(userId, input, prepared);

    if (result.created) {
      await bumpGeneration(cacheNamespaces.documentList(userId));
      await cacheDel(userProfileCacheKey(userId));
    }

    return { document: withMigratedContent(result.document)!, created: result.created };
  }

  private static async insertDocumentWithRetry(
    userId: string,
    input: DocumentCreateInput,
    prepared: PreparedCreate,
  ): Promise<{ document: Document; created: boolean }> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await prisma.$transaction((tx) => this.insertDocument(tx, userId, input, prepared));
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"))
          throw error;

        // Another user inserted this id between our check and our insert (the per-user lock
        // does not cover them). Same-user duplicates are caught before the insert.
        if (input.id) {
          const existing = await prisma.document.findUnique({ where: { id: input.id } });

          if (existing) return this.adoptOrConflict(userId, existing);
        }

        // Otherwise the slug: rebuilt on the next attempt, where the probe sees the new row.
        if (attempt >= 2) throw new ApiError(409, "Document slug is already in use");
      }
    }
  }

  private static async insertDocument(
    client: Prisma.TransactionClient,
    userId: string,
    input: DocumentCreateInput,
    prepared: PreparedCreate,
  ): Promise<{ document: Document; created: boolean }> {
    await client.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;

    if (input.id) {
      const existing = await client.document.findUnique({ where: { id: input.id } });

      if (existing) return this.adoptOrConflict(userId, existing);
    }

    await this.assertFreeTierCapacity(userId, input.type, client);

    const slug = await this.buildUniqueSlug(
      userId,
      prepared.slugSource,
      undefined,
      client,
      input.type,
    );

    const document = await client.document.create({
      data: {
        slug,
        title: prepared.title,
        userId,
        // `undefined` unless we seeded, which leaves prisma's own `@default(cuid())` in charge.
        id: input.id ?? prepared.seededDocumentId,
        type: input.type,
        tags: input.tags || [],
        lastSyncedAt: new Date(),
        content: prepared.initialContent || {},
        metadata: input.metadata || {},
        templateId: prepared.resolvedTemplateId,
        visibility: input.visibility || "PRIVATE",
      },
    });

    return { document, created: true };
  }

  /** Everything about a create that needs no lock: seeding, size checks, title and template. */
  private static async prepareCreate(
    userId: string,
    input: DocumentCreateInput,
  ): Promise<PreparedCreate> {
    let initialContent = input.content;

    /*
     * An id generated up front, and ONLY when we are about to seed.
     *
     * A seeded body has to carry the document's own id, and prisma's `@default(cuid())` only
     * produces one after the insert. Every other create still falls through to that default,
     * so this does not change the id format of server-created documents in general — only of
     * the ones an API-key caller asked the server to fill in for them. The studio always
     * sends both an id and a content body and never reaches this at all.
     */
    let seededDocumentId: string | undefined;

    /*
     * Auto-seed from the MasterProfile when no content was provided, through the same
     * projections the studio uses, so a document created over the API and one created in
     * the editor are the same shape — right id, sync block, and title.
     *
     * The raw profile content used to be assigned straight across. For a resume that was
     * merely sloppy; for a cover letter it was broken, because the letter reads senderName /
     * greeting / body and resume-shaped data has none of those keys, so every field parsed
     * to "" and the user got a blank page.
     */
    if (!initialContent && (input.type === "RESUME" || input.type === "COVER_LETTER")) {
      const profile = await prisma.masterProfile.findUnique({
        where: { userId },
      });

      if (profile) {
        // Salvage rather than parse: a stored profile that fails whole-object validation
        // should still seed whatever of it is readable, not silently seed nothing.
        const master = parseMasterProfile(profile.content) ?? salvageMasterProfile(profile.content);

        seededDocumentId = input.id ?? randomUUID();

        if (input.type === "RESUME") {
          const resume = projectToResume(master, {
            resumeId: seededDocumentId,
            templateId: input.templateId,
            title: input.title,
          });

          initialContent = resume as unknown as Prisma.InputJsonValue;
        } else {
          initialContent = projectToCoverLetter(master) as unknown as Prisma.InputJsonValue;
        }

        logger.info(`Seeding ${input.type} from MasterProfile for user ${userId}`);
      }
    }

    assertDocumentPayloadSize(initialContent);
    assertDocumentPayloadSize(input.metadata);

    const title = input.title || `Untitled ${input.type.toLowerCase().replace("_", " ")}`;

    /*
     * The row's `templateId` column and the body's must agree: the client reads the column in
     * preference to the body, so a seeded resume left at the column's "modern" default would
     * silently render in a template the profile never chose.
     */
    const resolvedTemplateId =
      input.templateId ||
      (initialContent && typeof initialContent === "object" && !Array.isArray(initialContent)
        ? ((initialContent as Record<string, unknown>).templateId as string | undefined)
        : undefined) ||
      "modern";

    if (
      initialContent &&
      typeof initialContent === "object" &&
      !Array.isArray(initialContent) &&
      "templateId" in initialContent
    ) {
      initialContent = {
        ...(initialContent as Record<string, unknown>),
        templateId: resolvedTemplateId,
      } as unknown as Prisma.InputJsonValue;
    }

    return {
      title,
      slugSource: input.slug || title,
      initialContent,
      resolvedTemplateId,
      seededDocumentId,
    };
  }

  /**
   * Update a document with optimistic concurrency control (revision check).
   *
   * Answers with the row minus `content` and `metadata` (V-028). Every autosave sends the whole
   * body, up to 1 MB, and echoing it back doubled the transfer for nothing: the studio reads
   * `id`, `revision`, `updatedAt` and `lastSyncedAt` from the reply and keeps its own copy of the
   * body. `title`, `slug` and `templateId` stay, because a rename or template switch changes them.
   */

  static async updateDocument(userId: string, documentId: string, input: DocumentUpdateInput) {
    assertDocumentPayloadSize(input.content);
    assertDocumentPayloadSize(input.metadata);

    const { revision, updateShareSlug, ...data } = input;
    const updateData = { ...data };

    let publicShareUsername: string | null = null;

    let shareLinkSlugUpdate: {
      id: string;
      slug: string;
    } | null = null;

    /*
     * The slug follows the title, but only when the title actually changed. Every autosave
     * from the editor carries the title, and recomputing on each one rewrote a slug the user
     * had set by hand (and, with `updateShareSlug`, the public share URL) on every keystroke.
     */
    let nextSlugSource: string | undefined;
    let documentType: DocumentType | undefined;

    if (input.slug || input.title) {
      const current = await prisma.document.findFirst({
        where: { id: documentId, userId, deletedAt: null },
        select: { title: true, slug: true, type: true },
      });

      if (!current) throw new ApiError(404, "Document not found");
      documentType = current.type;

      if (input.slug) {
        if (input.slug !== current.slug) nextSlugSource = input.slug;
      } else if (input.title && input.title !== current.title) {
        nextSlugSource = input.title;
      }
    }

    if (nextSlugSource) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });

      updateData.slug = await this.buildUniqueSlug(
        userId,
        nextSlugSource,
        documentId,
        prisma,
        documentType,
      );

      if (user?.username && updateData.slug && updateShareSlug) {
        const shareLink = await prisma.shareLink.findUnique({
          where: { userId_documentId: { userId, documentId } },
          select: { id: true, slug: true },
        });

        if (shareLink) {
          publicShareUsername = user.username;

          shareLinkSlugUpdate = {
            id: shareLink.id,
            slug: await ShareService.buildUniqueShareSlug(userId, updateData.slug, shareLink.id),
          };
        }
      }
    }

    /*
     * A visibility change reaches the public share read, which is cached: the same invalidation
     * the admin path does (V-171), so "Make private" stops a link at once. An owner may not undo a
     * moderator's "Make private" here either, the same rule `ShareService.createShareLink` applies.
     */
    let visibilityTouchesShares = false;
    let visibilityShareUsername: string | null = null;

    if (input.visibility) {
      const current = await prisma.document.findFirst({
        where: { id: documentId, userId, deletedAt: null },
        select: {
          visibility: true,
          moderatedPrivateAt: true,
          user: { select: { username: true } },
          _count: { select: { shareLinks: true } },
        },
      });

      if (!current) throw new ApiError(404, "Document not found");

      if (input.visibility !== "PRIVATE" && current.moderatedPrivateAt)
        throw new ApiError(403, MODERATED_PRIVATE_MESSAGE);

      if (input.visibility !== current.visibility && current._count.shareLinks > 0) {
        visibilityTouchesShares = true;
        visibilityShareUsername = current.user.username;
      }
    }

    const incomingTemplateId =
      input.templateId ||
      (input.content && typeof input.content === "object" && !Array.isArray(input.content)
        ? ((input.content as Record<string, unknown>).templateId as string | undefined)
        : undefined);

    if (incomingTemplateId) {
      updateData.templateId = incomingTemplateId;
    }

    /*
     * A PORTFOLIO document's public page renders `content.templateId`, so a `templateId`-only
     * PATCH moves the content with the column (V-299). Read at the expected revision: the update
     * below is conditional on it, so a write in between still fails as a conflict.
     */
    if (input.templateId && !updateData.content) {
      const current = await prisma.document.findFirst({
        where: { id: documentId, userId, deletedAt: null, revision, type: "PORTFOLIO" },
        select: { content: true },
      });

      if (
        current?.content &&
        typeof current.content === "object" &&
        !Array.isArray(current.content)
      )
        updateData.content = current.content as Prisma.InputJsonValue;
    }

    if (
      updateData.content &&
      typeof updateData.content === "object" &&
      !Array.isArray(updateData.content) &&
      updateData.templateId
    ) {
      updateData.content = {
        ...(updateData.content as Record<string, unknown>),
        templateId: updateData.templateId,
      } as unknown as Prisma.InputJsonValue;
    }

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const doc = await tx.document.update({
          where: {
            id: documentId,
            userId,
            revision: revision,
            deletedAt: null,
            // Conditional (V-226): a "Make private" committed after the check above wins.
            ...(input.visibility && input.visibility !== "PRIVATE"
              ? { moderatedPrivateAt: null }
              : {}),
          },

          data: {
            ...updateData,
            revision: { increment: 1 },
            lastSyncedAt: new Date(),
          },

          // Not read back from Postgres either: the reply never carries them.
          omit: { content: true, metadata: true },
        });

        if (shareLinkSlugUpdate) {
          await tx.shareLink.update({
            where: { id: shareLinkSlugUpdate.id },
            data: { slug: shareLinkSlugUpdate.slug },
          });
        }

        return doc;
      });

      await bumpGeneration(
        ...documentCacheNamespaces(userId, documentId),
        ...(publicShareUsername ? [cacheNamespaces.publicShare(publicShareUsername)] : []),
        ...(shareLinkSlugUpdate ? [cacheNamespaces.shareList(userId)] : []),
        ...(visibilityTouchesShares
          ? [cacheNamespaces.sharedDocumentIds(userId), cacheNamespaces.shareList(userId)]
          : []),
        ...(visibilityShareUsername ? [cacheNamespaces.publicShare(visibilityShareUsername)] : []),
      );

      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        // A soft-deleted document is "not found" to a writer, whatever revision it carries.
        const current = await prisma.document.findFirst({
          where: { id: documentId, userId, deletedAt: null },
        });

        if (!current) throw new ApiError(404, "Document not found");

        if (input.visibility && input.visibility !== "PRIVATE" && current.moderatedPrivateAt)
          throw new ApiError(403, MODERATED_PRIVATE_MESSAGE);

        if (current.revision !== revision)
          throw new ApiError(
            409,
            `Revision mismatch. Client: ${revision}, Server: ${current.revision}`,
          );
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(409, "Document slug is already in use");
      }

      throw error;
    }
  }

  /**
   * Soft delete a document. Deleting one this user already soft-deleted is idempotent: the
   * stored row comes back with 200, because the studio deletes cloud-first and could otherwise
   * never drop its local copy after a lost response. An unknown or foreign id is 404.
   *
   * A PORTFOLIO document that is the live publication is unpublished in the same transaction.
   * `PortfolioService.unpublish` is not reused here: it is keyed by user rather than document,
   * opens its own transaction (so it could not be atomic with the soft delete), and pulling
   * portfolioService into this module would drag billing along with it. The three fields it
   * sets are written here instead, and its cache invalidation helpers are called after commit.
   */

  static async deleteDocument(userId: string, documentId: string) {
    const existing = await prisma.document.findFirst({
      where: { id: documentId, userId },
      select: {
        type: true,
        deletedAt: true,
        user: { select: { username: true } },
        shareLinks: { select: { slug: true } },
        portfolioPublication: {
          select: { id: true, subdomain: true, status: true, suspensionReason: true },
        },
      },
    });

    if (!existing) throw new ApiError(404, "Document not found");

    if (existing.deletedAt) {
      return prisma.document.findUniqueOrThrow({ where: { id: documentId } });
    }

    // Trashing a portfolio is the owner's unpublish, whatever state the publication is in: a
    // billing suspension included, or the settle step would bring a deleted site back on the free
    // tier. A moderator's takedown (any reason that is neither billing's nor the owner's) keeps
    // its own reason, and with it its lock.
    const publication = existing.type === "PORTFOLIO" ? existing.portfolioPublication : null;
    const livePublication = publication && !isModerationLocked(publication) ? publication : null;

    let document;
    try {
      document = await prisma.$transaction(async (tx) => {
        const row = await tx.document.update({
          where: { id: documentId, userId, deletedAt: null },
          data: {
            deletedAt: new Date(),
            ...(livePublication ? { visibility: "PRIVATE" as const } : {}),
          },
        });

        // Conditional (V-226): a takedown committed after the read above keeps its reason.
        if (livePublication) {
          await tx.portfolioPublication.updateMany({
            where: { id: livePublication.id, ...NOT_MODERATION_LOCKED },
            data: {
              status: "SUSPENDED",
              suspensionReason: "user_unpublished",
              suspendedAt: new Date(),
            },
          });
        }
        // Under a moderator's lock the trash is recorded as the owner's unpublish, so the lift
        // leaves the site offline (V-285). A no-op on a row with no lock.
        if (publication)
          await recordOwnerUnpublishUnderLock(tx, { id: publication.id, documentId });

        return row;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
        throw new ApiError(404, "Document not found");
      throw error;
    }

    await bumpGeneration(
      ...documentCacheNamespaces(userId, documentId),
      cacheNamespaces.sharedDocumentIds(userId),
      // The share list leaves out links on soft-deleted documents (V-030).
      cacheNamespaces.shareList(userId),
      ...(existing.user?.username && existing.shareLinks.length > 0
        ? [cacheNamespaces.publicShare(existing.user.username)]
        : []),
      // The master profile's share count leaves out links on deleted documents (V-306).
      ...(existing.shareLinks.length > 0 ? [cacheNamespaces.masterProfile(userId)] : []),
    );
    // The account read counts live documents (V-186) and their share links; create drops it too.
    await cacheDel(userProfileCacheKey(userId));

    if (livePublication) {
      await invalidatePublicPortfolioCaches([livePublication.subdomain]);
      void revalidatePublicPortfolios([livePublication.subdomain]);
    }

    return document;
  }
}
