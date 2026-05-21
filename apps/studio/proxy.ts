import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/admin/:path*", "/profile/:path*", "/api-keys/:path*", "/login"],
};

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionCookie =
    request.cookies.get("__Secure-veriworkly-auth.session_token")?.value ||
    request.cookies.get("veriworkly-auth.session_token")?.value;

  const isLoginPage = pathname === "/login";
  const isAuthenticated = !!sessionCookie;

  if (isLoginPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isLoginPage && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
