/** Dodo hosts its checkout on dodopayments.com subdomains (live and test mode). */
const CHECKOUT_HOST = /(^|\.)dodopayments\.com$/;

/** The URL the API returned, if it is an https page on the payment provider; anything else is refused. */
export function safeCheckoutUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  try {
    const url = new URL(raw);
    return url.protocol === "https:" && CHECKOUT_HOST.test(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}
