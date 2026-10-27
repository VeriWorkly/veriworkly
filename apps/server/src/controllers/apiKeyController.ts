import type { NextFunction, Request, Response } from "express";

import { requireAuthUser } from "#middleware/auth";

import { ApiKeyService, ALLOWED_SCOPES } from "#services/apiKeyService";

import { apiKeyCreateSchema, apiKeyRotateSchema } from "#validators/apiKeyValidator";

import { logger } from "#lib/logger";
import { ApiError, createSuccessResponse, createErrorResponse } from "#lib/errors";
import { parseOffsetPagination, createOffsetPaginationMeta } from "#utils/pagination";

/**
 * Internal helper to parse and validate API key scopes.
 */

function parseScopes(value: unknown) {
  if (!value) return undefined;

  const rawScopes = Array.isArray(value) ? value : String(value).split(",");
  const scopes = rawScopes.map((scope) => String(scope).trim()).filter(Boolean);

  if (scopes.length === 0) return undefined;

  const invalidScopes = scopes.filter((scope) => !ALLOWED_SCOPES.has(scope));

  if (invalidScopes.length > 0) {
    throw new ApiError(400, `Unsupported API key scope(s): ${invalidScopes.join(", ")}`);
  }

  return scopes;
}

/**
 * Internal helper to parse and validate rate limits.
 */

function parseRateLimit(value: unknown) {
  if (value == null || value === "") return undefined;

  const limit = Number(value);

  if (!Number.isInteger(limit) || limit < 1) {
    throw new ApiError(400, "rateLimit must be a positive integer");
  }

  return limit;
}

export class ApiKeyController {
  /**
   * List all API keys for the authenticated user.
   */

  static async listKeys(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = requireAuthUser(req).id;

      const pagination = parseOffsetPagination(req.query, {
        defaultPageSize: 20,
        maxPageSize: 50,
      });

      const { items, total } = await ApiKeyService.listKeysPaginated(userId, pagination);

      const meta = createOffsetPaginationMeta(total, pagination);

      res
        .status(200)
        .json(createSuccessResponse({ items, ...meta }, "API keys fetched successfully"));
    } catch (error) {
      logger.error("Failed to list API keys:", error);
      next(error);
    }
  }

  /**
   * Get full details for a single API key.
   */
  static async getKey(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = requireAuthUser(req).id;
      const { id } = req.params;

      const apiKey = await ApiKeyService.getKey(userId, id);

      if (!apiKey) {
        return res.status(404).json(createErrorResponse(404, "API key not found"));
      }

      res.status(200).json(createSuccessResponse(apiKey, "API key fetched successfully"));
    } catch (error) {
      logger.error("Failed to get API key:", error);
      next(error);
    }
  }

  /**
   * Generate a new API key for the user.
   */

  static async createKey(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = requireAuthUser(req).id;

      const { name, expiresAt } = apiKeyCreateSchema.parse(req.body ?? {});
      const { scopes, rateLimit } = req.body ?? {};

      const apiKey = await ApiKeyService.generateKey(userId, {
        name,
        scopes: parseScopes(scopes),
        rateLimit: parseRateLimit(rateLimit),
        expiresAt,
      });

      res
        .status(201)
        .json(
          createSuccessResponse(
            apiKey,
            "API key generated successfully. Please save it as it won't be shown again.",
          ),
        );
    } catch (error) {
      logger.error("Failed to create API key:", error);
      next(error);
    }
  }

  /**
   * Rotate an existing API key, generating a new token while preserving settings.
   */

  static async rotateKey(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = requireAuthUser(req).id;

      const { id } = req.params;
      const { name, expiresAt } = apiKeyRotateSchema.parse(req.body ?? {});
      const { scopes, rateLimit } = req.body ?? {};

      // Service answers 409 (ApiError) for a key that is revoked, already rotated or expired;
      // null only when no key with this id belongs to the user.
      const rotated = await ApiKeyService.rotateKey(userId, id, {
        name,
        scopes: parseScopes(scopes),
        rateLimit: parseRateLimit(rateLimit),
        expiresAt,
      });

      if (!rotated) return res.status(404).json(createErrorResponse(404, "API key not found"));

      res
        .status(201)
        .json(
          createSuccessResponse(
            rotated,
            "API key rotated successfully. Please save the new key immediately.",
          ),
        );
    } catch (error) {
      logger.error("Failed to rotate API key:", error);
      next(error);
    }
  }

  /**
   * Revoke an API key. Revocation is permanent: a revoked key never authenticates again, and
   * the user creates (or rotates to) a new one instead.
   */

  static async revokeKey(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = requireAuthUser(req).id;

      const { id } = req.params;

      const revokedCount = await ApiKeyService.revokeKey(userId, id);

      if (revokedCount === 0)
        return res.status(404).json(createErrorResponse(404, "API key not found"));

      res.status(200).json(createSuccessResponse(null, "API key revoked successfully"));
    } catch (error) {
      logger.error("Failed to revoke API key:", error);
      next(error);
    }
  }

  /**
   * Permanently delete an API key.
   */

  static async deleteKey(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = requireAuthUser(req).id;

      const { id } = req.params;

      const deletedCount = await ApiKeyService.deleteKey(userId, id);

      if (deletedCount === 0)
        return res.status(404).json(createErrorResponse(404, "API key not found"));

      res.status(200).json(createSuccessResponse(null, "API key deleted successfully"));
    } catch (error) {
      logger.error("Failed to delete API key:", error);
      next(error);
    }
  }
}
