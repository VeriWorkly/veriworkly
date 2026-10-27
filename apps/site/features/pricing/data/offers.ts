/**
 * Every price the site quotes, in USD. Dodo charges these; the server's productCatalog.ts mirrors
 * them, and claims-truth.contract.test.ts fails CI if the two drift.
 */
export const PLAN_PRICES = {
  ai_credits: { monthly: 5.99, annual: 59.88 },
  portfolio_pro: { monthly: 9.99, annual: 95.88 },
  bundle: { monthly: 14.99, annual: 143.88 },
} as const;

export const PASS_PRICES = { one_day: 2.99, seven_day: 5.99 } as const;

/** One-time top-ups, named as productNames.ts names them. */
export const CREDIT_PACKS = [
  { name: "250 extra credits", credits: 250, price: 2.99 },
  { name: "500 extra credits", credits: 500, price: 4.99 },
  { name: "1,200 extra credits", credits: 1200, price: 9.99 },
] as const;

export const CREDIT_PACK_VALID_DAYS = 90;

export type PlanKey = keyof typeof PLAN_PRICES;

/** An annual plan's price per month: $4.99, $7.99, $11.99 (each annual price is exactly 12 of these). */
export const annualPerMonth = (plan: PlanKey) => Math.round(PLAN_PRICES[plan].annual / 0.12) / 100;

/** Whole-percent saving of annual over twelve monthly payments: 17, 20, 20. */
export const annualSavingsPercent = (plan: PlanKey) =>
  Math.round((1 - PLAN_PRICES[plan].annual / (PLAN_PRICES[plan].monthly * 12)) * 100);

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
export function toSchemaOffer(offer: PricingOffer, url: string, paymentsBlocked: boolean) {
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
