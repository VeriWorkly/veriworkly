import { NextRequest, NextResponse } from "next/server";

import { getSafeAuthCallback, SESSION_COOKIE_NAMES } from "@/lib/auth-redirect";
import { serverFetch } from "@/lib/server-fetch";
import { isCorsRejection } from "@/lib/server-fetch-core";

async function readApiMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown };
    return typeof body.message === "string" ? body.message : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The domains the API may have scoped its session cookie to (`AUTH_COOKIE_DOMAIN`): this host
 * and each parent above the top-level label. A cookie is only removed by a `Set-Cookie` with
 * the same domain, and studio does not know which one the API chose.
 */
function cookieDomains(hostname: string) {
  const labels = hostname.split(".");

  return labels.slice(0, -1).map((_, index) => labels.slice(index).join("."));
}

function expiredCookie(name: string, domain?: string) {
  const secure = name.startsWith("__Secure-") ? "; Secure" : "";

  return `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}${domain ? `; Domain=${domain}` : ""}`;
}

/**
 * Where a server render sends a browser whose session cookie the API rejects (revoked, expired):
 * the cookie is cleared and the user signs in again, instead of browsing as a guest who believes
 * they are signed in.
 *
 * The API is asked first, so a link to this route from anywhere cannot sign out a live session.
 */
export async function GET(request: NextRequest) {
  const hasSession = SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name));
  if (!hasSession) return NextResponse.redirect(new URL("/login", request.url));

  const response = await serverFetch("/users/me");
  const { status } = response;
  const message = status === 403 ? await readApiMessage(response) : undefined;

  // A CORS refusal says nothing about the session: keep the cookie, and let the page report it.
  if ((status !== 401 && status !== 403) || isCorsRejection(status, message)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Where the user was headed (`?callbackURL=`), so signing in again returns them there.
  const login = new URL("/login?session=expired", request.url);
  const callback = getSafeAuthCallback(request.nextUrl.searchParams.get("callbackURL"), "");
  if (callback) login.searchParams.set("callbackURL", callback);

  const expired = NextResponse.redirect(login);

  for (const name of SESSION_COOKIE_NAMES) {
    expired.headers.append("Set-Cookie", expiredCookie(name));

    for (const domain of cookieDomains(request.nextUrl.hostname)) {
      expired.headers.append("Set-Cookie", expiredCookie(name, domain));
    }
  }

  return expired;
}
