import { Request, Response, NextFunction } from "express";

import { createErrorResponse } from "#lib/errors";

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
