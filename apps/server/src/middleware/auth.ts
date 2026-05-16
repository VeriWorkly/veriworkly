import { NextFunction, Request, Response } from "express";
import { createHash } from "node:crypto";

import { ApiError } from "#utils/errors";

import { convertNodeHeadersToWebHeaders, getSessionFromRequestHeaders } from "#auth/index";

import { cacheGet, cacheSet } from "#utils/redis";

type SessionUserShape = {
  id?: string;
  email?: string | null;
  name?: string | null;
};

function extractStableAuthCookieFingerprint(cookieHeader: string): string | null {
  const authCookies = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean)
    .filter((c) => c.includes("veriworkly-auth"));

  if (!authCookies.length) {
    return null;
  }

  const stableSessionCookie = authCookies.find(
    (cookie) =>
      cookie.startsWith("veriworkly-auth.session_token=") ||
      cookie.startsWith("__Secure-veriworkly-auth.session_token="),
  );

  if (stableSessionCookie) {
    return stableSessionCookie;
  }

  return authCookies.sort().join(";");
}

export async function getSessionUserFromRequest(req: Request): Promise<AuthenticatedUser | null> {
  // 1. Per-request cache
  if (req.authUser) return req.authUser;
  if (req._authChecked) return null;

  // 2. Quick check: if no auth cookie is present, skip expensive session lookup
  const cookieHeader = req.headers.cookie || "";

  if (!cookieHeader.includes("veriworkly-auth")) {
    req._authChecked = true;
    return null;
  }

  try {
    // 3. Try Redis cache (hash a stable session fingerprint to avoid key churn)
    const fingerprint = extractStableAuthCookieFingerprint(cookieHeader);

    if (!fingerprint) {
      req._authChecked = true;
      return null;
    }

    const cookieHash = createHash("md5").update(fingerprint).digest("hex");
    const cacheKey = `auth:session:${cookieHash}`;

    const cachedUser = await cacheGet<AuthenticatedUser>(cacheKey);

    if (cachedUser) {
      req.authUser = cachedUser;
      req._authChecked = true;
      return cachedUser;
    }

    // 4. Perform actual session lookup
    const headers = convertNodeHeadersToWebHeaders(req.headers);
    const session = await getSessionFromRequestHeaders(headers);

    req._authChecked = true;

    if (!session?.user) {
      return null;
    }

    const user = session.user as SessionUserShape;

    if (!user.id) {
      return null;
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? null,
    };

    // 5. Cache result in Redis for 15 minutes (short TTL for security)
    await cacheSet(cacheKey, authUser, 900);

    req.authUser = authUser;
    return authUser;
  } catch {
    req._authChecked = true;
    return null;
  }
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
