import { NextRequest, NextResponse } from "next/server";

import {
  getSafeAuthCallback,
  isProtectedStudioPath,
  REQUEST_PATH_HEADER,
  SESSION_COOKIE_NAMES,
} from "@/lib/auth-redirect";
import { buildContentSecurityPolicy, createCspNonce } from "@/lib/content-security-policy";

/**
 * Framework output and `public/` asset folders never reach the proxy. Everything else does,
 * so a page route can never skip the login redirect by looking like a file.
 */
export const config = {
  matcher: ["/((?!_next/|icons/|images/|fonts/|og/|templates/).*)"],
};

const GUEST_COOKIE_NAME = "veriworkly-guest-mode";

/** Routes that answer the same to everyone: API handlers, public shares, the parity harness. */
const PUBLIC_PATH_PREFIXES = ["/api", "/share", "/parity", "/.well-known"];

/** Root files crawlers, browsers and agents fetch without a session. */
const PUBLIC_FILES = new Set([
  // Clears a dead session cookie; a visitor without a guest cookie must reach it too.
  "/auth/session-expired",
  "/llms.txt",
  "/openapi.json",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.json",
  "/favicon.ico",
  "/icon1.png",
  "/apple-icon.png",
  "/veriworkly-logo.png",
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
]);

/** `/login?session=expired` is where a rejected session is sent; it must render while the dead cookie may linger. */
const SESSION_EXPIRED_PARAM = "session";

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isPublicStudioPath(pathname: string) {
  return (
    PUBLIC_FILES.has(pathname) ||
    PUBLIC_PATH_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))
  );
}

/**
 * Renders the page with a fresh CSP nonce. Next reads the nonce from the request's policy and
 * stamps it on its scripts; the root layout reads `x-nonce` for the theme script. The page's
 * path is passed on too, overwriting any sent by the browser, so a server render that sends a
 * dead session to sign in again can bring the user back to it (S-378).
 */
function nextWithNonce(request: NextRequest) {
  const nonce = createCspNonce();
  const policy = buildContentSecurityPolicy(nonce);
  const headers = new Headers(request.headers);

  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", policy);
  headers.set(REQUEST_PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);

  return response;
}

export default async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (isPublicStudioPath(pathname)) return nextWithNonce(request);

  const isAuthenticated = SESSION_COOKIE_NAMES.some((name) => !!request.cookies.get(name)?.value);
  const hasGuestCookie = request.cookies.get(GUEST_COOKIE_NAME)?.value === "true";

  if (matchesPrefix(pathname, "/login")) {
    // The callback page finishes a social sign-in (referral, return location) with the new
    // session cookie already set, so it must not be skipped like the sign-in form is.
    const isCallback = matchesPrefix(pathname, "/login/callback");
    const isSessionExpired = searchParams.get(SESSION_EXPIRED_PARAM) === "expired";

    if (isAuthenticated && !isCallback && !isSessionExpired) {
      const callbackURL = getSafeAuthCallback(searchParams.get("callbackURL"));

      return NextResponse.redirect(new URL(callbackURL, request.url));
    }

    return nextWithNonce(request);
  }

  const isProtectedPath = isProtectedStudioPath(pathname);

  if ((isProtectedPath && !isAuthenticated) || (!isAuthenticated && !hasGuestCookie)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackURL", `${pathname}${request.nextUrl.search}`);

    return NextResponse.redirect(loginUrl);
  }

  return nextWithNonce(request);
}
