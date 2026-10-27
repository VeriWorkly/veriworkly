/**
 * The one naming table for what VeriWorkly sells (V-189). Every server string a customer reads
 * (error messages, the billing summary, purchase and dunning emails) takes its product names
 * from here, so "AI Credits" is never called "Pro" and a pass is never called a subscription.
 * No imports on purpose: any service (documents, imports, ATS, portfolio) can use it without
 * pulling in config or the billing service.
 *
 * The site's pricing data (`apps/site/features/pricing/data/offers.ts`) uses these names. The
 * portfolio pricing page still writes some labels of its own ("AI Credits Standalone",
 * "VeriWorkly Creator Pro", "Creator Pro (Monthly)"), so check both apps when a name changes.
 */

export const PRODUCT_NAMES = {
  ai_credits: "AI Credits",
  portfolio_pro: "Creator Pro",
  bundle: "Job Hunter Bundle",
} as const;

/** The one-time bundle passes, by catalog interval (`one_day` is the 3-day pass). */
export const PASS_NAMES = {
  one_day: "3-Day Sprint Pass",
  seven_day: "7-Day Hunt Pass",
} as const;

export const CREDIT_PACK_NAMES = {
  credit_pack_250: "250 extra credits",
  credit_pack_500: "500 extra credits",
} as const;

type NamedProduct = keyof typeof PRODUCT_NAMES;
type NamedInterval = "one_day" | "seven_day" | "monthly" | "annual";

/** What a customer bought, as they would recognise it: "7-Day Hunt Pass", "Creator Pro (annual)". */
export function purchaseName(productKey: NamedProduct, interval: NamedInterval): string {
  if (productKey === "bundle" && (interval === "one_day" || interval === "seven_day"))
    return PASS_NAMES[interval];
  return `${PRODUCT_NAMES[productKey]} (${interval === "annual" ? "annual" : "monthly"})`;
}

/**
 * Phrases for "what unlocks this" in error strings. Pro features (publishing premium templates,
 * unlimited documents, badge removal, analytics, SEO) come from Creator Pro, the bundle or a pass;
 * a credit pack never unlocks them (owner decision 3). AI features run on credits from any source
 * (owner decision 1).
 */
export const UNLOCK_PHRASES = {
  /** Publishing a premium template and the other portfolio Pro features. */
  portfolioPro: `${PRODUCT_NAMES.portfolio_pro}, the ${PRODUCT_NAMES.bundle} or a pass`,
  /** Anything that spends AI credits. */
  aiCredits: `a credit pack, a pass, ${PRODUCT_NAMES.ai_credits} or the ${PRODUCT_NAMES.bundle}`,
} as const;

/** The 402 for any AI feature the balance cannot cover: credits come from any source (V-189). */
export const NOT_ENOUGH_CREDITS = `Not enough AI credits. Credits come with ${UNLOCK_PHRASES.aiCredits}.`;
