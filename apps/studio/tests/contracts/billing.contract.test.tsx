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
      passEndsAt: null,
      portfolioAccessEndsAt: null,
      aiCreditsEndsAt: null,
      creditBalance: 0,
    },
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
          expiresInDays: 90,
          configured: true,
        },
        {
          key: "credit_pack_500",
          name: "500 extra credits",
          credits: 500,
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
      `Payment failed — access ends ${serverDate(graceEndsAt)} — update your card`,
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
        access: { ...summary().access, tier: "portfolio_pro", isPaying: true },
      }),
    );

    expect(page).not.toContain("$5.99 / month");
    expect(page).not.toContain("AI Credits subscription");
    expect(page).toContain("Job Hunter Bundle");
    expect(page).toContain("Buy 250 credits");

    for (const tier of ["ai_credits", "bundle"] as const) {
      expect(
        renderBilling(summary({ access: { ...summary().access, tier, isPaying: true } })),
      ).not.toContain("$5.99 / month");
    }
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
        },
        { id: "e2", type: "payment.succeeded", processedAt: null, createdAt: inDays(-2) },
      ],
    );

    expect(page).toContain("Portfolio publishing");
    expect(page).toContain("SEO controls");
    expect(page).not.toMatch(/PORTFOLIO PUBLISH|portfolio_publish|SEO CONTROLS/);
    expect(page).toContain("Subscription started");
    expect(page).toContain("Payment received");
    expect(page).toContain(serverDate(inDays(-2)));
    expect(page).not.toMatch(/\block\b/i);
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
    expect(page).toContain("Adjustment");
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
        requestId: "annual-credit:sub_1:3",
        reason: "AI Credits monthly credits (month 3 of 12)",
      }),
      row({
        type: "GRANT",
        amount: 150,
        requestId: "subscription-credit:pay_1",
        reason: "Job Hunter Bundle credit allowance",
      }),
      row({
        type: "GRANT",
        amount: 1000,
        requestId: "subscription-credit:pay_2",
        reason: "AI Credits credit allowance",
      }),
      row({
        type: "GRANT",
        amount: 250,
        requestId: "payment-credit:pay_3",
        reason: "250 extra credits",
      }),
      row({
        type: "GRANT",
        amount: 40,
        requestId: "admin-credit:auto:abc:1",
        reason: "sorry about the outage, 40 credits",
      }),
    ]);

    expect(page).toContain("AI Credits annual plan credits, month 3 of 12");
    expect(page).toContain("Job Hunter Bundle or pass credits");
    expect(page).toContain("AI Credits plan credits");
    expect(page).toContain("250 extra credits");
    expect(page).toContain("Credits added by support");
    expect(page).not.toMatch(/outage|credit allowance|Credits added(?! by)/);
  });

  it("S-346: actions no screen offers are not priced", () => {
    const page = renderCredits([]);

    expect(page).not.toMatch(/job tailoring|document draft/i);
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
