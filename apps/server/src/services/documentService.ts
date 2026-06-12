import { DocumentType, Visibility, Prisma } from "@prisma/client";

import { ShareService } from "#services/shareService";

import { prisma } from "#utils/prisma";
import { logger } from "#utils/logger";
import { ApiError } from "#utils/errors";
import { buildUniqueSlugHelper } from "#utils/slugs";
import { cacheGet, cacheSet, cacheDel, cacheDelByPrefix } from "#utils/redis";

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
   * List all documents for a user, optionally filtered by type.
   * Results are cached for 30 minutes.
   */

  static async listDocuments(userId: string, type?: DocumentType) {
    const cacheKey = `documents:list:${userId}:${type || "all"}`;

    const cached = await cacheGet(cacheKey);

    if (cached) return cached;

    const documents = await prisma.document.findMany({
      where: {
        userId,
        type,
        deletedAt: null,
      },
      orderBy: { updatedAt: "desc" },
    });

    await cacheSet(cacheKey, documents, 1800);

    return documents;
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

    if (document) await cacheSet(cacheKey, document, 3600);

    return document;
  }

  /**
   * Create a new document.
   * If content is not provided, it attempts to seed from MasterProfile.
   */

  static async createDocument(userId: string, input: DocumentCreateInput) {
    let initialContent = input.content;

    // Auto-seed from MasterProfile if no content provided for Resume/Cover Letter
    if (!initialContent && (input.type === "RESUME" || input.type === "COVER_LETTER")) {
      const profile = await prisma.masterProfile.findUnique({
        where: { userId },
      });

      if (profile) {
        initialContent = profile.content as Prisma.InputJsonValue;
        logger.info(`Seeding ${input.type} from MasterProfile for user ${userId}`);
      }
    }

    const title = input.title || `Untitled ${input.type.toLowerCase().replace("_", " ")}`;
    const slug = await this.buildUniqueSlug(userId, input.slug || title);

    const document = await prisma.document.create({
      data: {
        slug,
        title,
        userId,
        id: input.id,
        type: input.type,
        tags: input.tags || [],
        lastSyncedAt: new Date(),
        content: initialContent || {},
        metadata: input.metadata || {},
        templateId: input.templateId || "modern",
        visibility: input.visibility || "PRIVATE",
      },
    });

    await cacheDel(`documents:list:${userId}:all`);
    await cacheDel(`documents:list:${userId}:${document.type}`);
    await cacheDel(`user:profile:v2:${userId}`);

    return document;
  }

  /**
   * Update a document with optimistic concurrency control (revision check)
   */

  static async updateDocument(userId: string, documentId: string, input: DocumentUpdateInput) {
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
      await cacheDel(`documents:list:${userId}:all`);
      await cacheDel(`documents:list:${userId}:${updated.type}`);

      await Promise.all([
        ...[...readableShareCacheKeys].map((cacheKey) => cacheDel(cacheKey)),
        ...(shareLinkSlugUpdate ? [cacheDelByPrefix(`share:list:${userId}:${documentId}:`)] : []),
      ]);

      return updated;
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
    await cacheDel(`documents:list:${userId}:all`);
    await cacheDel(`documents:list:${userId}:${document.type}`);
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
    await cacheDel(`documents:list:${userId}:all`);
    await cacheDel(`documents:list:${userId}:${document.type}`);
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
    await cacheDel(`documents:list:${userId}:all`);
    await cacheDel(`documents:list:${userId}:${document.type}`);
    await cacheDelByPrefix(`share:shared-document-ids:${userId}:`);
    await cacheDel(`user:profile:v2:${userId}`);

    if (docWithShares?.user?.username) {
      const username = docWithShares.user.username;

      for (const share of docWithShares.shareLinks) {
        await cacheDel(`share:public-readable:${username}:${share.slug}`);
      }
    }

    return document;
  }
}
