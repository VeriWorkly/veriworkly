import { describe, expect, it } from "vitest";

import {
  paymentFailedParagraphs,
  planChangedParagraphs,
  purchaseConfirmationRows,
  purchaseConfirmationTerms,
  renderPaymentFailedEmail,
  renderPurchaseConfirmationEmail,
  subscriptionCancelledParagraphs,
} from "#mail/index";
import { formatMoney } from "../../src/mail/billing/billingFormat.js";
import { addMonthsUtc } from "#services/annualCreditService";
import { purchaseName, UNLOCK_PHRASES } from "#services/productNames";

/** V-177 / V-172 / V-189: what the billing mails say, and the names they say it with. */

const subscription = {
  kind: "subscription" as const,
  productName: purchaseName("ai_credits", "annual"),
  amountCents: 5_990,
  currency: "USD",
  amountExcludesTax: true,
  accessEndsAt: new Date("2027-10-26T00:00:00Z"),
  renewsAt: new Date("2027-10-26T00:00:00Z"),
  billingPeriod: "year" as const,
  credits: null,
  creditsNote:
    "1,000 credits each month for 12 months. Credits reset monthly: unused credits expire at the end of the month and do not roll over.",
};

describe("purchase confirmation", () => {
  it("names the product as sold and repeats price, period, credits and the renewal terms", () => {
    expect(subscription.productName).toBe("AI Credits (annual)");
    expect(purchaseConfirmationRows(subscription)).toEqual([
      ["Purchase", "AI Credits (annual)"],
      ["Price", "$59.90 USD (before any tax) per year"],
      ["AI credits", subscription.creditsNote],
      ["Current period ends", "26 October 2027"],
    ]);
    expect(purchaseConfirmationTerms(subscription)).toContain(
      "renews automatically on 26 October 2027 at $59.90 USD (before any tax) per year",
    );
    const html = renderPurchaseConfirmationEmail("Ada <script>", subscription);
    expect(html).not.toContain("<script>");
    expect(html).not.toMatch(/\bPro\b/);
  });

  it("tells a pass buyer it does not renew", () => {
    const pass = {
      ...subscription,
      kind: "pass" as const,
      productName: purchaseName("bundle", "seven_day"),
      amountCents: 599,
      amountExcludesTax: false,
      renewsAt: null,
      billingPeriod: null,
      credits: 400,
      creditsNote: null,
    };
    expect(pass.productName).toBe("7-Day Hunt Pass");
    expect(purchaseConfirmationRows(pass)).toContainEqual(["Paid", "$5.99 USD"]);
    expect(purchaseConfirmationRows(pass)).toContainEqual(["AI credits added", "400"]);
    expect(purchaseConfirmationTerms(pass)).toMatch(/does not renew/);
  });

  it("prints a currency in its own minor unit", () => {
    expect(formatMoney(1_000, "JPY")).toBe("¥1,000 JPY");
    expect(formatMoney(49_900, "inr")).toBe("₹499.00 INR");
  });
});

describe("payment failed (V-215, owner decision 9)", () => {
  const notice = {
    productName: "Creator Pro",
    amountCents: 999,
    currency: "USD",
    graceEndsAt: new Date("2026-11-02T12:00:00Z"),
  };

  it("says Pro features are paused now and the portfolio stays online until the grace date", () => {
    const text = paymentFailedParagraphs(notice).join(" ");
    expect(text).toContain("payment of $9.99 USD for your Creator Pro subscription failed");
    expect(text).toContain("Pro features are paused until you update your card.");
    expect(text).toContain("Your portfolio stays online until 2 November 2026.");
    expect(text).not.toMatch(/free plan/i);
    const html = renderPaymentFailedEmail("Sam", notice);
    expect(html).toContain("Portfolio online until");
    expect(html).not.toMatch(/free plan/i);
  });

  it("leaves the portfolio out for a plan without one", () => {
    const text = paymentFailedParagraphs({
      ...notice,
      productName: "AI Credits",
      includesPortfolio: false,
    }).join(" ");
    expect(text).toContain("paused until you update your card");
    expect(text).not.toMatch(/portfolio/i);
  });
});

describe("cancellation and plan change (V-212, V-219)", () => {
  it("names the product and the date access ends", () => {
    const text = subscriptionCancelledParagraphs({
      productName: "Creator Pro",
      accessEndsAt: new Date("2026-11-30T00:00:00Z"),
    }).join(" ");
    expect(text).toContain("Creator Pro");
    expect(text).toContain("30 November 2026");
    expect(text).toMatch(/will not renew/);
  });

  it("states the new plan, the charge model and the next renewal", () => {
    const text = planChangedParagraphs({
      fromProductName: "Creator Pro (monthly)",
      productName: "Job Hunter Bundle (monthly)",
      amountCents: 1_499,
      currency: "USD",
      amountExcludesTax: true,
      billingPeriod: "month",
      renewsAt: new Date("2026-11-30T00:00:00Z"),
    }).join(" ");
    expect(text).toContain("Creator Pro (monthly) to Job Hunter Bundle (monthly)");
    expect(text).toContain("$14.99 USD (before any tax) per month");
    expect(text).toContain("30 November 2026");
  });
});

describe("naming table", () => {
  it("never folds AI Credits or passes into Creator Pro", () => {
    expect(UNLOCK_PHRASES.portfolioPro).toBe("Creator Pro, the Job Hunter Bundle or a pass");
    expect(UNLOCK_PHRASES.aiCredits).toBe(
      "a credit pack, a pass, AI Credits or the Job Hunter Bundle",
    );
  });
});

describe("annual monthly grant dates", () => {
  it("adds calendar months in UTC and clamps to the last day of a short month", () => {
    const start = new Date("2026-01-31T10:00:00Z");
    expect(addMonthsUtc(start, 1).toISOString()).toBe("2026-02-28T10:00:00.000Z");
    expect(addMonthsUtc(start, 2).toISOString()).toBe("2026-03-31T10:00:00.000Z");
    expect(addMonthsUtc(start, 12).toISOString()).toBe("2027-01-31T10:00:00.000Z");
  });
});
