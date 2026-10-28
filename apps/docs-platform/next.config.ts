import path from "path";
import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

import { securityHeaders } from "./security-headers";
import { folderRedirects } from "./folder-redirects";

const withMDX = createMDX();

/** Public files keep their names across deploys, so they are cached for a day and revalidated. */
const imageCache = "public, max-age=86400, stale-while-revalidate=604800";
const imageFiles = [
  "/veriworkly-logo.png",
  "/og/docs-page-og.png",
  "/og/landing-page-og.png",
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
];

/** These change whenever the docs or the spec do, so they are cached for an hour. */
const textCache = "public, max-age=3600";
const textFiles = [
  "/openapi.json",
  "/openapi.yaml",
  "/llms.txt",
  "/.well-known/agent.json",
  "/pricing.md",
];

const nextConfig: NextConfig = {
  transpilePackages: ["@veriworkly/ui"],
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      ...imageFiles.map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: imageCache }],
      })),
      ...textFiles.map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: textCache }],
      })),
    ];
  },
  async redirects() {
    return [
      // These are public marketing routes, not documentation routes. The 301s resolve the
      // historical docs-subdomain 404s without turning the docs shell into a duplicate.
      { source: "/faq", destination: "https://veriworkly.com/faq", statusCode: 301 },
      { source: "/templates", destination: "https://veriworkly.com/templates", statusCode: 301 },
      { source: "/roadmap", destination: "https://veriworkly.com/roadmap", statusCode: 301 },
      ...folderRedirects().map((redirect) => ({ ...redirect, statusCode: 301 as const })),
    ];
  },
};

export default withMDX(nextConfig);
