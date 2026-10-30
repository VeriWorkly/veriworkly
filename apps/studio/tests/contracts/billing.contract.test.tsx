import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BillingActivity, BillingSummary } from "@/features/billing/types";
import type { CreditTransaction, CreditWallet } from "@/features/credits/types";
import type { AtsPricing, AtsQuota } from "@/features/ats/types";

import { BillingPage } from "@/features/billing/BillingPage";
import { resolveCheckoutRequest } from "@/features/billing/checkout-rules";
import { CreditUsagePage } from "@/features/credits/CreditUsagePage";
import { describePaidActionError } from "@/features/credits/credit-errors";
import {
  describeAtsError,
  extractResumeFile,
  runAtsAnalysis,
  runAtsCheck,
} from "@/features/ats/ats-api";
import { freeLimitMessage } from "@/features/documents/services/document-limit";
import { InitialUserContext } from "@/store/session-user";
import { useUserStore } from "@/store/useUserStore";
import { ApiRequestError } from "@/utils/fetchApiData";

vi.mock("@/lib/constants", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/constants")>()),
  backendApiUrl: (path: string) => `http://localhost:4000/api/v1${path}`,
}));

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "" }),
  Geist_Mono: () => ({ variable: "" }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/billing",
}));

/** The resumes on this device, as the document-limit checks read them. */
const workspace = vi.hoisted(() => ({ resumes: [] as Array<{ id: string }> }));

vi.mock("@/features/documents/services/document-workspace-service", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/features/documents/services/document-workspace-service")
  >()),
  listDocuments: vi.fn((type?: string) => (type === "RESUME" ? workspace.resumes : [])),
}));

const programData = vi.hoisted(() => ({ affiliate: null as unknown }));

vi.mock("@/features/billing/billing-server", () => ({
  PROGRAM_UNAVAILABLE: Symbol("program-unavailable"),
  getProgramServerData: async () => programData.affiliate,
}));

const studioRoot = join(__dirname, "..", "..");

/** The plan credit notes exactly as the server's catalog sends them (`productCatalog.ts`). */
function serverCreditNotes() {
  const source = readFileSync(
    join(studioRoot, "..", "server", "src", "services", "productCatalog.ts"),
    "utf8",
  );
  const note = (name: string) => {
    const match = source.match(new RegExp(`const ${name} =\\s*"([^"]+)"`));
    if (!match) throw new Error(`${name} not found in productCatalog.ts`);
    return match[1];
  };

  return { monthly: note("MONTHLY_CREDIT_NOTE"), annual: note("ANNUAL_CREDIT_NOTE") };
}

/** "roll over" may appear only as a denial: owner decision 4, nothing rolls over. */
function promisedRollovers(text: string) {
  return [...text.matchAll(/roll(?:s|ed|ing)?[\s-]?over/gi)].filter(
    (match) =>
      !/\b(not|never|no|don't|doesn't|won't|cannot)\b[^.]{0,40}$/i.test(
        text.slice(Math.max(0, match.index - 60), match.index),
      ),
  );
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sourceFiles(join(dir, entry.name))
      : /\.tsx?$/.test(entry.name)
        ? [join(dir, entry.name)]
        : [],
  );
}

const DAY = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString();

/** The server renders dates in UTC (the client swaps in local time after hydration). */
const serverDate = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeZone: "UTC" });

function summary(overrides: Partial<BillingSummary> = {}): BillingSummary {
  return {
    plan: "FREE",
    productKey: null,
    activeProductKeys: [],
    status: "INACTIVE",
    interval: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    graceEndsAt: null,
    canPublish: false,
    entitlements: [],
    access: {
      tier: "free",
      isPaying: false,
      paymentIssue: false,
      passEndsAt: null,
      portfolioAccessEndsAt: null,
      aiCreditsEndsAt: null,
      creditBalance: 0,
    },
    hasBillingAccount: false,
    subscriptionPaused: false,
    credits: {
      balance: 0,
      reserved: 0,
      available: 0,
      lifetimeCredited: 0,
      lifetimeDebited: 0,
      nextExpiryAt: null,
      nextExpiryCredits: 0,
      updatedAt: inDays(0),
    },
    catalog: [
      {
        key: "ai_credits",
        name: "AI Credits",
        entitlements: ["ai_credits"],
        prices: { monthly: 599, annual: 5990 },
        configuredIntervals: ["monthly", "annual"],
        currency: "USD",
        creditNotes: serverCreditNotes(),
      },
    ],
    addOns: [],
    creditEconomics: {
      actions: {},
      packs: [
        {
          key: "credit_pack_250",
          name: "250 extra credits",
          credits: 250,
          price: 299,
          currency: "USD",
          expiresInDays: 90,
          configured: true,
        },
        {
          key: "credit_pack_500",
          name: "500 extra credits",
          credits: 500,
          price: 499,
          currency: "USD",
          expiresInDays: 90,
          configured: true,
        },
        {
          key: "credit_pack_1200",
          name: "1,200 extra credits",
          credits: 1200,
          price: 999,
          currency: "USD",
          expiresInDays: 90,
          configured: true,
        },
      ],
    },
    ...overrides,
  };
}

function text(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");
}

function renderBilling(billing: BillingSummary, history: BillingActivity[] = []) {
  return text(renderToStaticMarkup(<BillingPage billing={billing} history={history} />));
}

beforeEach(() => {
  useUserStore.setState({
    user: { id: "u1", email: "jane@example.com" } as never,
    isLoggedIn: true,
    loading: false,
  });
});

afterEach(() => {
  useUserStore.setState({ user: null, isLoggedIn: false, loading: true });
});

describe("billing page describes what the customer actually bought", () => {
  it("S-181 S-263: a pass buyer sees the pass and its end date, never INACTIVE, Free or a renewal", () => {
    const passEndsAt = inDays(3);
    const page = renderBilling(
      summary({
        plan: "BUNDLE",
        entitlements: ["ai_credits", "portfolio_publish"],
        access: {
          tier: "pass",
          isPaying: true,
          paymentIssue: false,
          passEndsAt,
          portfolioAccessEndsAt: passEndsAt,
          aiCreditsEndsAt: passEndsAt,
          creditBalance: 150,
        },
      }),
    );

    expect(page).toContain(`Pass active until ${serverDate(passEndsAt)}`);
    expect(page).not.toMatch(/INACTIVE|inactive/);
    expect(page).not.toMatch(/\bFree\b/);
    expect(page).not.toMatch(/renew/i);
    expect(page).toMatch(/credits end with the pass/i);
  });

  it("S-263: a credit-pack-only buyer is a Credits customer with no subscription block", () => {
    const page = renderBilling(
      summary({
        access: {
          tier: "credits",
          isPaying: true,
          paymentIssue: false,
          passEndsAt: null,
          portfolioAccessEndsAt: null,
          aiCreditsEndsAt: null,
          creditBalance: 250,
        },
        credits: { ...summary().credits, balance: 250, available: 250 },
      }),
    );

    expect(page).toContain("Credits customer");
    expect(page).toContain("250 credits available");
    expect(page).not.toMatch(/\bFree\b/);
    expect(page).not.toMatch(/Subscription status|INACTIVE|renew/i);
  });

  it("S-180: the spendable figure is `available`, not a balance still holding expired credits", () => {
    const page = renderBilling(
      summary({
        access: { ...summary().access, tier: "credits", isPaying: true, creditBalance: 150 },
        credits: {
          ...summary().credits,
          balance: 400,
          reserved: 20,
          available: 150,
          nextExpiryAt: inDays(10),
          nextExpiryCredits: 40,
        },
      }),
    );

    expect(page).toContain("150 credits available");
    expect(page).not.toContain("400");
    expect(page).toContain("20 credits held for an action in progress");
    expect(page).toContain(`40 credits expire ${serverDate(inDays(10))}`);
  });

  it("S-228: a failed renewal shows the grace end and sends the customer to update the card", () => {
    const graceEndsAt = inDays(6);
    const page = renderBilling(
      summary({
        productKey: "portfolio_pro",
        status: "INACTIVE",
        interval: "MONTHLY",
        currentPeriodEnd: inDays(-1),
        graceEndsAt,
      }),
    );

    expect(page).toContain(
      `Payment failed. Pro features are paused; your portfolio keeps its plan until ${serverDate(graceEndsAt)} . Update your card`,
    );
    expect(page).toContain("Update card");
    expect(page).not.toMatch(/\bFree\b/);
    // The card is fixed first: no second subscription is offered meanwhile.
    expect(page).not.toContain("View upgrade options");
    expect(page).not.toContain("$5.99 / month");
  });

  it("S-237: status and dates come only from the subscription behind the tier", () => {
    const creatorProEnd = inDays(4);
    const aiCreditsEnd = inDays(25);
    const page = renderBilling(
      summary({
        plan: "AI_CREDITS",
        productKey: "portfolio_pro",
        activeProductKeys: ["ai_credits"],
        status: "CANCELED",
        interval: "ANNUAL",
        currentPeriodEnd: creatorProEnd,
        entitlements: ["ai_credits"],
        access: {
          ...summary().access,
          tier: "ai_credits",
          isPaying: true,
          aiCreditsEndsAt: aiCreditsEnd,
        },
      }),
    );

    expect(page).toContain("AI Credits");
    expect(page).not.toMatch(/Cancelled|Annual/);
    expect(page).not.toContain(serverDate(creatorProEnd));
    expect(page).toContain(`Paid through ${serverDate(aiCreditsEnd)}`);
  });

  it("S-233: a cancelled plan with time left says when access ends, not when it renews", () => {
    const end = inDays(12);
    const page = renderBilling(
      summary({
        plan: "AI_CREDITS",
        productKey: "ai_credits",
        status: "CANCELED",
        interval: "MONTHLY",
        currentPeriodEnd: end,
        entitlements: ["ai_credits"],
        access: { ...summary().access, tier: "ai_credits", isPaying: true },
      }),
    );

    expect(page).toContain(`Access ends ${serverDate(end)}`);
    expect(page).not.toMatch(/Renews|Next renewal/);
  });

  it("S-181: an active recurring plan shows its status and renewal date", () => {
    const end = inDays(20);
    const page = renderBilling(
      summary({
        plan: "PORTFOLIO_PRO",
        productKey: "portfolio_pro",
        status: "ACTIVE",
        interval: "ANNUAL",
        currentPeriodEnd: end,
        entitlements: ["portfolio_publish", "seo_controls"],
        access: { ...summary().access, tier: "portfolio_pro", isPaying: true },
      }),
    );

    expect(page).toContain("Creator Pro");
    expect(page).toContain("Active");
    expect(page).toContain(`Renews ${serverDate(end)}`);
  });

  it("S-229: a lapsed subscriber can buy again, and still reach the billing portal", () => {
    const page = renderBilling(
      summary({ productKey: "portfolio_pro", status: "INACTIVE", currentPeriodEnd: inDays(-30) }),
    );

    expect(page).toContain("View upgrade options");
    expect(page).toContain("Receipts and invoices");
    expect(page).not.toContain("Manage subscription");
  });

  it("S-182 S-271 S-266: AI Credits is sold monthly and annually, annual credits arrive monthly, packs say how long they last", () => {
    const page = renderBilling(summary());

    expect(page).toContain("$5.99 / month");
    expect(page).toContain("$59.90 / year");
    expect(page).toContain(serverCreditNotes().monthly);
    expect(page).toContain(serverCreditNotes().annual);
    expect(page).toContain("Buy 250 credits");
    expect(page).toMatch(/valid 90 days/);
  });

  it("S-273: the AI Credits offer shows the server's credit notes and never promises a rollover", () => {
    const page = renderBilling(summary());

    expect(page).toMatch(/do not roll over/);
    expect(promisedRollovers(page)).toEqual([]);

    const copyDirs = ["features/billing", "features/credits", "app/(main)/checkout"];
    for (const file of copyDirs.flatMap((dir) => sourceFiles(join(studioRoot, dir)))) {
      expect(promisedRollovers(readFileSync(file, "utf8")), file).toEqual([]);
    }
  });

  it("S-276: a Creator Pro subscriber is not sold AI Credits, which the server refuses, and is told how to get both", () => {
    const page = renderBilling(
      summary({
        plan: "PORTFOLIO_PRO",
        productKey: "portfolio_pro",
        status: "ACTIVE",
        interval: "MONTHLY",
        access: { ...summary().access, tier: "portfolio_pro", isPaying: true },
      }),
    );

    expect(page).not.toContain("$5.99 / month");
    expect(page).not.toContain("AI Credits subscription");
    expect(page).toContain("Upgrade to Job Hunter Bundle");
    expect(page).not.toMatch(/cancel Creator Pro|contact support to switch/i);
    expect(page).toContain("Buy 250 credits");

    for (const tier of ["ai_credits", "bundle"] as const) {
      expect(
        renderBilling(summary({ access: { ...summary().access, tier, isPaying: true } })),
      ).not.toContain("$5.99 / month");
    }
  });

  it("V-202: Creator Pro and AI Credits subscribers are offered the upgrade; the bundle, an ending plan and a lapsed one are not", () => {
    const subscriber = (
      tier: "portfolio_pro" | "ai_credits" | "bundle",
      overrides: Partial<BillingSummary> = {},
    ) =>
      renderBilling(
        summary({
          productKey: tier,
          status: "ACTIVE",
          interval: "MONTHLY",
          access: { ...summary().access, tier, isPaying: true },
          ...overrides,
        }),
      );

    expect(subscriber("portfolio_pro")).toContain("Upgrade to Job Hunter Bundle");
    expect(subscriber("ai_credits")).toContain("Upgrade to Job Hunter Bundle");
    expect(subscriber("bundle")).not.toContain("Upgrade to Job Hunter Bundle");
    expect(subscriber("ai_credits", { cancelAtPeriodEnd: true })).not.toContain(
      "Upgrade to Job Hunter Bundle",
    );
    expect(subscriber("ai_credits", { interval: "ONE_DAY" })).not.toContain(
      "Upgrade to Job Hunter Bundle",
    );
  });

  it("S-266 S-223 V-197: pack buttons carry their price, history rows their product and amount", () => {
    const page = renderBilling(summary(), [
      {
        id: "e1",
        type: "payment.succeeded",
        processedAt: inDays(-1),
        createdAt: inDays(-1),
        productName: "Creator Pro (monthly)",
        amountCents: 999,
        currency: "USD",
      },
      {
        id: "e2",
        type: "subscription.updated",
        processedAt: null,
        createdAt: inDays(-1),
        productName: null,
        amountCents: null,
        currency: null,
      },
    ]);

    expect(page).toMatch(/Buy 250 credits \$2\.99/);
    expect(page).toMatch(/Buy 500 credits \$4\.99/);
    expect(page).toMatch(/Buy 1,200 credits \$9\.99/);
    expect(page).toContain("Payment received · Creator Pro (monthly)");
    expect(page).toContain("$9.99");
    expect(page).toContain("Subscription updated");
  });

  it("S-330 S-235: pass and pack buyers reach their receipts; only a live plan is called a subscription", () => {
    const pass = renderBilling(
      summary({ access: { ...summary().access, tier: "pass", isPaying: true } }),
    );
    const pack = renderBilling(
      summary({ access: { ...summary().access, tier: "credits", isPaying: true } }),
    );
    const subscriber = renderBilling(
      summary({
        productKey: "ai_credits",
        status: "ACTIVE",
        access: { ...summary().access, tier: "ai_credits", isPaying: true },
      }),
    );

    expect(pass).toContain("Receipts and invoices");
    expect(pack).toContain("Receipts and invoices");
    expect(subscriber).toContain("Manage subscription");
    expect(renderBilling(summary())).not.toMatch(/Receipts and invoices|Manage subscription/);
  });

  it("LOW: an admin-comped plan says when access ends, not that it was paid", () => {
    const end = inDays(20);
    const page = renderBilling(
      summary({
        plan: "PORTFOLIO_PRO",
        entitlements: ["portfolio_publish"],
        access: {
          ...summary().access,
          tier: "portfolio_pro",
          isPaying: false,
          portfolioAccessEndsAt: end,
        },
      }),
    );

    expect(page).toContain(`Access until ${serverDate(end)}`);
    expect(page).not.toContain("Paid through");
  });

  it("LOW: the payment notices use a background colour the theme defines", () => {
    for (const file of [
      "features/billing/BillingPage.tsx",
      "app/(main)/checkout/checkout-redirect.tsx",
    ]) {
      expect(readFileSync(join(studioRoot, file), "utf8"), file).not.toContain("bg-accent-soft");
    }
  });

  it("S-223: entitlements and history read as product language, and no lock jargon is shown", () => {
    const page = renderBilling(
      summary({
        plan: "PORTFOLIO_PRO",
        entitlements: ["portfolio_publish", "seo_controls", "watermark_removal"],
        access: { ...summary().access, tier: "portfolio_pro", isPaying: true },
      }),
      [
        {
          id: "e1",
          type: "subscription.active",
          processedAt: inDays(-2),
          createdAt: inDays(-2),
          productName: null,
          amountCents: null,
          currency: null,
        },
        {
          id: "e2",
          type: "payment.succeeded",
          processedAt: null,
          createdAt: inDays(-2),
          productName: null,
          amountCents: null,
          currency: null,
        },
      ],
    );

    expect(page).toContain("Premium portfolio templates");
    expect(page).toContain("SEO controls");
    expect(page).not.toMatch(/PORTFOLIO PUBLISH|portfolio_publish|SEO CONTROLS/);
    expect(page).toContain("Subscription started");
    expect(page).toContain("Payment received");
    expect(page).toContain(serverDate(inDays(-2)));
    expect(page).not.toMatch(/\block\b/i);
  });

  it("S-330 a one-time buyer whose pack is spent or pass ended still reaches their receipts", () => {
    const spent = renderBilling(summary({ hasBillingAccount: true }));

    expect(spent).toContain("Receipts and invoices");
    expect(spent).not.toContain("Manage subscription");
  });

  it("S-387 a paused subscription is not called a failed payment, and keeps the grace clause", () => {
    const graceEndsAt = inDays(6);
    // The server says it is paused; the row `status` describes can be another subscription.
    for (const status of ["PAST_DUE", "INACTIVE"]) {
      const page = renderBilling(
        summary({
          productKey: "portfolio_pro",
          status,
          interval: "MONTHLY",
          currentPeriodEnd: inDays(-1),
          graceEndsAt,
          subscriptionPaused: true,
          access: {
            ...summary().access,
            tier: "portfolio_pro",
            isPaying: true,
            paymentIssue: false,
          },
        }),
      );

      expect(page, status).toContain("Your subscription is paused. Pro features are off");
      expect(page, status).toContain(
        `your portfolio keeps its plan until ${serverDate(graceEndsAt)} .`,
      );
      expect(page, status).toContain("Resume it from Manage billing");
      expect(page, status).not.toMatch(/Payment failed|Update card|update your card/);
    }
  });

  it("S-388 a failed renewal says Pro features are paused and the portfolio keeps its plan until grace ends", () => {
    const graceEndsAt = inDays(6);
    const page = renderBilling(
      summary({
        productKey: "portfolio_pro",
        status: "PAST_DUE",
        interval: "MONTHLY",
        currentPeriodEnd: inDays(-1),
        graceEndsAt,
        access: { ...summary().access, tier: "portfolio_pro", isPaying: true, paymentIssue: true },
      }),
    );

    expect(page).toContain(
      `Payment failed. Pro features are paused; your portfolio keeps its plan until ${serverDate(graceEndsAt)} .`,
    );
    expect(page).not.toContain("access ends");
  });

  it("S-388 once grace has passed the banner says the portfolio is on the free template, not a past date", () => {
    const failedOn = inDays(-9);
    const page = renderBilling(
      summary({
        productKey: "portfolio_pro",
        status: "PAST_DUE",
        interval: "MONTHLY",
        currentPeriodEnd: failedOn,
        graceEndsAt: inDays(-2),
        access: { ...summary().access, tier: "portfolio_pro", isPaying: true, paymentIssue: true },
      }),
    );

    expect(page).toContain("your portfolio is now on the free template");
    expect(page).not.toContain(serverDate(failedOn));
  });

  it("S-391 the plan's portfolio entitlement is named as templates, since every portfolio publishes", () => {
    const page = renderBilling(
      summary({
        plan: "PORTFOLIO_PRO",
        entitlements: ["portfolio_publish"],
        access: { ...summary().access, tier: "portfolio_pro", isPaying: true },
      }),
    );

    expect(page).toContain("Premium portfolio templates");
    expect(page).not.toMatch(/Portfolio publishing/i);
  });

  it("S-392 a pass holder can still reach the plans page", () => {
    const page = renderBilling(
      summary({ access: { ...summary().access, tier: "pass", isPaying: true } }),
    );

    expect(page).toContain("View upgrade options");
  });
});

describe("credits page", () => {
  const wallet: CreditWallet = {
    balance: 400,
    reserved: 10,
    available: 150,
    lifetimeCredited: 900,
    lifetimeDebited: 500,
    updatedAt: inDays(0),
    nextExpiryAt: inDays(5),
    nextExpiryCredits: 60,
  };
  const pricing: AtsPricing = {
    analysisCredits: { min: 4, max: 12 },
    jobUrlAnalysisCredits: { min: 6, max: 18 },
    resumeConversionCredits: 25,
    parseRepairCredits: 5,
  };
  const row = (overrides: Partial<CreditTransaction>): CreditTransaction => ({
    id: Math.random().toString(36),
    type: "DEBIT",
    amount: -5,
    balanceAfter: 100,
    action: null,
    documentId: null,
    reason: null,
    createdAt: inDays(-1),
    ...overrides,
  });

  function renderCredits(history: CreditTransaction[], atsPricing: AtsPricing | null = pricing) {
    return text(
      renderToStaticMarkup(
        <CreditUsagePage
          wallet={wallet}
          history={history}
          economics={{
            actions: {
              rewrite_section: { costs: { standard: 2, expert: 6 } },
              generate_cover_letter: { costs: { standard: 4, expert: 10 } },
            },
            packs: [],
          }}
          atsPricing={atsPricing}
        />,
      ),
    );
  }

  it("S-390 a refund claw-back reads as credits removed, not returned", () => {
    const page = renderCredits([
      row({
        type: "REFUND",
        amount: -250,
        action: "payment_refund",
        reason: "Payment refunded",
      }),
    ]);

    expect(page).toContain("Credits removed (payment refunded)");
    expect(page).not.toContain("Credits returned");
  });

  it("S-180 S-201: shows available credits, held and expiring apart, and labels the debit total honestly", () => {
    const page = renderCredits([]);

    expect(page).toMatch(/Available 150/);
    expect(page).not.toContain("400");
    expect(page).toContain("Spent or expired");
    expect(page).toContain("10 credits held for an action in progress");
    expect(page).toContain(`60 credits expire ${serverDate(inDays(5))}`);
  });

  it("S-202 S-208: every history row shows its date, and admin free text never reaches the user", () => {
    const when = inDays(-3);
    const page = renderCredits([
      row({ action: "ats_analysis", reason: "AI ATS analysis", createdAt: when }),
      row({
        type: "GRANT",
        amount: 50,
        action: "admin_adjustment",
        reason: "goodwill for ticket #4411 (angry customer)",
        createdAt: when,
      }),
      row({ type: "EXPIRATION", amount: -20, reason: "Credit grant expired", createdAt: when }),
      row({
        action: "rewrite_section",
        reason: "AI standard action: rewrite_section",
        createdAt: when,
      }),
    ]);

    expect(
      page.match(new RegExp(serverDate(when).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")),
    ).toHaveLength(4);
    expect(page).toContain("ATS AI analysis");
    expect(page).toContain("Credits added by support");
    expect(page).toContain("Credits expired");
    expect(page).toContain("AI section rewrite");
    expect(page).not.toMatch(/angry customer|rewrite_section|AI standard action/);
  });

  it("S-204 S-268: costs list what history shows, from the server's ATS pricing, and the 50-entry cap is stated", () => {
    const page = renderCredits([]);

    expect(page).toContain("ATS AI analysis");
    expect(page).toContain("4–12 credits");
    expect(page).toContain("6–18 credits");
    expect(page).toContain("AI parse repair");
    expect(page).toContain("Resume conversion");
    expect(page).toContain("25 credits");
    expect(page).toMatch(/last 50 entries/);
    expect(page).not.toMatch(/Failed actions do not consume/i);
  });

  it("S-204: ATS prices that could not be loaded are said to be unavailable", () => {
    expect(renderCredits([], null)).toMatch(/ATS prices could not be loaded/);
  });

  it("S-279: the LinkedIn import is priced in the grid and named in history", () => {
    const page = renderCredits([row({ action: "linkedin_import", reason: "AI LinkedIn import" })]);

    expect(page).toMatch(/LinkedIn profile import 25 credits/);
    expect(page).toContain("LinkedIn import");
    expect(page).not.toMatch(/\bAdjustment\b/);
  });

  it("S-333: plan grants say which plan and month they are; support grants never show the typed reason", () => {
    const page = renderCredits([
      row({
        type: "GRANT",
        amount: 1000,
        reason: "AI Credits monthly credits (month 3 of 12)",
      }),
      row({ type: "GRANT", amount: 150, reason: "Job Hunter Bundle credit allowance" }),
      row({ type: "GRANT", amount: 1000, reason: "AI Credits credit allowance" }),
      row({ type: "GRANT", amount: 250, reason: "250 extra credits" }),
      row({
        type: "GRANT",
        amount: 40,
        action: "admin_adjustment",
        reason: "sorry about the outage, 40 credits",
      }),
      row({ type: "GRANT", amount: 5, reason: "free text nobody should read" }),
    ]);

    expect(page).toContain("AI Credits annual plan credits, month 3 of 12");
    expect(page).toContain("Job Hunter Bundle or pass credits");
    expect(page).toContain("AI Credits plan credits");
    expect(page).toContain("250 extra credits");
    expect(page).toContain("Credits added by support");
    expect(page).toContain("Credits added");
    expect(page).not.toMatch(/outage|credit allowance|nobody should read/);
  });

  it("S-346: actions no screen offers are not priced", () => {
    const page = renderCredits([]);

    expect(page).not.toMatch(/job tailoring|document draft/i);
  });
});

/** The plan-change refusals as the server builds them (`planChangeError` in billingService). */
function serverPlanChangeErrors() {
  const source = readFileSync(
    join(studioRoot, "..", "server", "src", "services", "billingService.ts"),
    "utf8",
  ).replace(/\r\n/g, "\n");
  const errors = [...source.matchAll(/planChangeError\(\s*"([A-Z_]+)",\s*("[^"]*"|`[^`]*`)/g)].map(
    ([, code, literal]) => ({ code, message: literal.slice(1, -1) }),
  );

  expect(errors.length).toBeGreaterThanOrEqual(8);
  return errors;
}

describe("upgrading to the bundle (V-202)", () => {
  it("V-202: the change is sent with one idempotency key, and a 202 reads as still being confirmed", async () => {
    const { changePlan, previewPlanChange } = await import("@/features/billing/billing-api");
    const fetchMock = vi.fn(async (url: string) =>
      String(url).endsWith("/preview")
        ? new Response(
            JSON.stringify({
              data: {
                productKey: "bundle",
                interval: "monthly",
                dueNow: 350,
                currency: "USD",
                nextAmount: 1499,
                nextBillingDate: inDays(12),
              },
            }),
            { status: 200 },
          )
        : new Response(
            JSON.stringify({
              data: {
                status: "pending",
                productKey: "bundle",
                interval: "monthly",
                paymentId: null,
                confirmed: false,
                replayed: false,
              },
            }),
            { status: 202 },
          ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(previewPlanChange("bundle", "monthly")).resolves.toMatchObject({ dueNow: 350 });
    await expect(changePlan("bundle", "monthly", "key-1")).resolves.toMatchObject({
      confirmed: false,
    });

    const [url, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/billing\/subscription\/change-plan$/);
    expect(new Headers(init.headers).get("Idempotency-Key")).toBe("key-1");
    expect(JSON.parse(init.body as string)).toEqual({
      productKey: "bundle",
      interval: "monthly",
      idempotencyKey: "key-1",
    });

    // Both bodies parse with the server's own validator.
    const { planChangeSchema } = await import("../../../server/src/validators/billingValidator");
    for (const [, call] of fetchMock.mock.calls as unknown as Array<[string, RequestInit]>) {
      expect(planChangeSchema.safeParse(JSON.parse(call.body as string)).success).toBe(true);
    }
  });

  it("V-202: every refusal says the server's reason; unpaid or paused plans go to billing; payments closed stays closed", async () => {
    const { describeCheckoutError } = await import("@/features/billing/checkout-rules");

    for (const { code, message } of serverPlanChangeErrors()) {
      const failure = describeCheckoutError(new ApiRequestError(message, 409, { code }), "x");

      expect(failure.kind, code).not.toBe("checkout-locked");
      expect(failure.message, code).toBe(message);
      if (code === "PAYMENT_OUTSTANDING" || code === "SUBSCRIPTION_PAUSED") {
        expect(failure.kind, code).toBe("manage-billing");
      }
    }
    expect(
      describeCheckoutError(new ApiRequestError("Payments are disabled.", 403), "x").kind,
    ).toBe("payments-closed");
  });
});

describe("before a paid AI action runs", () => {
  afterEach(() => {
    workspace.resumes = [];
  });

  function stubBilling(plan: BillingSummary["plan"]) {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ data: summary({ plan }) }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("S-278: a free account that already has a resume is stopped before the conversion is charged", async () => {
    const { conversionLimitMessage } = await import("@/features/ats/AtsWorkspace");

    workspace.resumes = [];
    const unused = stubBilling("FREE");
    await expect(conversionLimitMessage()).resolves.toBeNull();
    expect(unused).not.toHaveBeenCalled();

    workspace.resumes = [{ id: "r1" }];
    stubBilling("FREE");
    await expect(conversionLimitMessage()).resolves.toBe(freeLimitMessage("RESUME"));

    stubBilling("BUNDLE");
    await expect(conversionLimitMessage()).resolves.toBeNull();
  });

  it("V-201: a document-limit 402 says the limit and does not offer credits", () => {
    const failure = describePaidActionError(
      new ApiRequestError("Free accounts can keep 1 active resume at a time.", 402, {
        code: "DOCUMENT_LIMIT",
        type: "RESUME",
      }),
      "x",
    );

    expect(failure).toEqual({ message: freeLimitMessage("RESUME"), buyCredits: false });
  });

  it("V-192: a retry reuses the request id until it succeeds or the request changes", async () => {
    const { requestIdFor, settleRequestId } = await import("@/features/ai/ai-api");
    const pending = { current: null as { fingerprint: string; requestId: string } | null };

    const first = requestIdFor(pending, "a");
    expect(requestIdFor(pending, "a")).toBe(first);

    settleRequestId(pending, new TypeError("Failed to fetch"));
    expect(requestIdFor(pending, "a")).toBe(first);

    settleRequestId(pending, new ApiRequestError("Upstream timed out.", 504));
    const second = requestIdFor(pending, "a");
    expect(second).not.toBe(first);
    expect(requestIdFor(pending, "b")).not.toBe(second);

    settleRequestId(pending);
    expect(pending.current).toBeNull();
  });

  it("S-389 a payer at the paid GitHub cap is told it resets, not offered a subscription", async () => {
    const { importLimitNote } = await import("@/components/dashboard/modals/ImportProfileModal");
    const quota = {
      unlimited: false,
      remaining: 0,
      limit: 50,
      resetsInSeconds: 3600,
      connectedUsername: null,
    };

    const paid = importLimitNote("github", { ...quota, isPaid: true });
    expect(paid.offerPlans).toBe(false);
    expect(paid.message).toBe("You've reached today's GitHub import limit.");

    const free = importLimitNote("github", { ...quota, isPaid: false });
    expect(free.offerPlans).toBe(true);
    expect(free.message).toMatch(/A subscription or pass lifts this limit/);
  });

  it("S-206 V-197: the import allowance shows unlimited plans and the real GitHub cap", async () => {
    const { importAllowanceLabel } =
      await import("@/components/dashboard/modals/ImportProfileModal");

    expect(
      importAllowanceLabel("linkedin", {
        isPaid: true,
        unlimited: true,
        remaining: null,
        limit: null,
        resetsInSeconds: 0,
        connectedUsername: null,
      }),
    ).toBe("No import limit");
    expect(
      importAllowanceLabel("github", {
        isPaid: true,
        unlimited: false,
        remaining: 48,
        limit: 50,
        resetsInSeconds: 3600,
        connectedUsername: null,
      }),
    ).toBe("48 / 50 left today");
    expect(
      importAllowanceLabel("linkedin", {
        isPaid: false,
        unlimited: false,
        remaining: 1,
        limit: 1,
        resetsInSeconds: 0,
        connectedUsername: null,
      }),
    ).toBe("1 / 1 left · rolling 30 days");
  });

  it("SV S-206: GitHub import asks for a sign-in only when no GitHub login is linked", async () => {
    const { githubImportState } = await import("@/components/dashboard/modals/ImportProfileModal");
    const quota = {
      isPaid: false,
      unlimited: false,
      remaining: 1,
      limit: 1,
      resetsInSeconds: 0,
    };

    expect(githubImportState({ ...quota, connectedUsername: null, hasGithubAccount: false })).toBe(
      "needs-sign-in",
    );
    expect(githubImportState({ ...quota, connectedUsername: null, hasGithubAccount: true })).toBe(
      "unreadable",
    );
    expect(githubImportState({ ...quota, connectedUsername: "jane", hasGithubAccount: true })).toBe(
      "ready",
    );
  });

  it("S-279: the LinkedIn import says what it costs and what the user has", async () => {
    const { linkedinImportCostNote } =
      await import("@/components/dashboard/modals/ImportProfileModal");

    expect(linkedinImportCostNote(25, 100)).toEqual({
      text: "Uses 25 credits · you have 100",
      short: false,
    });
    expect(linkedinImportCostNote(25, 10)).toEqual({
      text: "Uses 25 credits · you have 10",
      short: true,
    });
    expect(linkedinImportCostNote(null, 10)).toEqual({ text: "Uses AI credits", short: false });
  });

  it("S-280: the import modal counts this device's resumes when it mounts open", async () => {
    const { ImportProfileModal } = await import("@/components/dashboard/modals/ImportProfileModal");
    const { listDocuments } =
      await import("@/features/documents/services/document-workspace-service");
    vi.mocked(listDocuments).mockClear();

    renderToStaticMarkup(<ImportProfileModal open onClose={() => undefined} />);

    expect(listDocuments).toHaveBeenCalledWith("RESUME");
  });
});

describe("affiliate payouts", () => {
  afterEach(() => {
    programData.affiliate = null;
  });

  async function renderPayouts(status: string | null) {
    programData.affiliate =
      status === null
        ? null
        : {
            affiliateStatus: status,
            wallet: { pendingCents: 0, availableCents: 5000, paidCents: 0 },
            minimumWithdrawalCents: 2500,
            withdrawals: [],
          };
    const { default: AffiliatePayoutsPage } =
      await import("@/app/(main)/(dashboard)/affiliate/payouts/page");
    return text(renderToStaticMarkup(await AffiliatePayoutsPage()));
  }

  it("S-282: only an active affiliate is offered the payout form", async () => {
    expect(await renderPayouts("ACTIVE")).toContain("Request payout");

    for (const status of ["PENDING", "SUSPENDED", "NOT_ENROLLED", null]) {
      const page = await renderPayouts(status);

      expect(page, String(status)).not.toContain("Request payout");
      expect(page, String(status)).not.toContain("$25.00");
    }
  });

  it("S-392 a payout already awaiting review hides the form, since a second request is refused", async () => {
    for (const [status, line] of [
      ["REQUESTED", "Payout of $30.00 requested, awaiting review."],
      ["APPROVED", "Payout of $30.00 approved, awaiting payment."],
    ]) {
      programData.affiliate = {
        affiliateStatus: "ACTIVE",
        wallet: { pendingCents: 0, availableCents: 5000, paidCents: 0 },
        minimumWithdrawalCents: 2500,
        withdrawals: [
          {
            id: "w1",
            amountCents: 3000,
            currency: "USD",
            status,
            createdAt: "2026-10-01T00:00:00.000Z",
            payoutNote: null,
          },
        ],
      };
      const { default: AffiliatePayoutsPage } =
        await import("@/app/(main)/(dashboard)/affiliate/payouts/page");
      const page = text(renderToStaticMarkup(await AffiliatePayoutsPage()));

      expect(page, status).not.toContain("Request payout");
      expect(page, status).toContain(line);
    }
  });

  it("S-259: a payout's note from the admin is shown on its row", async () => {
    programData.affiliate = {
      affiliateStatus: "ACTIVE",
      wallet: { pendingCents: 0, availableCents: 0, paidCents: 5000 },
      minimumWithdrawalCents: 2500,
      withdrawals: [
        {
          id: "w1",
          amountCents: 5000,
          currency: "USD",
          status: "REJECTED",
          createdAt: "2026-10-01T00:00:00.000Z",
          payoutNote: "PayPal account could not be verified",
        },
        {
          id: "w2",
          amountCents: 2500,
          currency: "USD",
          status: "PAID",
          createdAt: "2026-10-02T00:00:00.000Z",
          payoutNote: null,
        },
      ],
    };
    const { default: AffiliatePayoutsPage } =
      await import("@/app/(main)/(dashboard)/affiliate/payouts/page");
    const page = text(renderToStaticMarkup(await AffiliatePayoutsPage()));

    expect(page).toContain("Note: PayPal account could not be verified");
    expect(page.match(/Note:/g)).toHaveLength(1);
  });
});

describe("paid AI actions", () => {
  it("S-199: a 402 for credits says Not enough credits and points at billing", () => {
    expect(
      describePaidActionError(new ApiRequestError("Not enough AI credits.", 402), "AI failed."),
    ).toEqual({ message: "Not enough credits.", buyCredits: true });
    expect(
      describePaidActionError(new ApiRequestError("Upstream timed out.", 504), "AI failed."),
    ).toEqual({ message: "Upstream timed out.", buyCredits: false });
  });

  it("S-198: an ATS 429 says when the allowance resets, from the quota in `details`", () => {
    const now = Date.parse("2026-10-26T10:00:00Z");
    const quota = {
      tier: "free",
      limit: 2,
      used: 2,
      remaining: 0,
      resetsAt: new Date(now + (5 * 60 + 12) * 60 * 1000).toISOString(),
    } as AtsQuota;
    const failure = describeAtsError(
      new ApiRequestError("ATS scan quota exceeded.", 429, quota),
      "ATS scan failed.",
      now,
    );

    expect(failure.message).toBe("ATS scan quota exceeded. Resets in 5h 12m.");
    expect(failure.quota).toBe(quota);
  });

  it("S-198: Scans left and the out-of-scans state say when the allowance comes back", async () => {
    const { ScansLeftMetric, outOfScansDetail } = await import("@/features/ats/AtsWorkspace");
    const now = Date.parse("2026-10-26T10:00:00Z");
    const quota = {
      tier: "free",
      limit: 2,
      used: 2,
      remaining: 0,
      resetsAt: new Date(now + (2 * 24 * 60 + 3 * 60) * 60 * 1000).toISOString(),
    } as AtsQuota;

    const metric = renderToStaticMarkup(<ScansLeftMetric quota={quota} now={now} />);

    expect(metric).toContain("0/2");
    expect(metric).toContain("Resets in 2d 3h");
    expect(outOfScansDetail(quota, now)).toBe("No scans left in this period. Resets in 2d 3h");
    expect(renderToStaticMarkup(<ScansLeftMetric quota={null} />)).not.toContain("Resets");
  });

  it("S-367: a guest's ATS tiles show a dash, not a load that never finishes", async () => {
    const { ScansLeftMetric, walletLabel } = await import("@/features/ats/AtsWorkspace");

    expect(renderToStaticMarkup(<ScansLeftMetric quota={null} signedIn={false} />)).toContain(
      ">—<",
    );
    expect(renderToStaticMarkup(<ScansLeftMetric quota={null} signedIn />)).toContain(">...<");
    expect(walletLabel(null, false)).toBe("—");
    expect(walletLabel(null, true)).toBe("...");
    expect(walletLabel("error", true)).toBe("Unavailable");
  });

  it("S-197: AI parse repair is offered only when the server says this account can use it", async () => {
    const { canOfferRepair } = await import("@/features/ats/AtsWorkspace");
    const quota = (canRepair: boolean, parseRepairCredits?: number) =>
      ({
        canRepair,
        pricing: {
          analysisCredits: { min: 4, max: 12 },
          jobUrlAnalysisCredits: { min: 6, max: 18 },
          resumeConversionCredits: 25,
          parseRepairCredits,
        },
      }) as AtsQuota;

    expect(canOfferRepair(quota(true, 5))).toBe(true);
    expect(canOfferRepair(quota(false, 5))).toBe(false);
    expect(canOfferRepair(quota(true))).toBe(false);
    expect(canOfferRepair(null)).toBe(false);
  });

  it("S-198: ats-api sends the uploaded file's name and size, keeps the extract quota and throws ApiRequestError", async () => {
    const quota = { tier: "free", limit: 2, used: 0, remaining: 2 } as AtsQuota;
    const fetchMock = vi.fn(async (url: string) =>
      String(url).endsWith("/ats/extract")
        ? new Response(JSON.stringify({ data: { text: "Jane", quota } }), { status: 200 })
        : new Response(JSON.stringify({ data: { quota } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const file = { name: "cv.pdf", size: 2048 } as File;
    vi.stubGlobal(
      "FormData",
      class {
        append() {}
      },
    );

    await expect(extractResumeFile(file)).resolves.toMatchObject({ text: "Jane", quota });
    await runAtsCheck({ resume: "Jane", file: { name: "cv.pdf", bytes: 2048 } });
    await runAtsAnalysis({
      resume: "Jane",
      fetchJobUrl: false,
      requestId: "req-12345678",
      file: { name: "cv.pdf", bytes: 2048 },
    });

    for (const call of fetchMock.mock.calls.slice(1)) {
      expect(JSON.parse((call as unknown as [string, RequestInit])[1].body as string).file).toEqual(
        {
          name: "cv.pdf",
          bytes: 2048,
        },
      );
    }

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "ATS upload quota exceeded.", details: quota }), {
        status: 429,
      }),
    );
    await expect(extractResumeFile(file)).rejects.toMatchObject({
      status: 429,
      details: quota,
    });
  });
});

describe("plan names and limits", () => {
  it("S-193 S-234: the document limit names what lifts it and says credit packs do not", () => {
    const message = freeLimitMessage("RESUME");

    expect(message).toMatch(/Creator Pro/);
    expect(message).toMatch(/AI Credits subscription/);
    expect(message).toMatch(/Bundle/);
    expect(message).toMatch(/pass/);
    expect(message).toMatch(/credit packs do not/i);
    expect(message).not.toMatch(/free plan/i);
  });

  it("S-272: a pass checkout is named as the pass, not as the bundle subscription", () => {
    const request = resolveCheckoutRequest({ productKey: "bundle", interval: "one_day" }, [
      {
        key: "bundle",
        name: "Job Hunter Bundle",
        entitlements: [],
        prices: { one_day: 299, seven_day: 599 },
        configuredIntervals: ["one_day", "seven_day"],
        currency: "USD",
      },
    ]);

    expect(request).toMatchObject({
      ok: true,
      productName: "3-Day Sprint pass",
      priceLabel: "$2.99 for 3 days",
    });
  });
});

describe("signed-in first paint (S-329)", () => {
  beforeEach(() => {
    // The store before `AuthInitializer` has run: what the server HTML and first paint see.
    useUserStore.setState({ user: null, isLoggedIn: false, loading: true });
  });

  function renderFirstPaint(initialUser: { id: string; email: string } | null) {
    return text(
      renderToStaticMarkup(
        <InitialUserContext value={initialUser as never}>
          <BillingPage billing={null} history={[]} />
        </InitialUserContext>,
      ),
    );
  }

  it("S-329: a signed-in user's billing page is not rendered behind the sign-in overlay", () => {
    expect(renderFirstPaint({ id: "u1", email: "jane@example.com" })).not.toContain(
      "Sign in to view subscriptions",
    );
  });

  it("S-329: a guest still gets the sign-in overlay", () => {
    expect(renderFirstPaint(null)).toContain("Sign in to view subscriptions");
  });
});

describe("accounts, ATS and programs (Phase 9 Part D)", () => {
  it("S-328 a conversion short of credits says how many it needs and how many there are", async () => {
    const { conversionUnavailableReason } = await import("@/features/ats/ats-api");
    const pricing = { resumeConversionCredits: 25 } as never;

    expect(conversionUnavailableReason(pricing, 10)).toBe("Needs 25 credits, you have 10.");
    expect(conversionUnavailableReason(undefined, 10)).toMatch(/unavailable right now/);
  });

  it("S-331 replacing the Master Profile from an import is announced and confirmed", async () => {
    const { REPLACE_MASTER_NOTICE } =
      await import("@/components/dashboard/modals/ImportProfileModal");
    // The modal renders through a portal, so its wiring is read from the source.
    const source = readFileSync(
      join(`${__dirname}/../..`, "components/dashboard/modals/ImportProfileModal.tsx"),
      "utf8",
    );

    expect(REPLACE_MASTER_NOTICE).toMatch(/cannot be undone/);
    expect(source).toContain('if (replaceMaster) setConfirmReplace("linkedin");');
    expect(source).toContain('if (replaceMaster) setConfirmReplace("github");');
    expect(source).toMatch(/<ConfirmDialog[\s\S]*description=\{REPLACE_MASTER_NOTICE\}/);
  });

  it("S-349 the account menu names a paying customer's plan, never Free", async () => {
    const { accessTierLabel } = await import("@/features/billing/checkout-rules");

    expect(accessTierLabel("credits")).toBe("Credits customer");
    expect(accessTierLabel("bundle")).toBe("Job Hunter Bundle");
    expect(accessTierLabel("free")).toBe("Free");
  });

  it("S-377 an abandoned checkout blocking deletion can be cancelled from the delete modal", async () => {
    const { releaseCheckoutBeforeDeletion } = await import("@/features/billing/billing-api");
    const answer = (data: unknown, status = 200) =>
      vi.fn(async () => new Response(JSON.stringify({ data }), { status }));

    vi.stubGlobal("fetch", answer({ success: true, cleared: ["portfolio_pro"] }));
    await expect(releaseCheckoutBeforeDeletion()).resolves.toBeNull();

    // A pack payment still moving is kept, and the customer is told why deletion still waits.
    vi.stubGlobal("fetch", answer({ success: true, stillProcessing: ["250 extra credits"] }));
    await expect(releaseCheckoutBeforeDeletion()).resolves.toMatch(/still being processed/);
    vi.unstubAllGlobals();

    const modal = readFileSync(
      join(studioRoot, "features/profile/components/DeleteAccountModal.tsx"),
      "utf8",
    );
    expect(modal).toContain('err.code === "CHECKOUT_IN_PROGRESS"');
    expect(modal).toContain("await releaseCheckoutBeforeDeletion()");
    expect(modal).toContain("Cancel the open checkout");
    // Deleting still needs the typed email: clearing the field after the 409 must not delete.
    const cancelPath = modal.slice(modal.indexOf("const cancelCheckoutThenDelete"));
    expect(cancelPath.slice(0, cancelPath.indexOf("releaseCheckoutBeforeDeletion"))).toContain(
      "if (!isConfirmed)",
    );
    expect(modal).toMatch(
      /disabled={!isConfirmed || isDeleting}s*onClick={() => void cancelCheckoutThenDelete()}/,
    );
  });

  it("S-409 the delete modal points to Restore a backup, not an editor's Import JSON", () => {
    const modal = readFileSync(
      join(studioRoot, "features/profile/components/DeleteAccountModal.tsx"),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(modal).toContain("Restore a backup");
    expect(modal).not.toMatch(/Import JSON restores/);
  });

  it("S-386 the account menu flags a failed payment, and only a failed payment", async () => {
    const { accountPaymentNotice } = await import("@/features/billing/checkout-rules");

    expect(accountPaymentNotice({ paymentIssue: true })).toBe("Payment failed · update card");
    expect(accountPaymentNotice({ paymentIssue: false })).toBeNull();
    expect(
      readFileSync(join(studioRoot, "components/dashboard/account-menu/AccountMenu.tsx"), "utf8"),
    ).toContain("accountPaymentNotice(billing.access)");
  });

  it("O7 LOW an approved ambassador who is also an admin is not 'under review'", async () => {
    const { isApprovedAmbassador } = await import("@/features/ambassador/types");

    expect(isApprovedAmbassador({ role: "ADMIN", ambassadorStatus: "APPROVED" } as never)).toBe(
      true,
    );
    expect(isApprovedAmbassador({ role: "USER", ambassadorStatus: "PENDING" } as never)).toBe(
      false,
    );
  });

  it("O6 LOW affiliate pages show readable statuses and are titled", async () => {
    const { commissionStatusLabel, referralStatusLabel } =
      await import("@/features/affiliate/labels");
    const payouts = await import("@/app/(main)/(dashboard)/affiliate/payouts/page");

    expect(commissionStatusLabel("AVAILABLE")).toBe("Available");
    expect(referralStatusLabel("SIGNED_UP")).toBe("Signed up");
    expect(payouts.metadata).toMatchObject({ title: "Affiliate payouts" });
  });
});

describe("GitHub import copy (owner decision A)", () => {
  it("the import tab says what a plan can import, and that one GitHub account is for good", async () => {
    const { githubImportNote, GITHUB_LINK_NOTICE } =
      await import("@/components/dashboard/modals/ImportProfileModal");

    expect(githubImportNote(false)).toBe(
      "Free accounts import from the GitHub account linked to them.",
    );
    expect(githubImportNote(true)).toBe("You can import any public GitHub profile by username.");
    expect(GITHUB_LINK_NOTICE).toBe(
      "You can link one GitHub account. It can't be changed or removed later.",
    );
    expect(
      readFileSync(
        join(`${__dirname}/../..`, "components/dashboard/modals/ImportProfileModal.tsx"),
        "utf8",
      ),
    ).not.toMatch(/must match/);
  });
});
