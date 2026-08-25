import "server-only";

/**
 * Used when the upstream rate is unavailable, implausible, or slow. Also the value the
 * client bundle ships with, so the very first paint always has something sane to format.
 */
export const FALLBACK_INR_PER_USD = 98;

const RATE_SOURCE = "https://open.er-api.com/v6/latest/USD";

/** Refreshed twice a day. List prices are round USD figures; nobody needs minute-level FX. */
const RATE_REVALIDATE_SECONDS = 43_200;

/**
 * A rate outside this band is not a rate, it is a malformed or hijacked response - and it
 * would render a price on a checkout page. USD/INR has spent its entire history well
 * inside these bounds, so anything outside them is rejected in favour of the fallback.
 */
const MIN_PLAUSIBLE_RATE = 40;
const MAX_PLAUSIBLE_RATE = 250;

/** Never let FX hold up a page render; the fallback is always acceptable. */
const RATE_TIMEOUT_MS = 3_000;

/**
 * Current USD→INR rate for display on /pricing.
 *
 * This deliberately runs on the server. The original implementation called the same
 * endpoint from the browser on every pricing view, which failed on three counts: our own
 * `connect-src` CSP blocked the host outright so it never returned a rate in production;
 * it disclosed every pricing visitor's IP to a third party on a product sold on not doing
 * that; and it re-requested per visitor instead of once per cache window.
 *
 * Server-side, the CSP is not in play, the third party sees only our origin, and Next's
 * Data Cache collapses all traffic into one upstream call per revalidate window.
 *
 * The figure remains indicative - checkout is billed in USD and the card is charged at the
 * processor's rate on the day - so the UI still labels it as approximate.
 */
export async function fetchInrPerUsd(): Promise<number> {
  try {
    const response = await fetch(RATE_SOURCE, {
      signal: AbortSignal.timeout(RATE_TIMEOUT_MS),
      next: { revalidate: RATE_REVALIDATE_SECONDS },
    });

    if (!response.ok) return FALLBACK_INR_PER_USD;

    const payload: unknown = await response.json();

    const rate =
      payload && typeof payload === "object"
        ? (payload as { rates?: Record<string, unknown> }).rates?.INR
        : undefined;

    if (
      typeof rate !== "number" ||
      !Number.isFinite(rate) ||
      rate < MIN_PLAUSIBLE_RATE ||
      rate > MAX_PLAUSIBLE_RATE
    ) {
      return FALLBACK_INR_PER_USD;
    }

    return rate;
  } catch {
    // Timeout, DNS failure, malformed JSON. A stale-but-sane rate beats a broken page.
    return FALLBACK_INR_PER_USD;
  }
}
