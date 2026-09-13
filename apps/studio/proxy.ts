import { NextRequest, NextResponse } from "next/server";

import { getSafeAuthCallback } from "@/lib/auth-redirect";

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
    pathname.startsWith("/parity") ||
    looksLikeStaticAssetPath(pathname);

  if (isBypassed) return NextResponse.next();

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

  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackURL", `${pathname}${request.nextUrl.search}`);

    return NextResponse.redirect(loginUrl);
  }

  if (!isAuthenticated && !hasGuestCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackURL", `${pathname}${request.nextUrl.search}`);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
