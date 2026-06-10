import { NextRequest, NextResponse } from "next/server";

import { getSafeAuthCallback } from "@/lib/auth-redirect";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

const PROTECTED_PATH_PREFIXES = ["/admin", "/profile/master", "/profile/advanced"];
const GUEST_COOKIE_NAME = "veriworkly-guest-mode";
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function isProtectedStudioPath(pathname: string) {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function withGuestCookie(response: NextResponse, request: NextRequest) {
  if (!request.cookies.get(GUEST_COOKIE_NAME)?.value) {
    response.cookies.set(GUEST_COOKIE_NAME, "true", {
      httpOnly: true,
      maxAge: GUEST_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionCookie =
    request.cookies.get("__Secure-veriworkly-auth.session_token")?.value ||
    request.cookies.get("veriworkly-auth.session_token")?.value;

  const isLoginPage = pathname === "/login";

  const isProtectedPath = isProtectedStudioPath(pathname);
  const isAuthenticated = !!sessionCookie;

  if (isLoginPage && isAuthenticated) {
    const callbackURL = getSafeAuthCallback(request.nextUrl.searchParams.get("callbackURL"));
    const redirectUrl = new URL(callbackURL, request.url);

    return NextResponse.redirect(redirectUrl);
  }

  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackURL", `${pathname}${request.nextUrl.search}`);

    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();

  return isAuthenticated ? response : withGuestCookie(response, request);
}
