/**
 * Every price, plan name and comparison row the portfolio app quotes, copied from the site
 * (apps/site/features/pricing/data/offers.ts and pricingData.ts), which matches Dodo and the
 * server's productNames.ts. tests/pricing-claims.contract.test.ts fails when the two drift.
 */

/** Checkout is admin-only in production. The studio checkout and the server enforce it; this only changes the copy. */
export const PAYMENTS_BLOCKED = true;

export const PLAN_PRICES = {
  ai_credits: { monthly: 5.99, annual: 59.88 },
  portfolio_pro: { monthly: 9.99, annual: 95.88 },
  bundle: { monthly: 14.99, annual: 143.88 },
} as const;

export const PASS_PRICES = { one_day: 2.99, seven_day: 5.99 } as const;

export const PLAN_NAMES = {
  ai_credits: "AI Credits",
  portfolio_pro: "Creator Pro",
  bundle: "Job Hunter Bundle",
} as const;

export const PASS_NAMES = { one_day: "3-Day Sprint Pass", seven_day: "7-Day Hunt Pass" } as const;

/** One-time top-ups, named as productNames.ts names them. */
export const CREDIT_PACKS = [
  { name: "250 extra credits", credits: 250, price: 2.99 },
  { name: "500 extra credits", credits: 500, price: 4.99 },
  { name: "1,200 extra credits", credits: 1200, price: 9.99 },
] as const;

export const CREDIT_PACK_VALID_DAYS = 90;

export type PlanKey = keyof typeof PLAN_PRICES;
export type PlanInterval = "monthly" | "annual";

/** An annual plan's price per month: $4.99, $7.99, $11.99 (each annual price is exactly 12 of these). */
export const annualPerMonth = (plan: PlanKey) => Math.round(PLAN_PRICES[plan].annual / 0.12) / 100;

/** Whole-percent saving of annual over twelve monthly payments: 17, 20, 20. */
export const annualSavingsPercent = (plan: PlanKey) =>
  Math.round((1 - PLAN_PRICES[plan].annual / (PLAN_PRICES[plan].monthly * 12)) * 100);

export const usd = (amount: number) => `$${amount.toFixed(2)}`;

/** Columns: Free, Creator Pro, AI Credits, Job Hunter Bundle. */
export const comparisonRows = [
  ["Resume and cover letter editor", true, true, true, true],
  ["Document exports (PDF, DOCX, MD, HTML, TXT, JSON)", true, true, true, true],
  ["Private portfolio drafts", true, true, true, true],
  ["Publish a portfolio on a veriworkly.com subdomain (opens at launch)", true, true, true, true],
  ["Core portfolio templates (Signal, Atelier)", true, true, true, true],
  ["Premium portfolio templates (Nimbus, Cipher)", false, true, false, true],
  ["Multi-page portfolios", false, true, false, true],
  ["Remove the portfolio “Built with VeriWorkly” badge", false, true, false, true],
  ["Portfolio SEO controls", false, true, false, true],
  ["Portfolio analytics", false, true, false, true],
  ["AI writing credits", false, false, true, true],
] as const;

export const PRICING_OFFERS = [
  { name: "Free", price: 0 },
  { name: "3-Day Sprint Pass", price: PASS_PRICES.one_day, days: 3 },
  { name: "7-Day Hunt Pass", price: PASS_PRICES.seven_day, days: 7 },
  { name: "AI Credits, monthly", price: PLAN_PRICES.ai_credits.monthly, billing: "monthly" },
  { name: "AI Credits, annual", price: PLAN_PRICES.ai_credits.annual, billing: "annual" },
  { name: "Creator Pro, monthly", price: PLAN_PRICES.portfolio_pro.monthly, billing: "monthly" },
  { name: "Creator Pro, annual", price: PLAN_PRICES.portfolio_pro.annual, billing: "annual" },
  { name: "Job Hunter Bundle, monthly", price: PLAN_PRICES.bundle.monthly, billing: "monthly" },
  { name: "Job Hunter Bundle, annual", price: PLAN_PRICES.bundle.annual, billing: "annual" },
  ...CREDIT_PACKS.map((pack) => ({ name: pack.name, price: pack.price })),
] as const;

export type PricingOffer = (typeof PRICING_OFFERS)[number];

/** Nothing paid is "InStock" while checkout is closed. */
function toSchemaOffer(offer: PricingOffer, url: string, paymentsBlocked: boolean) {
  const price = offer.price.toFixed(2);
  const free = offer.price === 0;

  return {
    "@type": "Offer",
    name: offer.name,
    price,
    priceCurrency: "USD",
    url,
    availability:
      free || !paymentsBlocked ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    ...("billing" in offer
      ? {
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price,
            priceCurrency: "USD",
            billingDuration: {
              "@type": "QuantitativeValue",
              value: 1,
              unitCode: offer.billing === "monthly" ? "MON" : "ANN",
            },
          },
        }
      : {}),
    ...("days" in offer
      ? {
          eligibleDuration: { "@type": "QuantitativeValue", value: offer.days, unitCode: "DAY" },
        }
      : {}),
  };
}

/** The AggregateOffer both the landing and pricing pages publish. */
export function aggregateOffer(url: string) {
  const prices = PRICING_OFFERS.map((offer) => offer.price);

  return {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: Math.min(...prices).toFixed(2),
    highPrice: Math.max(...prices).toFixed(2),
    offerCount: String(PRICING_OFFERS.length),
    offers: PRICING_OFFERS.map((offer) => toSchemaOffer(offer, url, PAYMENTS_BLOCKED)),
  };
}
