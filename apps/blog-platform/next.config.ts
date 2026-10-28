import path from "path";
import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { createMDX } from "fumadocs-mdx/next";

import { securityHeaders } from "./security-headers";

const withMDX = createMDX();

/** Same-name files whose content can change, so a day fresh and a week stale-while-revalidate. */
const assetCache = [
  { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
];
const textCache = [{ key: "Cache-Control", value: "public, max-age=3600" }];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@veriworkly/ui"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/veriworkly-logo.png", headers: assetCache },
      { source: "/og/blog-page-og.png", headers: assetCache },
      { source: "/web-app-manifest-:size.png", headers: assetCache },
      { source: "/ats-parser-readback.svg", headers: assetCache },
      { source: "/llms.txt", headers: textCache },
      { source: "/llms-full.txt", headers: textCache },
      { source: "/pricing.md", headers: textCache },
      { source: "/.well-known/agent.json", headers: textCache },
      { source: "/rss.xml", headers: textCache },
      { source: "/atom.xml", headers: textCache },
    ];
  },
  async redirects() {
    return [
      {
        // Consolidated into the researched ATS pillar; the old post competed
        // with it for the same queries.
        source: "/mastering-ats-friendly-resumes-2026",
        destination: "/ats-resume-myths-what-the-evidence-shows",
        permanent: true,
      },
      // One generated copy of the API spec lives on the docs site.
      {
        source: "/openapi.json",
        destination: "https://docs.veriworkly.com/openapi.json",
        permanent: true,
      },
      // Rewritten from code as a plain account of what is stored, sent and never seen.
      {
        source: "/privacy-future-local-first-resume-builder",
        destination: "/what-veriworkly-stores-sends-and-never-sees",
        statusCode: 301,
      },
      // Same topic as the docs monorepo page, which is the one search engines rank.
      {
        source: "/building-scalable-resume-platform-multi-app-architecture",
        destination: "https://docs.veriworkly.com/docs/architecture/monorepo",
        statusCode: 301,
      },
    ];
  },
};

/**
 * Canonicals, feeds, the sitemap and OG URLs are all built from SITE_URL, so a production build
 * without it would point a staging deploy at the live blog. Fail the build instead.
 */
export default function config(phase: string) {
  if (phase === PHASE_PRODUCTION_BUILD && !process.env.SITE_URL) {
    throw new Error(
      "SITE_URL must be set for a production build (e.g. https://blog.veriworkly.com).",
    );
  }

  return withMDX(nextConfig);
}
