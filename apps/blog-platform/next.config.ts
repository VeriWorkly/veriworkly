import path from "path";
import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

import { securityHeaders } from "./security-headers";

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
      {
        // Consolidated into the researched ATS pillar; the old post competed
        // with it for the same queries.
        source: "/mastering-ats-friendly-resumes-2026",
        destination: "/ats-resume-myths-what-the-evidence-shows",
        permanent: true,
      },
      // One generated copy of the API spec lives on the docs site; this was a duplicate of it.
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

export default withMDX(nextConfig);
