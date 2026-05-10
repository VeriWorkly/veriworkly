import { Request, Response, NextFunction } from "express";

import { config } from "#config";

import { createErrorResponse } from "#utils/errors";
import { getSessionUserFromRequest } from "#middleware/auth";

export async function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    if (!config.admin.email) {
      return res.status(500).json(createErrorResponse(500, "ADMIN_EMAIL is not configured"));
    }

    const sessionUser = await getSessionUserFromRequest(req);

    if (!sessionUser?.email) {
      return res.status(401).json(createErrorResponse(401, "Authentication required"));
    }

    if (sessionUser.email.toLowerCase() !== config.admin.email) {
      return res.status(403).json(createErrorResponse(403, "Forbidden"));
    }

    next();
  } catch {
    return res.status(401).json(createErrorResponse(401, "Invalid or expired session"));
  }
}
