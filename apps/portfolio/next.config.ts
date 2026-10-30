import fs from "fs";
import path from "path";
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// A production build from the mock template library publishes "Mock Signal
// Template: <name>" on every portfolio (P-046). CI builds the mock on purpose
// (scripts/mock-template-library.mjs) because it cannot read the private repo,
// and sets CI; a real deploy (the VPS) does not, so it must have the real one.
const registryFile = path.join(__dirname, "template-library", "registry.ts");
if (
  isProd &&
  !process.env.CI &&
  fs.existsSync(registryFile) &&
  fs.readFileSync(registryFile, "utf8").includes("Mock")
) {
  throw new Error(
    "apps/portfolio/template-library is the mock template library. Check out the real " +
      "VeriWorkly/portfolio-templates submodule (git submodule update --init) before a " +
      "production build.",
  );
}

// Not nonce-based (that would require threading a per-request nonce through
// every layout/template render path, including the 4 independent portfolio
// templates) so 'unsafe-inline' stays in script-src/style-src for Next's own
// hydration scripts and the many inline `style={{...}}` usages across the
// template library. It still blocks the highest-value vector — loading a
// `<script src="https://attacker.example/x.js">` from an untrusted origin —
// since external script/style/connect/frame sources are restricted to
// same-origin and first-party veriworkly.com subdomains.
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://*.veriworkly.com${isProd ? "" : " http://localhost:* ws://localhost:*"}`,
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Platform pages and published portfolios have separate root layouts, so a URL that matches no
  // route needs app/global-not-found.tsx to render a document of its own.
  experimental: { globalNotFound: true },
  // `next` is hoisted to the monorepo root, so Turbopack cannot find it from this app directory
  // and infers the wrong workspace root. Pin it explicitly, as the docs and blog apps do.
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
  async redirects() {
    return [
      // One generated copy of the API spec lives on the docs site; this was a duplicate of it.
      {
        source: "/openapi.json",
        destination: "https://docs.veriworkly.com/openapi.json",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: cspDirectives.join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
