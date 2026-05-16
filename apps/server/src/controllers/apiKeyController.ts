import { Request, Response, NextFunction } from "express";

import { requireAuthUser } from "#middleware/auth";

import { ApiKeyService } from "#services/apiKeyService";

import { logger } from "#utils/logger";
import { createSuccessResponse, createErrorResponse } from "#utils/errors";
import { parseOffsetPagination, createOffsetPaginationMeta } from "#utils/pagination";

const DEFAULT_ALLOWED_SCOPES = [
  "user:read",
  "user:write",
  "resume:read",
  "resume:write",
  "roadmap:read",
  "roadmap:write",
  "github:read",
  "github:write",
];

/**
 * Internal helper to parse and validate API key scopes.
 */

function parseScopes(value: unknown) {
  if (!value) return undefined;

  const rawScopes = Array.isArray(value) ? value : String(value).split(",");
  const scopes = rawScopes.map((scope) => String(scope).trim()).filter(Boolean);

  if (scopes.length === 0) return undefined;

  const invalidScopes = scopes.filter((scope) => !DEFAULT_ALLOWED_SCOPES.includes(scope));

  if (invalidScopes.length > 0) {
    throw new Error(`Unsupported API key scope(s): ${invalidScopes.join(", ")}`);
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
    throw new Error("rateLimit must be a positive integer");
  }

  return limit;
}

/**
 * Internal helper to parse and validate expiry dates.
 */

function parseExpiresAt(value: unknown) {
  if (!value) return undefined;

  const parsed = new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("expiresAt must be a valid ISO date string");
  }

  return parsed;
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
   * Generate a new API key for the user.
   */

  static async createKey(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = requireAuthUser(req).id;

      const { name, scopes, rateLimit, expiresAt } = req.body;

      if (!name) return res.status(400).json(createErrorResponse(400, "Key name is required"));

      const apiKey = await ApiKeyService.generateKey(userId, {
        name,
        scopes: parseScopes(scopes),
        rateLimit: parseRateLimit(rateLimit),
        expiresAt: parseExpiresAt(expiresAt),
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
      const { name, scopes, rateLimit, expiresAt } = req.body;

      const rotated = await ApiKeyService.rotateKey(userId, id, {
        name,
        scopes: parseScopes(scopes),
        rateLimit: parseRateLimit(rateLimit),
        expiresAt: parseExpiresAt(expiresAt),
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
   * Temporarily revoke (deactivate) an API key.
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
