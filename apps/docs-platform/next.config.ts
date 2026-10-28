import path from "path";
import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

import { securityHeaders } from "./security-headers";
import { folderRedirects } from "./folder-redirects";

const withMDX = createMDX();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
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
