import type { NextConfig } from "next";
import { HTML_LIMITED_BOT_UA_RE } from "next/dist/shared/lib/router/utils/html-bots";

/**
 * Crawlers that read <head> from the first bytes and do not wait for streamed metadata. Next's
 * default list covers search and link-preview bots but no AI crawlers, so on the dynamic routes
 * (/changelog, /roadmap/*, /stats) they got <title> streamed into <body> (W-060). Setting the
 * option replaces the default, so the default is extended rather than restated.
 */
export const HTML_LIMITED_BOTS = new RegExp(
  `${HTML_LIMITED_BOT_UA_RE.source}|GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-User|Claude-SearchBot|PerplexityBot|Perplexity-User|CCBot|Amazonbot|Applebot-Extended|meta-externalagent`,
  "i",
);

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

// The field Web Vitals collector (components/WebVitals.tsx), when one is configured.
const vitalsOrigin = (() => {
  try {
    const raw = process.env.NEXT_PUBLIC_VITALS_URL;

    return raw ? new URL(raw).origin : "";
  } catch {
    return "";
  }
})();

const connectSrc = ["'self'", backendOrigin, vitalsOrigin, "https://*.veriworkly.com"]
  .filter(Boolean)
  .join(" ");

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
  htmlLimitedBots: HTML_LIMITED_BOTS,
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

  async redirects() {
    return [
      // Historical root-domain URLs appeared in Search Console as 404s. These have direct,
      // durable homes on the public subdomains, so preserve their accumulated links instead of
      // asking crawlers and visitors to rediscover them.
      { source: "/blog", destination: "https://blog.veriworkly.com", permanent: true },
      { source: "/docs", destination: "https://docs.veriworkly.com/docs", permanent: true },
      { source: "/dashboard", destination: "https://app.veriworkly.com", permanent: true },

      // The ambassador footer linked these for months; they never existed and sit in the
      // Search Console 404 report. Each goes to the page that holds what the label promised.
      { source: "/support", destination: "/contact", permanent: true },
      { source: "/cookies", destination: "/privacy#cookies", permanent: true },
      { source: "/careers", destination: "/about", permanent: true },
      { source: "/integrations", destination: "/features", permanent: true },
      { source: "/partners", destination: "/affiliate", permanent: true },
      { source: "/tutorials", destination: "https://docs.veriworkly.com/docs", permanent: true },
      { source: "/Free", destination: "/", permanent: true },

      // Older template URLs used unprefixed slugs. Send the known legacy paths to the
      // current, canonical template detail pages instead of serving soft 404s.
      {
        source: "/templates/executive-clarity",
        destination: "/templates/resume/resume-executive-clarity",
        permanent: true,
      },
      {
        source: "/templates/executive",
        destination: "/templates/resume/resume-executive-clarity",
        permanent: true,
      },
      {
        source: "/templates/modern",
        destination: "/templates/resume/resume-modern-minimal",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // These files keep their names when their content changes (template previews, og
        // cards, the logo), so they cannot be immutable: a year-long immutable copy would
        // outlive every replacement. A day fresh, then a week served stale while it
        // revalidates (W-036). Hashed build assets under /_next/static keep Next's own header.
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|ico)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

export default nextConfig;
