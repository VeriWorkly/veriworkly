import { Request, Response, NextFunction } from "express";

import { createErrorResponse } from "#lib/errors";

/**
 * Blocks API-key authentication outright, so a route is reachable only by a logged-in
 * session from one of our own front-ends.
 *
 * Use this for irreversible, whole-account actions. Scopes are too coarse to protect
 * them: `user:write` is the scope a key needs to rename an account, and without this
 * guard the same key could permanently destroy every document, portfolio, credit, and
 * payout record the user has. A long-lived integration token should never be one call
 * away from that, and a user who pasted a key into a third-party tool has not consented
 * to it.
 *
 * Deletion stays available to the account owner through the UI, which authenticates
 * with a session cookie and confirms intent explicitly.
 */
export function denyApiKeyAuth(req: Request, res: Response, next: NextFunction) {
  if (req.apiKey) {
    return res
      .status(403)
      .json(
        createErrorResponse(
          403,
          "This action cannot be performed with an API key. Sign in and delete your account from Settings.",
        ),
      );
  }

  return next();
}

export function requireApiKeyScopes(...requiredScopes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return next();
    }

    if (requiredScopes.length === 0) {
      return next();
    }

    const keyScopes = new Set(req.apiKey.scopes || []);
    const hasAllScopes = requiredScopes.every((scope) => keyScopes.has(scope));

    if (!hasAllScopes) {
      return res
        .status(403)
        .json(createErrorResponse(403, "This API key does not have permission for this action."));
    }

    return next();
  };
}
