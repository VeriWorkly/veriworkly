import type { NextConfig } from "next";

import { version } from "./package.json";
import { siteConfig } from "./config/site";
import { HTML_LIMITED_BOT_UA_RE } from "next/dist/shared/lib/router/utils/html-bots";

/** Extends Next's default list (setting it replaces the default) so AI crawlers get <title> in <head>, not streamed. */
export const HTML_LIMITED_BOTS = new RegExp(
  `${HTML_LIMITED_BOT_UA_RE.source}|GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-User|Claude-SearchBot|PerplexityBot|Perplexity-User|CCBot|Amazonbot|Applebot-Extended|meta-externalagent`,
  "i",
);

// The backend origin is added to connect-src explicitly rather than opening the directive to all of `https:`.
const backendOrigin = (() => {
  try {
    const raw = process.env.NEXT_PUBLIC_BACKEND_URL;

    return raw ? new URL(raw).origin : "";
  } catch {
    // Left out of the CSP, the browser can never reach the API: say why at build time.
    console.warn(`NEXT_PUBLIC_BACKEND_URL is not a valid URL; the API is left out of connect-src.`);
    return "";
  }
})();

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
  // 'unsafe-inline' is for next-themes and Next's inline bootstrap scripts (JSON-LD is data, not script); 'unsafe-eval' only in development.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  `form-action 'self'${backendOrigin ? ` ${backendOrigin}` : ""}`,
  "frame-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  // Production only: a non-localhost dev backend (LAN IP, tunnel) would be upgraded to https and fail.
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
  // `same-origin-allow-popups`, not `same-origin`, so the checkout redirect and OAuth popups keep working.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },

  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  /** `.dev.tsx` and `.dev.ts` files are routes only outside production. */
  pageExtensions: [
    "tsx",
    "ts",
    "jsx",
    "js",
    ...(process.env.NODE_ENV === "production" ? [] : ["dev.tsx", "dev.ts"]),
  ],

  // Only the container build (`node apps/site/server.js`) needs standalone; `next start` gains nothing.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  transpilePackages: ["@veriworkly/ui"],
  env: { NEXT_PUBLIC_APP_VERSION: version },
  reactStrictMode: true,
  poweredByHeader: false,
  htmlLimitedBots: HTML_LIMITED_BOTS,
  images: {
    formats: ["image/avif", "image/webp"],
    /** Only hosts we actually render from: every allowed host is one the optimizer fetches on request. */
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
      // Legacy root-domain URLs that Search Console reported as 404s; keep their accumulated links.
      { source: "/blog", destination: siteConfig.links.blog, permanent: true },
      { source: "/docs", destination: `${siteConfig.links.docs}/docs`, permanent: true },
      { source: "/dashboard", destination: siteConfig.links.app, permanent: true },
      {
        source: "/openapi.json",
        destination: `${siteConfig.links.docs}/openapi.json`,
        permanent: true,
      },

      { source: "/support", destination: "/contact", permanent: true },
      { source: "/cookies", destination: "/privacy#cookies", permanent: true },
      { source: "/careers", destination: "/about", permanent: true },
      { source: "/integrations", destination: "/features", permanent: true },
      { source: "/partners", destination: "/affiliate", permanent: true },
      { source: "/tutorials", destination: `${siteConfig.links.docs}/docs`, permanent: true },
      { source: "/Free", destination: "/", permanent: true },

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
        // Same-name files change content, so they cannot be immutable: a day fresh, then a week stale-while-revalidate.
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|ico)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

export default nextConfig;
