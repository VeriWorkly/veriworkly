import { NextRequest, NextResponse } from "next/server";

import { getSafeAuthCallback } from "@/lib/auth-redirect";

/**
 * Every `/_next/` path is excluded, not just `static` and `image`.
 *
 * The framework's own endpoints live under that prefix too — in development
 * that includes the HMR socket, and answering its upgrade request with a normal
 * `NextResponse.next()` (carrying a `Set-Cookie`) fails the handshake. The dev
 * client then retries instead of bootstrapping, and the page never hydrates.
 * Auth redirects have no business on those routes in any case.
 */
export const config = {
  matcher: ["/((?!_next/|favicon.ico).*)"],
};

const PROTECTED_PATH_PREFIXES = ["/admin", "/profile/master", "/profile/advanced"];
const GUEST_COOKIE_NAME = "veriworkly-guest-mode";

export function isProtectedStudioPath(pathname: string) {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function looksLikeStaticAssetPath(path: string) {
  const lastSegment = path.split("/").pop() ?? "";
  return /\.[a-zA-Z0-9]+$/.test(lastSegment);
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isBypassed =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/share") ||
    looksLikeStaticAssetPath(pathname);

  if (isBypassed) {
    return NextResponse.next();
  }

  const sessionCookie =
    request.cookies.get("__Secure-veriworkly-auth.session_token")?.value ||
    request.cookies.get("veriworkly-auth.session_token")?.value;

  const hasGuestCookie = request.cookies.get(GUEST_COOKIE_NAME)?.value === "true";
  const isAuthenticated = !!sessionCookie;
  const isLoginPage = pathname === "/login" || pathname.startsWith("/login/");

  if (isLoginPage) {
    if (isAuthenticated) {
      const callbackURL = getSafeAuthCallback(request.nextUrl.searchParams.get("callbackURL"));
      const redirectUrl = new URL(callbackURL, request.url);

      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
  }

  const isProtectedPath = isProtectedStudioPath(pathname);

  // Account-sensitive routes always require a real authenticated session
  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackURL", `${pathname}${request.nextUrl.search}`);

    return NextResponse.redirect(loginUrl);
  }

  // Dashboard / builder routes require either authentication or explicit guest mode
  if (!isAuthenticated && !hasGuestCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackURL", `${pathname}${request.nextUrl.search}`);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
