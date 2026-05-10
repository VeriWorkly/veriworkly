import { z } from "zod";
import { DocumentType } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

import { requireAuthUser } from "#middleware/auth";

import { DocumentService } from "#services/documentService";

import { documentCreateSchema, documentUpdateSchema } from "#validators/documentValidator";

import { cacheDel, cacheGet, cacheSet } from "#utils/redis";
import { createSuccessResponse, handleValidationError, ApiError } from "#utils/errors";

const listQuerySchema = z.object({
  type: z.nativeEnum(DocumentType).optional(),
});

export class DocumentController {
  /**
   * List all documents for the authenticated user.
   * Supports filtering by document type (e.g., RESUME, COVER_LETTER).
   * Leverages Redis caching for optimized list retrieval.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);

      const { type } = listQuerySchema.parse(req.query);

      const cacheKey = `documents:list:${user.id}:${type || "all"}`;

      // Check cache first
      const cached = await cacheGet(cacheKey);

      if (cached) {
        return res.json(createSuccessResponse(cached, "Documents fetched from cache"));
      }

      // Fetch from service
      const documents = await DocumentService.listDocuments(user.id, type);

      // Cache the list for 30 minutes
      await cacheSet(cacheKey, documents, 1800);

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

      const cacheKey = `document:${user.id}:${id}`;

      // Check cache first
      const cached = await cacheGet(cacheKey);
      if (cached) {
        return res.json(createSuccessResponse(cached, "Document fetched from cache"));
      }

      // Fetch from service
      const document = await DocumentService.getDocument(user.id, id);
      if (!document) {
        throw new ApiError(404, "Document not found");
      }

      // Cache the individual document for 1 hour
      await cacheSet(cacheKey, document, 3600);

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

      // Invalidate relevant list caches
      await cacheDel(`documents:list:${user.id}:all`);
      await cacheDel(`documents:list:${user.id}:${document.type}`);

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

      // Invalidate the document-specific cache and related list caches
      await cacheDel(`document:${user.id}:${id}`);
      await cacheDel(`documents:list:${user.id}:all`);
      await cacheDel(`documents:list:${user.id}:${document.type}`);

      res.json(createSuccessResponse(document, "Document updated successfully"));
    } catch (error) {
      if (error instanceof z.ZodError) return next(handleValidationError(error));

      // Specialized handling for optimistic concurrency conflicts
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

      const document = await DocumentService.deleteDocument(user.id, id);

      // Invalidate all associated caches
      await cacheDel(`document:${user.id}:${id}`);
      await cacheDel(`documents:list:${user.id}:all`);
      await cacheDel(`documents:list:${user.id}:${document.type}`);

      res.json(createSuccessResponse(null, "Document deleted successfully"));
    } catch (error) {
      next(error);
    }
  }
}
