import { z } from "zod";
import { NextFunction, Request, Response } from "express";

import { requireAuthUser } from "#middleware/auth";

import { DocumentService } from "#services/documentService";

import { createSuccessResponse, handleValidationError, ApiError } from "#lib/errors";

import {
  DOCUMENT_PAGE_DEFAULT_LIMIT,
  documentCreateSchema,
  documentListQuerySchema,
  documentUpdateSchema,
} from "#validators/documentValidator";

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

      const { type, updatedSince, includeContent, limit, cursor } = documentListQuerySchema.parse(
        req.query,
      );

      // Keyset paging (V-263) once the caller sends `limit` or `cursor`. The response adds
      // `nextCursor` (null on the last page) and `total` beside the unchanged fields.
      if (limit !== undefined || cursor !== undefined) {
        const page = await DocumentService.listDocumentPage(user.id, type, {
          updatedSince,
          includeContent,
          limit: limit ?? DOCUMENT_PAGE_DEFAULT_LIMIT,
          cursor,
        });

        res.json({
          ...createSuccessResponse(page.documents, "Documents fetched successfully"),
          serverTime: page.serverTime.toISOString(),
          deleted: page.deleted,
          nextCursor: page.nextCursor,
          total: page.total,
        });
        return;
      }

      // LEGACY (V-263): no `limit` and no `cursor` keeps the old single response (up to 500) for
      // studios that predate paging. Deploy the server after the studio; a later change makes
      // `limit` default to 20 and drops this branch.
      const { documents, deleted, serverTime } = await DocumentService.listDocuments(
        user.id,
        type,
        { updatedSince, includeContent },
      );

      // `data` keeps its shape (the list); the sync cursor and tombstones ride beside it.
      res.json({
        ...createSuccessResponse(documents, "Documents fetched successfully"),
        serverTime: serverTime.toISOString(),
        deleted,
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
