import type { NextFunction, Request, Response } from "express";

import { z } from "zod";

import { PublicShareLink } from "#types/api";

import { getSessionUserFromRequest, requireAuthUser } from "#middleware/auth";
import { incrementFixedWindow } from "#middleware/rateLimit";

import { ShareService } from "#services/shareService";

import { logger } from "#lib/logger";
import { addressBucket, getRequestIpDetails, getRequestUserAgent } from "#utils/requestIp";
import { cacheGet, cacheSet, cacheDel } from "#lib/redis";
import { bumpGeneration, resolveGenerationalKey } from "#lib/cacheGeneration";
import { cacheNamespaces, userProfileCacheKey } from "#lib/cacheKeys";
import { parseOffsetPagination, createOffsetPaginationMeta } from "#utils/pagination";
import { createSuccessResponse, handleValidationError, ApiError } from "#lib/errors";

import {
  publicReadableParamsSchema,
  sharedDocumentIdsQuerySchema,
  shareLinkCreateSchema,
  shareLinkPasswordSchema,
} from "#validators/shareValidator";

/** Password attempts per (share link, client network) per window; a correct password resets it. */
const SHARE_VERIFY_MAX_ATTEMPTS = 5;
const SHARE_VERIFY_WINDOW_SECONDS = 5 * 60;

type PublicShareLinkView = Omit<PublicShareLink, "passwordHash"> & { hasPassword: boolean };

/** Cached in place of a share that does not exist, so repeated misses skip Postgres. */
const MISSING_SHARE = { missing: true } as const;
const MISSING_SHARE_TTL_SECONDS = 60;
/**
 * How long a public share snapshot is cached. Short on purpose (V-370): a revoke, password change or
 * "Make private" bumps the cache generation, and if Redis loses that bump the stale copy is
 * served for at most this long.
 */
const PUBLIC_SHARE_TTL_SECONDS = 300;

/**
 * Strips the scrypt password hash before this record is cached. Nothing downstream of the
 * public-readable cache needs the actual hash — only whether one is set — and the hash has no
 * reason to sit in Redis for up to an hour if it never needs to leave the DB layer.
 */
function toPublicShareLinkView(shareLink: PublicShareLink): PublicShareLinkView {
  const { passwordHash, ...rest } = shareLink;
  return { ...rest, hasPassword: Boolean(passwordHash) };
}

/**
 * Before a protected link's password is verified the response carries only what the password
 * screen needs (V-150): no title, which can name the person or the job they are applying for.
 */
function buildPublicSharePayload(shareLink: PublicShareLinkView, includeSnapshot: boolean) {
  if (!includeSnapshot && shareLink.hasPassword)
    return { passwordRequired: true, expiresAt: shareLink.expiresAt };

  return {
    passwordRequired: false,
    resumeTitle: shareLink.document.title,
    documentTitle: shareLink.document.title,
    expiresAt: shareLink.expiresAt,
    // V-421: whether the studio shows the Download button. A display preference, not access
    // control. A copy cached before the column existed has no value, and links default to true.
    allowDownload: shareLink.allowDownload ?? true,
    ...(includeSnapshot ? { snapshot: shareLink.snapshot } : {}),
  };
}

/**
 * A share link as its owner sees it. Never the password hash, and never the snapshot (V-246): the
 * owner sent it and the studio never reads it back, and up to 1 MB of it per link was echoed in
 * the create response and carried in the list cached for 30 minutes.
 */
function formatShareLinkResponse<T extends { passwordHash?: string | null; snapshot?: unknown }>(
  shareLink: T | null,
) {
  if (!shareLink) return shareLink;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, snapshot, ...rest } = shareLink;

  return {
    ...rest,
    hasPassword: Boolean(passwordHash),
  };
}

/**
 * Counts one view, as the viewer (V-245): the resolved client IP (the forwarded one when a trusted
 * server render asks on the browser's behalf) and the browser's user agent. `req.ip` and the raw
 * header made every studio page load the studio server's view, with one IP hash for all of them.
 * The owner's own visit (the share modal's "Open link") is not a view (S-397): the studio render
 * forwards their session cookie, so it is looked up here, after the response.
 */
function recordView(req: Request, shareLink: { id: string; userId?: string }) {
  const record = async () => {
    if (shareLink.userId && (await isOwnerVisit(req, shareLink.userId))) return;

    await ShareService.recordShareView(
      shareLink.id,
      getRequestIpDetails(req).resolvedIp || undefined,
      getRequestUserAgent(req),
    );
  };

  record().catch((error) =>
    logger.warn("Share view tracking failed", {
      error: error instanceof Error ? error.message : String(error),
    }),
  );
}

/**
 * Whether the request carries the link owner's session. The lookup only filters the count: when
 * the session store is down the visit is counted as a reader's rather than dropped (S-397).
 */
async function isOwnerVisit(req: Request, ownerId: string) {
  try {
    return (await getSessionUserFromRequest(req))?.id === ownerId;
  } catch (error) {
    logger.debug("Share view owner check unavailable; counting the view", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/** The largest share snapshot, serialized: the same 1 MB bound a master profile has. */
const MAX_SHARE_SNAPSHOT_BYTES = 1_000_000;

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

      // The snapshot is cached per public read for an hour; bounded like a document body (V-246).
      if (Buffer.byteLength(JSON.stringify(body.snapshot)) > MAX_SHARE_SNAPSHOT_BYTES)
        throw new ApiError(413, "The shared document is too large. Shorten it and share again.");

      const { shareLink } = await ShareService.createShareLink(user.id, documentId, body);

      // One bump covers the old slug, the new one and any cached 404 for it.
      await Promise.all([
        bumpGeneration(
          cacheNamespaces.shareList(user.id),
          cacheNamespaces.sharedDocumentIds(user.id),
          cacheNamespaces.publicShare(shareLink.username),
        ),
        bumpGeneration(cacheNamespaces.masterProfile(user.id)),
        cacheDel(userProfileCacheKey(user.id)),
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

      const cacheKey = await resolveGenerationalKey(
        cacheNamespaces.shareList(user.id),
        documentId,
        String(pagination.limit),
        String(pagination.offset),
      );

      const cached = cacheKey ? await cacheGet<unknown>(cacheKey) : null;

      if (cached) return res.json(createSuccessResponse(cached, "Share links fetched from cache"));

      const { items, total } = await ShareService.listShareLinksPaginated(
        user.id,
        documentId,
        pagination,
      );

      const formattedItems = items.map(formatShareLinkResponse);
      const response = { items: formattedItems, ...createOffsetPaginationMeta(total, pagination) };

      if (cacheKey) await cacheSet(cacheKey, response, 1800);

      res.json(createSuccessResponse(response, "Share links fetched successfully"));
    } catch (error) {
      next(error);
    }
  }

  static async listSharedDocumentIds(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);
      const { ids } = sharedDocumentIdsQuerySchema.parse(req.query);
      const cacheKey = await resolveGenerationalKey(
        cacheNamespaces.sharedDocumentIds(user.id),
        ids.sort().join(","),
      );

      const cached = cacheKey ? await cacheGet<unknown>(cacheKey) : null;

      if (cached)
        return res.json(createSuccessResponse(cached, "Shared document ids fetched from cache"));

      const documentIds = await ShareService.listSharedDocumentIds(user.id, ids);
      const response = { documentIds };

      if (cacheKey) await cacheSet(cacheKey, response, 300);

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
        bumpGeneration(
          cacheNamespaces.shareList(user.id),
          cacheNamespaces.sharedDocumentIds(user.id),
          cacheNamespaces.publicShare(revoked.username),
        ),
        bumpGeneration(cacheNamespaces.masterProfile(user.id)),
        cacheDel(userProfileCacheKey(user.id)),
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
      // Generation read before the DB load (V-122): a revoke or password change that lands
      // mid-read bumps it, so this reader's stale snapshot is written under a dead key.
      const cacheKey = await resolveGenerationalKey(cacheNamespaces.publicShare(username), slug);
      const cached = cacheKey
        ? await cacheGet<PublicShareLinkView | typeof MISSING_SHARE>(cacheKey)
        : null;

      if (cached && "missing" in cached) throw new ApiError(404, "Link not found");

      let shareLink = cached;

      if (!shareLink) {
        let fresh: Awaited<ReturnType<typeof ShareService.getPublicShareLinkByUsernameAndSlug>>;

        try {
          fresh = await ShareService.getPublicShareLinkByUsernameAndSlug(username, slug);
        } catch (error) {
          // Negative cache; share create bumps this generation, so a new link is readable at once.
          if (cacheKey && error instanceof ApiError && error.statusCode === 404)
            await cacheSet(cacheKey, MISSING_SHARE, MISSING_SHARE_TTL_SECONDS);
          throw error;
        }

        shareLink = toPublicShareLinkView(fresh);
        let ttl = PUBLIC_SHARE_TTL_SECONDS;

        if (shareLink.expiresAt) {
          const msLeft = new Date(shareLink.expiresAt).getTime() - Date.now();

          if (msLeft > 0) {
            ttl = Math.min(PUBLIC_SHARE_TTL_SECONDS, Math.ceil(msLeft / 1000));
          } else {
            ttl = 0;
          }
        }

        if (ttl > 0 && cacheKey) await cacheSet(cacheKey, shareLink, ttl);
      }

      if (!shareLink) throw new ApiError(404, "Link not found");

      if (ShareService.isExpired(shareLink.expiresAt)) throw new ApiError(410, "Link expired");

      if (shareLink.hasPassword)
        return res.json(
          createSuccessResponse(buildPublicSharePayload(shareLink, false), "Password required"),
        );

      recordView(req, shareLink);

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
        // Keyed on the link, not the request path: every spelling that resolves to this link
        // (case, trailing slash, `slug-`/`-slug`) draws on one budget per client network.
        const ip = getRequestIpDetails(req).resolvedIp;
        const attemptsKey = `share:verify-attempts:${shareLink.id}:${ip ? addressBucket(ip) : "unknown"}`;

        let attempt: { count: number; ttlSeconds: number };
        try {
          attempt = await incrementFixedWindow(attemptsKey, SHARE_VERIFY_WINDOW_SECONDS);
        } catch (error) {
          // Fail closed: without the counter nothing bounds guessing across path spellings.
          logger.warn("Share verify attempt counter unavailable; refusing verification", {
            error: error instanceof Error ? error.message : String(error),
          });
          res.set("Retry-After", "30");
          throw new ApiError(503, "Password verification is temporarily unavailable");
        }

        if (attempt.count > SHARE_VERIFY_MAX_ATTEMPTS) {
          res.set("Retry-After", String(attempt.ttlSeconds));
          throw new ApiError(429, "Too many password attempts. Please try again later.");
        }

        const matches = await ShareService.verifyPassword(password, shareLink.passwordHash);
        // 403, not 401: the studio treats every 401 as an expired session and signs out (V-128).
        if (!matches) throw new ApiError(403, "Invalid password");

        await cacheDel(attemptsKey);
      }

      recordView(req, shareLink);

      res.json(
        createSuccessResponse(
          buildPublicSharePayload(toPublicShareLinkView(shareLink), true),
          "Shared document unlocked successfully",
        ),
      );
    } catch (error) {
      if (error instanceof z.ZodError) return next(handleValidationError(error));
      next(error);
    }
  }
}
