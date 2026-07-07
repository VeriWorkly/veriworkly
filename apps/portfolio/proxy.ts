import { NextResponse, type NextRequest } from "next/server";

const PLATFORM_HOST = "portfolio.veriworkly.com";
const publicPlatformPaths = [
  "/",
  "/pricing",
  "/portfolios",
  "/user",
  "/portfolio",
  "/templates",
  "/faq",
  "/dashboard",
  "/editor",
  "/preview",
  "/analytics",
  "/settings",
  "/profile",
];
const SESSION_COOKIE_NAMES = [
  "__Secure-veriworkly-auth.session_token",
  "veriworkly-auth.session_token",
];

export function isPublicPlatformPath(path: string) {
  return publicPlatformPaths.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function hasPortfolioSessionCookie(request: NextRequest) {
  return SESSION_COOKIE_NAMES.some((cookieName) => Boolean(request.cookies.get(cookieName)?.value));
}

export default function proxy(request: NextRequest) {
  const hostname = (request.headers.get("host") ?? "").split(":")[0];

  const path = request.nextUrl.pathname;
  const isPlatformHost =
    hostname === PLATFORM_HOST || hostname === "localhost" || hostname === "portfolio.localhost";

  if (
    isPlatformHost &&
    !isPublicPlatformPath(path) &&
    !path.startsWith("/api") &&
    !path.includes(".")
  ) {
    const hasSession = hasPortfolioSessionCookie(request);

    if (!hasSession) {
      const loginUrl =
        process.env.NODE_ENV === "development"
          ? "http://localhost:3001/login"
          : "https://app.veriworkly.com/login";

      return NextResponse.redirect(`${loginUrl}?callbackURL=${encodeURIComponent(request.url)}`);
    }
  }

  if (path.startsWith("/_next") || path.startsWith("/api") || path.includes("."))
    return NextResponse.next();

  if (isPlatformHost) {
    const match = path.match(/^\/(?:user|portfolio)\/([^/]+)(.*)$/);

    return match
      ? NextResponse.rewrite(new URL(`/portfolios/${match[1]}${match[2]}`, request.url))
      : NextResponse.next();
  }

  const username = hostname.endsWith(".veriworkly.com")
    ? hostname.replace(".veriworkly.com", "")
    : hostname.endsWith(".localhost")
      ? hostname.replace(".localhost", "")
      : null;

  return username
    ? NextResponse.rewrite(new URL(`/portfolios/${username}${path}`, request.url))
    : NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
