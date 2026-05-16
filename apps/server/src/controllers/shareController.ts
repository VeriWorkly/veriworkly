import { z } from "zod";
import { NextFunction, Request, Response } from "express";

import { PublicShareLink } from "#types/api";

import { requireAuthUser } from "#middleware/auth";

import { ShareService } from "#services/shareService";

import { cacheGet, cacheSet, cacheDel, cacheDelByPrefix } from "#utils/redis";
import { parseOffsetPagination, createOffsetPaginationMeta } from "#utils/pagination";
import { createSuccessResponse, handleValidationError, ApiError } from "#utils/errors";

/**
 * Validation schemas for sharing-related requests
 */

const shareLinkCreateSchema = z.object({
  documentId: z.string().min(1),
  snapshot: z.record(z.any()),
  password: z.string().min(1).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  noExpiry: z.boolean().optional(),
});

const shareLinkPasswordSchema = z.object({
  password: z.string().min(1),
});

export class ShareController {
  /**
   * Create a new share link for a document.
   * If a link already exists, it is replaced.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);

      const body = shareLinkCreateSchema.parse(req.body);
      const { documentId } = body;

      const { shareLink, oldToken } = await ShareService.createShareLink(user.id, documentId, body);

      await cacheDelByPrefix(`share:list:${user.id}:${documentId}:`);

      if (oldToken) {
        await cacheDel(`share:public:${oldToken}`);
      }

      res.status(201).json(createSuccessResponse(shareLink, "Share link created successfully"));
    } catch (error) {
      if (error instanceof z.ZodError) return next(handleValidationError(error));
      next(error);
    }
  }

  /**
   * List all share links associated with a specific document for the authenticated user.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);

      const { documentId } = req.params;
      const pagination = parseOffsetPagination(req.query, {
        defaultPageSize: 20,
        maxPageSize: 50,
      });

      const cacheKey = `share:list:${user.id}:${documentId}:${pagination.limit}:${pagination.offset}`;
      const cached = await cacheGet<unknown>(cacheKey);

      if (cached) {
        return res.json(createSuccessResponse(cached, "Share links fetched from cache"));
      }

      const { items, total } = await ShareService.listShareLinksPaginated(
        user.id,
        documentId,
        pagination,
      );

      const response = { items, ...createOffsetPaginationMeta(total, pagination) };

      await cacheSet(cacheKey, response, 1800);

      res.json(createSuccessResponse(response, "Share links fetched successfully"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke an existing share link.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async revoke(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);

      const { documentId, shareLinkId } = req.params;

      const token = await ShareService.revokeShareLink(user.id, documentId, shareLinkId);

      // Invalidate caches
      await cacheDelByPrefix(`share:list:${user.id}:${documentId}:`);
      await cacheDel(`share:public:${token}`);

      res.json(createSuccessResponse(null, "Share link revoked successfully"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Public Endpoint: Get share link content.
   * Requires a password if the link is password-protected.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async getPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;
      const cacheKey = `share:public:${token}`;

      let shareLink = await cacheGet<PublicShareLink>(cacheKey);

      if (!shareLink) {
        shareLink = await ShareService.getPublicShareLink(token);
        await cacheSet(cacheKey, shareLink, 3600);
      }

      if (!shareLink) throw new ApiError(404, "Link not found");

      // Check if password is required
      if (shareLink.passwordHash) {
        return res.json(
          createSuccessResponse(
            {
              passwordRequired: true,
              resumeTitle: shareLink.document.title,
              expiresAt: shareLink.expiresAt,
            },
            "Password required",
          ),
        );
      }

      // Record view in background
      ShareService.recordShareView(shareLink.id, req.ip, req.headers["user-agent"]).catch((err) =>
        console.error("View tracking failed:", err),
      );

      res.json(
        createSuccessResponse(
          {
            passwordRequired: false,
            resumeTitle: shareLink.document.title,
            expiresAt: shareLink.expiresAt,
            snapshot: shareLink.snapshot,
          },
          "Shared document fetched successfully",
        ),
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Public Endpoint: Verify password for a password-protected share link.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async verifyPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;
      const { password } = shareLinkPasswordSchema.parse(req.body);

      const shareLink = await ShareService.getPublicShareLink(token);

      if (shareLink.passwordHash) {
        const matches = await ShareService.verifyPassword(password, shareLink.passwordHash);
        if (!matches) throw new ApiError(401, "Invalid password");
      }

      // Record view in background
      ShareService.recordShareView(shareLink.id, req.ip, req.headers["user-agent"]).catch((err) =>
        console.error("View tracking failed:", err),
      );

      res.json(
        createSuccessResponse(
          {
            passwordRequired: false,
            resumeTitle: shareLink.document.title,
            expiresAt: shareLink.expiresAt,
            snapshot: shareLink.snapshot,
          },
          "Shared document unlocked successfully",
        ),
      );
    } catch (error) {
      if (error instanceof z.ZodError) return next(handleValidationError(error));
      next(error);
    }
  }
}
