import { z } from "zod";
import { NextFunction, Request, Response } from "express";

import { requireAuthUser } from "#middleware/auth";

import { DocumentService } from "#services/documentService";

import { createSuccessResponse, handleValidationError, ApiError } from "#lib/errors";

import {
  documentCreateSchema,
  documentListQuerySchema,
  documentUpdateSchema,
} from "#validators/documentValidator";

export class DocumentController {
  /**
   * List the authenticated user's documents, one page at a time (20 by default).
   * Supports filtering by document type (e.g., RESUME, COVER_LETTER).
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);

      const { type, updatedSince, includeContent, limit, cursor } = documentListQuerySchema.parse(
        req.query,
      );

      // Every request is one keyset page (V-263), 20 by default (V-422). `data` is the page; the
      // sync cursor, tombstones, `nextCursor` (null on the last page) and `total` ride beside it.
      const page = await DocumentService.listDocumentPage(user.id, type, {
        updatedSince,
        includeContent,
        limit,
        cursor,
      });

      res.json({
        ...createSuccessResponse(page.documents, "Documents fetched successfully"),
        serverTime: page.serverTime.toISOString(),
        deleted: page.deleted,
        nextCursor: page.nextCursor,
        total: page.total,
      });
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

      const { document, created } = await DocumentService.createDocument(user.id, data);

      // Idempotent on the client's own id: an id this user already stored comes back 200 with
      // the stored row, so a retried or doubled sync adopts the server's revision.
      res
        .status(created ? 201 : 200)
        .json(
          createSuccessResponse(
            document,
            created ? "Document created successfully" : "Document already exists",
          ),
        );
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
