import { z } from "zod";
import { DocumentType } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

import { requireAuthUser } from "#middleware/auth";

import { DocumentService } from "#services/documentService";

import { createSuccessResponse, handleValidationError, ApiError } from "#utils/errors";

import { documentCreateSchema, documentUpdateSchema } from "#validators/documentValidator";

const listQuerySchema = z.object({
  type: z.nativeEnum(DocumentType).optional(),
});

export class DocumentController {
  /**
   * List all documents for the authenticated user.
   * Supports filtering by document type (e.g., RESUME, COVER_LETTER).
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);

      const { type } = listQuerySchema.parse(req.query);

      const documents = await DocumentService.listDocuments(user.id, type);

      res.json(createSuccessResponse(documents, "Documents fetched successfully"));
    } catch (error) {
      if (error instanceof z.ZodError) return next(handleValidationError(error));
      next(error);
    }
  }

  /**
   * Get a specific document by its ID.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);

      const { id } = req.params;

      const document = await DocumentService.getDocument(user.id, id);

      if (!document) {
        throw new ApiError(404, "Document not found");
      }

      res.json(createSuccessResponse(document, "Document fetched successfully"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new document.
   * If initial content is empty, it attempts to seed from the user's MasterProfile.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);

      const data = documentCreateSchema.parse(req.body);

      const document = await DocumentService.createDocument(user.id, data);

      res.status(201).json(createSuccessResponse(document, "Document created successfully"));
    } catch (error) {
      if (error instanceof z.ZodError) return next(handleValidationError(error));
      next(error);
    }
  }

  /**
   * Update an existing document.
   * Includes optimistic concurrency control via a revision check.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);

      const { id } = req.params;
      const data = documentUpdateSchema.parse(req.body);

      const document = await DocumentService.updateDocument(user.id, id, data);

      res.json(createSuccessResponse(document, "Document updated successfully"));
    } catch (error) {
      if (error instanceof z.ZodError) return next(handleValidationError(error));

      if (error instanceof Error && error.message.includes("CONFLICTOR")) {
        return res.status(409).json({
          success: false,
          error: "Conflict",
          message: error.message,
        });
      }

      next(error);
    }
  }

  /**
   * Soft delete a document by setting a deletedAt timestamp.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);
      const { id } = req.params;

      await DocumentService.deleteDocument(user.id, id);

      res.json(createSuccessResponse(null, "Document deleted successfully"));
    } catch (error) {
      next(error);
    }
  }
}
