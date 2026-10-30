// Shared by every OG image route. These are public, unauthenticated,
// rate-limit-free edge endpoints that render arbitrary query params straight
// into an ImageResponse — an unbounded string is a cheap resource-abuse
// vector (and, for very long input, a rendering-cost/timeout risk), so every
// free-text param gets clamped server-side regardless of what the client
// (og-generator's UI hint, a direct URL hit, or a template's own metadata)
// sends.
export function clampOgText(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max).trimEnd()}…` : value;
}

// The card's text is all in the URL, so a given URL always renders the same image: let browsers
// and the CDN keep it instead of re-rendering on every unfurl (Next's default is max-age=0).
export const OG_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
};
