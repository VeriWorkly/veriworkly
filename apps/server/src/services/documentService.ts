import { DocumentType, Visibility, Prisma } from "@prisma/client";

import { prisma } from "#utils/prisma";
import { logger } from "#utils/logger";

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
   * List all documents for a user, optionally filtered by type
   */

  static async listDocuments(userId: string, type?: DocumentType) {
    return prisma.document.findMany({
      where: {
        userId,
        type,
        deletedAt: null,
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  /**
   * Get a single document by ID
   */

  static async getDocument(userId: string, documentId: string) {
    return prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
        deletedAt: null,
      },
    });
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

    return prisma.document.create({
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
  }

  /**
   * Update a document with optimistic concurrency control (revision check)
   */

  static async updateDocument(userId: string, documentId: string, input: DocumentUpdateInput) {
    const { revision, ...data } = input;

    // We use a transaction or a specific where clause to ensure revision match
    try {
      const updated = await prisma.document.update({
        where: {
          id: documentId,
          userId,
          revision: revision, // Only update if revision matches
        },

        data: {
          ...data,
          revision: { increment: 1 }, // Auto-increment revision
          lastSyncedAt: new Date(),
        },
      });

      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        // Record not found or revision mismatch
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
    return prisma.document.update({
      where: { id: documentId, userId },
      data: { deletedAt: new Date() },
    });
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
