import type { NextConfig } from "next";

import path from "node:path";

import packageJson from "./package.json";

/** The PDF's line breaker, see `templates/pdf/textkit.ts`. */
const TEXTKIT_REPLACEMENT = path.join(__dirname, "templates", "pdf", "textkit.ts");

/** For the asset folders the proxy skips: they serve files, never a page that runs script. */
const STATIC_ASSET_CSP =
  "default-src 'self'; script-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";

// Pages get their Content-Security-Policy from `proxy.ts`: it carries a per-request nonce.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // `same-origin-allow-popups`, not `same-origin`, so the checkout redirect and OAuth popups keep working.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // Inlined at build time so the version shown in the account menu is the one that shipped.
  env: { STUDIO_VERSION: packageJson.version },

  // The PDF breaks lines where the preview does: `@react-pdf/layout` gets textkit with the
  // browser's line breaker. See `templates/pdf/textkit.ts`; the vitest configs alias it too.
  // Both bundlers carry the alias: a build with `--webpack` that lacked it would fall back to
  // textkit's own Knuth–Plass breaker without a word, and break lines the preview does not.
  turbopack: {
    resolveAlias: { "@react-pdf/textkit": "./templates/pdf/textkit.ts" },
  },
  webpack(config: { resolve?: { alias?: Record<string, unknown> } }) {
    config.resolve ??= {};
    config.resolve.alias = {
      ...config.resolve.alias,
      // `$`: only the bare package. The replacement imports textkit's own file by its path.
      "@react-pdf/textkit$": TEXTKIT_REPLACEMENT,
    };

    return config;
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
      { source: "/:path*", headers: securityHeaders },
      // The public asset folders `proxy.ts` skips get no nonce policy. Nothing there runs a
      // script (the SVGs are plain shapes), so they get one that allows none. `:path+` keeps it
      // off `/templates` itself, a page the proxy serves.
      {
        source: "/:folder(icons|images|fonts|og|templates)/:path+",
        headers: [{ key: "Content-Security-Policy", value: STATIC_ASSET_CSP }],
      },
    ];
  },
};

export default nextConfig;
