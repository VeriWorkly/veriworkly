import { randomUUID } from "node:crypto";

import { DocumentType, Visibility, Prisma } from "@prisma/client";
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
import { buildUniqueSlugHelper } from "#utils/slugs";
import { cacheGet, cacheSet, cacheDel, cacheDelByPrefix } from "#lib/redis";
import { documentListCachePrefix, userProfileCacheKey } from "#lib/cacheKeys";

import { EntitlementService } from "#services/entitlementService";

const MAX_DOCUMENTS_PER_LIST = 500;

export type DocumentCreateInput = {
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

export type DocumentUpdateInput = {
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

export class DocumentService {
  private static async buildUniqueSlug(userId: string, title: string, documentId?: string) {
    return buildUniqueSlugHelper(title, async (candidate) => {
      const existing = await prisma.document.findFirst({
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
   * shipping it for every document made a 50-resume list a ~600KB response that was then
   * held in Redis for 30 minutes. Full bodies come from `getDocument` instead.
   *
   * `updatedSince` lets the client pull only what changed since its last hydrate. It is
   * part of the cache key: omitting it would let a narrow incremental response be served
   * as if it were the full list.
   */

  static async listDocuments(
    userId: string,
    type?: DocumentType,
    options?: { updatedSince?: Date; includeContent?: boolean },
  ) {
    const includeContent = options?.includeContent ?? false;
    const sinceKey = options?.updatedSince ? options.updatedSince.toISOString() : "all";
    const cacheKey = `documents:list:${userId}:${type || "all"}:${sinceKey}:${
      includeContent ? "full" : "meta"
    }`;

    const cached = await cacheGet(cacheKey);

    if (cached) return cached;

    const documents = await prisma.document.findMany({
      where: {
        userId,
        type,
        deletedAt: null,
        ...(options?.updatedSince ? { updatedAt: { gt: options.updatedSince } } : {}),
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
      // Bounded because the full result is serialized into a single Redis value for 30 minutes;
      // an account with hundreds of documents would otherwise produce a multi-megabyte cache
      // entry and response body.
      take: MAX_DOCUMENTS_PER_LIST,
    });

    // Migrated before the value is cached, so a cache hit serves the same shape a miss does.
    const migrated = includeContent
      ? documents.map((document) => withMigratedContent(document))
      : documents;

    await cacheSet(cacheKey, migrated, 1800);

    return migrated;
  }

  /**
   * Get a single document by ID.
   * Results are cached for 1 hour.
   */

  static async getDocument(userId: string, documentId: string) {
    const cacheKey = `document:${userId}:${documentId}`;
    const cached = await cacheGet(cacheKey);

    if (cached) return cached;

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
        deletedAt: null,
      },
    });

    const migrated = withMigratedContent(document);

    if (migrated) await cacheSet(cacheKey, migrated, 3600);

    return migrated;
  }

  /**
   * Create a new document.
   * If content is not provided, it attempts to seed from MasterProfile.
   */

  static async createDocument(userId: string, input: DocumentCreateInput) {
    // Enforce 1 active document per type limit for free users
    const isPaid =
      (await EntitlementService.has(userId, "ai_credits")) ||
      (await EntitlementService.has(userId, "portfolio_publish"));

    if (!isPaid) {
      const activeCount = await prisma.document.count({
        where: {
          userId,
          type: input.type,
          deletedAt: null,
        },
      });

      if (activeCount >= 1) {
        throw new ApiError(
          403,
          `Free users can only have 1 active ${input.type.toLowerCase().replace("_", " ")} at a time. Upgrade to Creator Pro for unlimited documents.`,
        );
      }
    }

    /*
     * Resolved before the row is written because a seeded body carries the document's own
     * id, and prisma's `@default(cuid())` only produces one after the insert. The studio
     * always sends both an id and a content body, so this generator is only ever reached by
     * API-key callers who asked the server to seed for them.
     */
    const documentId = input.id ?? randomUUID();

    let initialContent = input.content;

    /*
     * The template the seeded body ended up with, so the row's `templateId` column can agree
     * with it. The client reads the column in preference to the body, so leaving the column
     * at its "modern" default would silently override the template the profile chose.
     */
    let seededTemplateId: string | undefined;

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

        if (input.type === "RESUME") {
          const resume = projectToResume(master, {
            resumeId: documentId,
            templateId: input.templateId,
            title: input.title,
          });

          seededTemplateId = resume.templateId;
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

    if (input.id) {
      const existing = await prisma.document.findUnique({
        where: { id: input.id },
      });

      if (existing) {
        if (existing.userId !== userId) throw new ApiError(400, "Document ID already in use");

        logger.info(`Document ${input.id} already exists for user ${userId}. Returning existing.`);

        return existing;
      }
    }

    const slug = await this.buildUniqueSlug(userId, input.slug || title);

    const resolvedTemplateId =
      input.templateId ||
      (initialContent && typeof initialContent === "object" && !Array.isArray(initialContent)
        ? ((initialContent as Record<string, unknown>).templateId as string | undefined)
        : undefined) ||
      seededTemplateId ||
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

    const document = await prisma.document.create({
      data: {
        slug,
        title,
        userId,
        id: documentId,
        type: input.type,
        tags: input.tags || [],
        lastSyncedAt: new Date(),
        content: initialContent || {},
        metadata: input.metadata || {},
        templateId: resolvedTemplateId,
        visibility: input.visibility || "PRIVATE",
      },
    });

    await cacheDelByPrefix(documentListCachePrefix(userId));
    await cacheDel(userProfileCacheKey(userId));

    return withMigratedContent(document)!;
  }

  /**
   * Update a document with optimistic concurrency control (revision check)
   */

  static async updateDocument(userId: string, documentId: string, input: DocumentUpdateInput) {
    assertDocumentPayloadSize(input.content);
    assertDocumentPayloadSize(input.metadata);

    const { revision, updateShareSlug, ...data } = input;
    const updateData = { ...data };

    const readableShareCacheKeys = new Set<string>();

    let shareLinkSlugUpdate: {
      id: string;
      slug: string;
    } | null = null;

    const shouldUpdateDocumentSlug = Boolean(input.slug || input.title);

    if (shouldUpdateDocumentSlug) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });

      const nextSlugSource = input.slug || input.title;

      if (nextSlugSource)
        updateData.slug = await this.buildUniqueSlug(userId, nextSlugSource, documentId);

      if (user?.username && updateData.slug && updateShareSlug) {
        const shareLink = await prisma.shareLink.findUnique({
          where: { userId_documentId: { userId, documentId } },
          select: { id: true, slug: true },
        });

        if (shareLink) {
          readableShareCacheKeys.add(`share:public-readable:${user.username}:${shareLink.slug}`);

          shareLinkSlugUpdate = {
            id: shareLink.id,
            slug: await ShareService.buildUniqueShareSlug(userId, updateData.slug, shareLink.id),
          };

          readableShareCacheKeys.add(
            `share:public-readable:${user.username}:${shareLinkSlugUpdate.slug}`,
          );
        }
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
          },

          data: {
            ...updateData,
            revision: { increment: 1 },
            lastSyncedAt: new Date(),
          },
        });

        if (shareLinkSlugUpdate) {
          await tx.shareLink.update({
            where: { id: shareLinkSlugUpdate.id },
            data: { slug: shareLinkSlugUpdate.slug },
          });
        }

        return doc;
      });

      await cacheDel(`document:${userId}:${documentId}`);
      await cacheDelByPrefix(documentListCachePrefix(userId));

      await Promise.all([
        ...[...readableShareCacheKeys].map((cacheKey) => cacheDel(cacheKey)),
        ...(shareLinkSlugUpdate ? [cacheDelByPrefix(`share:list:${userId}:${documentId}:`)] : []),
      ]);

      return withMigratedContent(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        const current = await prisma.document.findFirst({ where: { id: documentId, userId } });

        if (!current) throw new ApiError(404, "Document not found");

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
   * Soft delete a document
   */

  static async deleteDocument(userId: string, documentId: string) {
    const docWithShares = await prisma.document.findFirst({
      where: { id: documentId, userId },
      select: {
        user: { select: { username: true } },
        shareLinks: { select: { slug: true } },
      },
    });

    let document;
    try {
      document = await prisma.document.update({
        where: { id: documentId, userId },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
        throw new ApiError(404, "Document not found");
      throw error;
    }

    await cacheDel(`document:${userId}:${documentId}`);
    await cacheDelByPrefix(documentListCachePrefix(userId));
    await cacheDelByPrefix(`share:shared-document-ids:${userId}:`);

    if (docWithShares?.user?.username) {
      const username = docWithShares.user.username;

      for (const share of docWithShares.shareLinks) {
        await cacheDel(`share:public-readable:${username}:${share.slug}`);
      }
    }

    return document;
  }

  /**
   * Restore a soft-deleted document
   */

  static async restoreDocument(userId: string, documentId: string) {
    const docWithShares = await prisma.document.findFirst({
      where: { id: documentId, userId },
      select: {
        user: { select: { username: true } },
        shareLinks: { select: { slug: true } },
      },
    });

    let document;
    try {
      document = await prisma.document.update({
        where: { id: documentId, userId },
        data: { deletedAt: null },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
        throw new ApiError(404, "Document not found");
      throw error;
    }

    await cacheDel(`document:${userId}:${documentId}`);
    await cacheDelByPrefix(documentListCachePrefix(userId));
    await cacheDelByPrefix(`share:shared-document-ids:${userId}:`);

    if (docWithShares?.user?.username) {
      const username = docWithShares.user.username;

      for (const share of docWithShares.shareLinks) {
        await cacheDel(`share:public-readable:${username}:${share.slug}`);
      }
    }

    return document;
  }

  /**
   * Permanently delete a document
   */

  static async hardDeleteDocument(userId: string, documentId: string) {
    const docWithShares = await prisma.document.findFirst({
      where: { id: documentId, userId },
      select: {
        user: { select: { username: true } },
        shareLinks: { select: { slug: true } },
      },
    });

    let document;
    try {
      document = await prisma.document.delete({
        where: { id: documentId, userId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
        throw new ApiError(404, "Document not found");
      throw error;
    }

    await cacheDel(`document:${userId}:${documentId}`);
    await cacheDelByPrefix(documentListCachePrefix(userId));
    await cacheDelByPrefix(`share:shared-document-ids:${userId}:`);
    await cacheDel(userProfileCacheKey(userId));

    if (docWithShares?.user?.username) {
      const username = docWithShares.user.username;

      for (const share of docWithShares.shareLinks) {
        await cacheDel(`share:public-readable:${username}:${share.slug}`);
      }
    }

    return document;
  }
}
