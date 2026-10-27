/**
 * The studio's Content-Security-Policy, built per request by `proxy.ts` around a fresh nonce.
 * Scripts run only with that nonce (Next stamps it on its own scripts, `ThemeProvider` on the
 * theme script) or when loaded by a script that has it (`'strict-dynamic'`), so an injected
 * inline script does not run. A fixed policy in `next.config.ts` would need `'unsafe-inline'`.
 */

/** The backend origin, added to connect-src explicitly rather than opening it to all of `https:`. */
function backendOrigin() {
  try {
    const raw = process.env.NEXT_PUBLIC_BACKEND_URL;

    return raw ? new URL(raw).origin : "";
  } catch {
    return "";
  }
}

/** A fresh, unguessable nonce for one response. */
export function createCspNonce() {
  return btoa(crypto.randomUUID());
}

export function buildContentSecurityPolicy(nonce: string) {
  const isProd = process.env.NODE_ENV === "production";
  const backend = backendOrigin();

  return [
    "default-src 'self'",
    // 'wasm-unsafe-eval' is for yoga-layout, which react-pdf compiles from an inline base64
    // module when a PDF is rendered. Development needs 'unsafe-eval' for React's dev tooling.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${isProd ? "" : " 'unsafe-eval'"}`,
    // Cover-letter previews load the chosen typeface from Google Fonts (features/documents/constants/fonts.ts).
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src ${["'self'", backend, "https://*.veriworkly.com", "data:", "blob:"].filter(Boolean).join(" ")}`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    `form-action 'self'${backend ? ` ${backend}` : ""}`,
    "frame-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    // Production only: a non-localhost dev backend (LAN IP, tunnel) would be upgraded to https and fail.
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
