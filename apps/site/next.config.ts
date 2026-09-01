import type { NextConfig } from "next";

// The backend origin has to be reachable from the browser (contact form, checkout,
// ambassador apply), so it is added to connect-src explicitly rather than opening the
// directive up to all of `https:`.
const backendOrigin = (() => {
  try {
    const raw = process.env.NEXT_PUBLIC_BACKEND_URL;

    return raw ? new URL(raw).origin : "";
  } catch {
    return "";
  }
})();

const connectSrc = ["'self'", backendOrigin, "https://*.veriworkly.com"].filter(Boolean).join(" ");

const isProd = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-inline' is required for next-themes and inline JSON-LD.
  // 'unsafe-eval' is enabled ONLY in development mode so React Fast Refresh and dev tools can reconstruct callstacks.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  "frame-ancestors 'self'",
  // Hardening that costs nothing here: the app has no <object>/<embed>, never needs to
  // rewrite <base>, and only ever posts to itself or the backend.
  "object-src 'none'",
  "base-uri 'none'",
  `form-action 'self'${backendOrigin ? ` ${backendOrigin}` : ""}`,
  "frame-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  // Production only. Locally the backend is plain http://localhost:8080, and although
  // browsers treat localhost as a trustworthy origin, a non-localhost dev backend (a LAN
  // IP, a tunnel) would get silently upgraded to https and fail to connect.
  ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  // Cross-origin isolation. `same-origin-allow-popups` (not `same-origin`) so the
  // hosted-checkout redirect and OAuth popups keep working.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },

  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  /**
   * `.dev.tsx` and `.dev.ts` files are only treated as routes outside production,
   * keeping internal development-only pages out of production builds cleanly without
   * soft-404 prerender issues.
   */
  pageExtensions: [
    "tsx",
    "ts",
    "jsx",
    "js",
    ...(process.env.NODE_ENV === "production" ? [] : ["dev.tsx", "dev.ts"]),
  ],

  // Cloud deploys run `next start`, which warns and gains nothing from a standalone
  // bundle. Only the container build (which runs `node apps/site/server.js`) opts in.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  transpilePackages: ["@veriworkly/ui"],
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    /**
     * Only hosts we actually render from. Both entries serve GitHub contributor
     * avatars on /changelog - `avatars.githubusercontent.com` for the API-supplied
     * URL, `github.com/<user>.png` as the fallback shape.
     *
     * `images.unsplash.com` used to be here for two stock photos on /ambassador.
     * Those were replaced with product UI, so the pattern came out with them: every
     * allowed host is a host the optimizer will fetch and cache on request, so the
     * list should never outlive its usage.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "github.com",
        pathname: "/*.png",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|ico)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
