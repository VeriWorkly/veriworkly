import { NextFunction, Request, Response } from "express";

import { ApiError } from "#utils/errors";

import { convertNodeHeadersToWebHeaders, getSessionFromRequestHeaders } from "#auth/index";

type SessionUserShape = {
  id?: string;
  email?: string | null;
  name?: string | null;
};

export async function getSessionUserFromRequest(req: Request): Promise<AuthenticatedUser | null> {
  const headers = convertNodeHeadersToWebHeaders(req.headers);
  const session = await getSessionFromRequestHeaders(headers);

  if (!session?.user) {
    return null;
  }

  const user = session.user as SessionUserShape;

  if (!user.id) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    name: user.name ?? null,
  };
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await getSessionUserFromRequest(req);

    if (!user) {
      throw new ApiError(401, "Authentication required");
    }

    req.authUser = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }

    return next(new ApiError(401, "Invalid or expired session"));
  }
}

export function requireAuthUser(req: Request): AuthenticatedUser {
  if (!req.authUser?.id) {
    throw new ApiError(401, "Authentication required");
  }

  return req.authUser;
}
