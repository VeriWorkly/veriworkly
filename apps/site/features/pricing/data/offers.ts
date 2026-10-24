/**
 * Every price the pricing page's Product markup lists, in USD. The server's
 * `productCatalog.ts` owns these numbers; `claims-truth.contract.test.ts` checks this list
 * against it, so a catalog change fails CI here instead of drifting.
 *
 * `billing` marks a recurring subscription (one payment per month or year). `days` marks a
 * one-time pass that expires on its own.
 */
export const PRICING_OFFERS = [
  { name: "Free", price: 0 },
  { name: "3-Day Sprint Pass", price: 2.99, days: 3 },
  { name: "7-Day Hunt Pass", price: 5.99, days: 7 },
  { name: "AI Standalone, monthly", price: 5.99, billing: "monthly" },
  { name: "AI Standalone, annual", price: 59.9, billing: "annual" },
  { name: "Creator Pro, monthly", price: 9.99, billing: "monthly" },
  { name: "Creator Pro, annual", price: 95.88, billing: "annual" },
  { name: "Job Hunter Bundle, monthly", price: 14.99, billing: "monthly" },
  { name: "Job Hunter Bundle, annual", price: 143.88, billing: "annual" },
] as const;

export type PricingOffer = (typeof PRICING_OFFERS)[number];

/**
 * schema.org Offer for one row. Subscriptions carry a UnitPriceSpecification with the billing
 * duration, passes carry their eligible duration, and nothing paid is "InStock" while the
 * checkout is closed.
 */
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
