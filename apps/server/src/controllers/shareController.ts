import type { NextFunction, Request, Response } from "express";

import { z } from "zod";

import { PublicShareLink } from "#types/api";

import { requireAuthUser } from "#middleware/auth";

import { ShareService } from "#services/shareService";

import { normalizeSlug, normalizeUsername } from "#utils/slugs";
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
  updateSlug: z.boolean().optional(),
  removePassword: z.boolean().optional(),
});

const shareLinkPasswordSchema = z.object({
  password: z.string().min(1),
});

const sharedDocumentIdsQuerySchema = z.object({
  ids: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
});

const publicReadableParamsSchema = z.object({
  username: z.string().transform((value) => normalizeUsername(value)),
  slug: z.string().transform((value) => normalizeSlug(value)),
});

function buildPublicSharePayload(shareLink: PublicShareLink, includeSnapshot: boolean) {
  return {
    passwordRequired: !includeSnapshot && Boolean(shareLink.passwordHash),
    resumeTitle: shareLink.document.title,
    documentTitle: shareLink.document.title,
    expiresAt: shareLink.expiresAt,
    ...(includeSnapshot ? { snapshot: shareLink.snapshot } : {}),
  };
}

function formatShareLinkResponse<T extends { passwordHash?: string | null }>(shareLink: T | null) {
  if (!shareLink) return shareLink;

  const { passwordHash, ...rest } = shareLink;

  return {
    ...rest,
    hasPassword: Boolean(passwordHash),
  };
}

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

      const { shareLink, previousSlug } = await ShareService.createShareLink(
        user.id,
        documentId,
        body,
      );

      await Promise.all([
        cacheDelByPrefix(`share:list:${user.id}:${documentId}:`),
        cacheDelByPrefix(`share:shared-document-ids:${user.id}:`),
        cacheDel(`profile:${user.id}`),
        cacheDel(`user:profile:v2:${user.id}`),
        ...(previousSlug
          ? [cacheDel(`share:public-readable:${shareLink.username}:${previousSlug}`)]
          : []),
        cacheDel(`share:public-readable:${shareLink.username}:${shareLink.documentSlug}`),
        cacheDel(`share:public-readable:${shareLink.username}:${shareLink.slug}`),
      ]);

      res
        .status(201)
        .json(
          createSuccessResponse(
            formatShareLinkResponse(shareLink),
            "Share link created successfully",
          ),
        );
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

      if (cached) return res.json(createSuccessResponse(cached, "Share links fetched from cache"));

      const { items, total } = await ShareService.listShareLinksPaginated(
        user.id,
        documentId,
        pagination,
      );

      const formattedItems = items.map(formatShareLinkResponse);
      const response = { items: formattedItems, ...createOffsetPaginationMeta(total, pagination) };

      await cacheSet(cacheKey, response, 1800);

      res.json(createSuccessResponse(response, "Share links fetched successfully"));
    } catch (error) {
      next(error);
    }
  }

  static async listSharedDocumentIds(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);
      const { ids } = sharedDocumentIdsQuerySchema.parse(req.query);
      const cacheKey = `share:shared-document-ids:${user.id}:${ids.sort().join(",")}`;

      const cached = await cacheGet<unknown>(cacheKey);

      if (cached)
        return res.json(createSuccessResponse(cached, "Shared document ids fetched from cache"));

      const documentIds = await ShareService.listSharedDocumentIds(user.id, ids);
      const response = { documentIds };

      await cacheSet(cacheKey, response, 300);

      res.json(createSuccessResponse(response, "Shared document ids fetched successfully"));
    } catch (error) {
      if (error instanceof z.ZodError) return next(handleValidationError(error));
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

      const revoked = await ShareService.revokeShareLink(user.id, documentId, shareLinkId);

      // Invalidate caches
      await Promise.all([
        cacheDelByPrefix(`share:list:${user.id}:${documentId}:`),
        cacheDelByPrefix(`share:shared-document-ids:${user.id}:`),
        cacheDel(`profile:${user.id}`),
        cacheDel(`user:profile:v2:${user.id}`),
        cacheDel(`share:public-readable:${revoked.username}:${revoked.slug}`),
      ]);

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

  static async getPublicReadable(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, slug } = publicReadableParamsSchema.parse(req.params);
      const cacheKey = `share:public-readable:${username}:${slug}`;

      let shareLink = await cacheGet<PublicShareLink>(cacheKey);

      if (!shareLink) {
        shareLink = await ShareService.getPublicShareLinkByUsernameAndSlug(username, slug);
        let ttl = 3600;

        if (shareLink.expiresAt) {
          const msLeft = new Date(shareLink.expiresAt).getTime() - Date.now();

          if (msLeft > 0) {
            ttl = Math.min(3600, Math.ceil(msLeft / 1000));
          } else {
            ttl = 0;
          }
        }

        if (ttl > 0) await cacheSet(cacheKey, shareLink, ttl);
      }

      if (!shareLink) throw new ApiError(404, "Link not found");

      if (ShareService.isExpired(shareLink.expiresAt)) throw new ApiError(410, "Link expired");

      if (shareLink.passwordHash)
        return res.json(
          createSuccessResponse(buildPublicSharePayload(shareLink, false), "Password required"),
        );

      ShareService.recordShareView(shareLink.id, req.ip, req.headers["user-agent"]).catch((err) =>
        console.error("View tracking failed:", err),
      );

      res.json(
        createSuccessResponse(
          buildPublicSharePayload(shareLink, true),
          "Shared document fetched successfully",
        ),
      );
    } catch (error) {
      if (error instanceof z.ZodError) return next(handleValidationError(error));

      next(error);
    }
  }

  static async verifyPublicReadable(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, slug } = publicReadableParamsSchema.parse(req.params);
      const { password } = shareLinkPasswordSchema.parse(req.body);

      const shareLink = await ShareService.getPublicShareLinkByUsernameAndSlug(username, slug);

      if (shareLink.passwordHash) {
        const matches = await ShareService.verifyPassword(password, shareLink.passwordHash);
        if (!matches) throw new ApiError(401, "Invalid password");
      }

      ShareService.recordShareView(shareLink.id, req.ip, req.headers["user-agent"]).catch((err) =>
        console.error("View tracking failed:", err),
      );

      res.json(
        createSuccessResponse(
          buildPublicSharePayload(shareLink, true),
          "Shared document unlocked successfully",
        ),
      );
    } catch (error) {
      if (error instanceof z.ZodError) return next(handleValidationError(error));
      next(error);
    }
  }
}
