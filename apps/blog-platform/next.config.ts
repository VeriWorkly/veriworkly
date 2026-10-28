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
    ];
  },
};

export default withMDX(nextConfig);
