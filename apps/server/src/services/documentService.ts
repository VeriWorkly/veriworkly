import { DocumentType, Visibility, Prisma } from "@prisma/client";

import { prisma } from "#utils/prisma";
import { logger } from "#utils/logger";
import { cacheGet, cacheSet, cacheDel } from "#utils/redis";

export type DocumentCreateInput = {
  id?: string;
  type: DocumentType;
  title?: string;
  slug?: string;
  content?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  templateId?: string;
  visibility?: Visibility;
};

export type DocumentUpdateInput = {
  title?: string;
  slug?: string;
  content?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  templateId?: string;
  visibility?: Visibility;
  revision: number;
};

export class DocumentService {
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

    const document = await prisma.document.create({
      data: {
        id: input.id,
        userId,
        type: input.type,
        title: input.title || `Untitled ${input.type.toLowerCase().replace("_", " ")}`,
        slug: input.slug,
        content: initialContent || {},
        metadata: input.metadata || {},
        templateId: input.templateId || "modern",
        visibility: input.visibility || "PRIVATE",
      },
    });

    await cacheDel(`documents:list:${userId}:all`);
    await cacheDel(`documents:list:${userId}:${document.type}`);

    return document;
  }

  /**
   * Update a document with optimistic concurrency control (revision check)
   */

  static async updateDocument(userId: string, documentId: string, input: DocumentUpdateInput) {
    const { revision, ...data } = input;

    try {
      const updated = await prisma.document.update({
        where: {
          id: documentId,
          userId,
          revision: revision,
        },

        data: {
          ...data,
          revision: { increment: 1 },
          lastSyncedAt: new Date(),
        },
      });

      await cacheDel(`document:${userId}:${documentId}`);
      await cacheDel(`documents:list:${userId}:all`);
      await cacheDel(`documents:list:${userId}:${updated.type}`);

      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        const current = await prisma.document.findUnique({ where: { id: documentId } });

        if (!current) throw new Error("Document not found");

        if (current.revision !== revision) {
          throw new Error(
            `CONFLICTOR: Revision mismatch. Client: ${revision}, Server: ${current.revision}`,
          );
        }
      }

      throw error;
    }
  }

  /**
   * Soft delete a document
   */

  static async deleteDocument(userId: string, documentId: string) {
    const document = await prisma.document.update({
      where: { id: documentId, userId },
      data: { deletedAt: new Date() },
    });

    await cacheDel(`document:${userId}:${documentId}`);
    await cacheDel(`documents:list:${userId}:all`);
    await cacheDel(`documents:list:${userId}:${document.type}`);

    return document;
  }

  /**
   * Restore a soft-deleted document
   */

  static async restoreDocument(userId: string, documentId: string) {
    return prisma.document.update({
      where: { id: documentId, userId },
      data: { deletedAt: null },
    });
  }

  /**
   * Permanently delete a document
   */

  static async hardDeleteDocument(userId: string, documentId: string) {
    return prisma.document.delete({
      where: { id: documentId, userId },
    });
  }
}
