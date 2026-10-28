import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL ||= "http://localhost:8080/api/v1";
});

import { ApiRequestError, fetchApiData } from "@/utils/fetchApiData";
import { finishSignIn, readReferralCode, rememberReferralCode } from "@/lib/sign-in";
import {
  describeCheckoutError,
  isPaymentsClosedError,
  PAYMENTS_OPEN_SOON,
  resolveCheckoutRequest,
} from "@/features/billing/checkout-rules";
import type { CatalogProduct } from "@/features/billing/types";
import { createLocalStorageMock } from "@/tests/utils/local-storage";

/**
 * The checkout 409s as the server builds them. `billingService.ts` opens Prisma, Redis and the
 * payment provider on import, so its builders are read from source (as `server-contract` reads
 * `ALLOWED_SCOPES`): a new code, a reworded lock message or a new placeholder fails here.
 */
const billingServiceSource = readFileSync(
  join(__dirname, "..", "..", "..", "server", "src", "services", "billingService.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

const SERVER_TEMPLATE_VALUES: Record<string, string> = {
  activeName: "Creator Pro",
  requestedName: "AI Credits",
  "PRODUCT_NAMES.ai_credits": "AI Credits",
  "PRODUCT_NAMES.portfolio_pro": "Creator Pro",
  "PRODUCT_NAMES.bundle": "Job Hunter Bundle",
  'paying.join(", ")': "AI Credits",
};

function fillServerTemplate(literal: string) {
  return literal.slice(1, -1).replace(/\$\{([^}]+)\}/g, (_, name: string) => {
    if (!(name in SERVER_TEMPLATE_VALUES)) throw new Error(`Unknown placeholder ${name}`);
    return SERVER_TEMPLATE_VALUES[name];
  });
}

function serverOverlapConflicts() {
  const body = billingServiceSource.match(/\nfunction checkoutOverlap\([\s\S]*?\n}\n/)?.[0];
  if (!body) throw new Error("checkoutOverlap not found in billingService.ts");

  return [
    ...body.matchAll(
      /new ApiError\(\s*409,\s*(`[^`]*`),\s*(\{\s*\.\.\.)?details\("([A-Z_]+)", (null|"[a-z_]+")\)(,\s*upgrade: \{ productKey: "bundle" as const)?/g,
    ),
  ].map(([, literal, , code, suggested, upgrade]) => {
    const suggestedProductKey = suggested === "null" ? null : suggested.slice(1, -1);

    return {
      code,
      suggestedProductKey,
      error: new ApiRequestError(fillServerTemplate(literal), 409, {
        code,
        activeProductKey: "portfolio_pro",
        suggestedProductKey,
        ...(upgrade ? { upgrade: { productKey: "bundle", interval: "annual" } } : {}),
      }),
    };
  });
}

/** The checkout lock as the server sends it: its message and `details` (V-198). */
function serverCheckoutLock() {
  const message = billingServiceSource.match(/const CHECKOUT_ACTIVE_MESSAGE =\s*"([^"]+)"/)?.[1];
  const code = billingServiceSource.match(
    /const CHECKOUT_IN_PROGRESS = \{ code: "([A-Z_]+)" \}/,
  )?.[1];
  if (!message || !code) throw new Error("the checkout lock was not found in billingService.ts");

  return new ApiRequestError(message, 409, { code });
}

/** The other checkout 409s, which carry no code: a payment in flight, not a lock to clear. */
function serverOtherCheckoutConflicts() {
  const messages = [
    ...billingServiceSource.matchAll(/new ApiError\(\s*409,\s*("[^"]*"|`[^`]*`),?\s*\)/g),
  ]
    .map(([, literal]) =>
      literal.startsWith("`") ? fillServerTemplate(literal) : literal.slice(1, -1),
    )
    .filter((message) => /checkout|payment for/i.test(message));

  // Coded 409s (the lock, CHECKOUT_STILL_PROCESSING) carry a third argument and are not listed.
  expect(messages.length).toBeGreaterThanOrEqual(1);
  return messages;
}

const ORIGINAL_FETCH = globalThis.fetch;

let fetchMock: ReturnType<typeof vi.fn>;
let replaceMock: ReturnType<typeof vi.fn>;

function respondWith(...responses: Array<[number, unknown]>) {
  const queue = [...responses];

  fetchMock = vi.fn(async () => {
    const [status, body] = queue.length > 1 ? queue.shift()! : queue[0];

    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
}

beforeEach(() => {
  replaceMock = vi.fn();
  vi.stubGlobal("localStorage", createLocalStorageMock());
  vi.stubGlobal("window", {
    location: { pathname: "/editor/resume/r1", search: "", replace: replaceMock },
  });
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("api request contract", () => {
  it("S-088: the server's message beats the caller's generic fallback", async () => {
    respondWith([409, { message: "Username is already taken" }]);

    await expect(
      fetchApiData("/users/me/username", {
        method: "PUT",
        body: "{}",
        errorMessage: "Failed to set username",
      }),
    ).rejects.toThrow("Username is already taken");

    respondWith([500, {}]);
    await expect(fetchApiData("/x", { errorMessage: "Failed to set username" })).rejects.toThrow(
      "Failed to set username",
    );
  });

  it("S-198: the error carries status, code and details", async () => {
    const details = { code: "ATS_QUOTA", resetsAt: "2026-11-01T00:00:00.000Z" };
    respondWith([429, { message: "ATS scan quota exceeded.", details }]);

    const error = await fetchApiData("/ats/scan").catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ status: 429, code: "ATS_QUOTA", details });
  });

  it("S-162: Content-Type is sent only with a body", async () => {
    respondWith([200, { data: {} }]);

    await fetchApiData("/billing/me");
    await fetchApiData("/users/me/sync", { method: "PUT", body: "{}" });

    const headersOf = (call: number) =>
      new Headers((fetchMock.mock.calls[call][1] as RequestInit).headers);

    expect(headersOf(0).has("content-type")).toBe(false);
    expect(headersOf(1).get("content-type")).toBe("application/json");
  });

  it("S-150: after an invalid session the call never settles, so no 'Request failed: 401' toast races the redirect", async () => {
    respondWith([401, { message: "Unauthorized" }], [200, {}]);

    const outcome = await Promise.race([
      fetchApiData("/documents").then(
        () => "resolved",
        () => "rejected",
      ),
      new Promise((resolve) => setTimeout(() => resolve("pending"), 50)),
    ]);

    expect(outcome).toBe("pending");
    expect(replaceMock).toHaveBeenCalledWith(
      `/login?callbackURL=${encodeURIComponent("/editor/resume/r1")}`,
    );
  });

  it("S-136: finishing a sign-in never forces auto-sync on or writes the sync preference", async () => {
    respondWith([200, { data: {} }]);
    localStorage.setItem(
      "veriworkly:workspace-settings",
      JSON.stringify({ autoSyncEnabled: false }),
    );

    await finishSignIn();

    const syncWrites = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/users/me/sync"),
    );
    expect(syncWrites).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem("veriworkly:workspace-settings")!)).toEqual({
      autoSyncEnabled: false,
    });
  });

  it("S-244 S-257: a referral code survives guest mode for 30 days and is applied once after sign-in", async () => {
    const clickedAt = new Date("2026-10-01T00:00:00.000Z");
    rememberReferralCode("FRIEND", clickedAt);

    expect(readReferralCode(new Date("2026-11-15T00:00:00.000Z"))).toBeNull();

    rememberReferralCode("FRIEND", clickedAt);
    respondWith([200, { data: {} }]);

    await finishSignIn(new Date("2026-10-20T00:00:00.000Z"));

    const referralCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith("/affiliates/referral"),
    );
    expect(referralCalls).toHaveLength(1);
    expect(JSON.parse((referralCalls[0][1] as RequestInit).body as string)).toEqual({
      code: "FRIEND",
    });
    expect(readReferralCode()).toBeNull();
  });

  it("S-257: a referral the server refuses is reported, not swallowed, and not retried", async () => {
    rememberReferralCode("OLD");
    respondWith([400, { message: "Referral codes can only be applied to new accounts." }]);

    await expect(finishSignIn()).resolves.toEqual({
      referralError: "Referral codes can only be applied to new accounts.",
    });
    expect(readReferralCode()).toBeNull();
  });

  it("launch cut: the payments-closed 403 is told apart from every other failure", () => {
    const closed = new ApiRequestError(
      "Payments are disabled in production during this phase.",
      403,
    );

    expect(isPaymentsClosedError(closed)).toBe(true);
    expect(describeCheckoutError(closed, "x")).toEqual({
      kind: "payments-closed",
      message: PAYMENTS_OPEN_SOON,
    });
    expect(isPaymentsClosedError(serverCheckoutLock())).toBe(false);
  });

  it("S-230 S-275: every overlap 409 the server builds is branched on its code, never offered as a checkout to cancel", () => {
    const conflicts = serverOverlapConflicts();
    const kinds: Record<string, string> = {
      ALREADY_SUBSCRIBED: "already-have",
      ALREADY_INCLUDED: "already-have",
      SUBSCRIPTION_OVERLAP: "overlap",
      UPGRADE_AVAILABLE: "upgrade",
      PAYMENT_OUTSTANDING: "manage-billing",
      SUBSCRIPTION_PAUSED: "manage-billing",
    };

    expect(new Set(conflicts.map((conflict) => conflict.code))).toEqual(
      new Set(Object.keys(kinds)),
    );

    for (const conflict of conflicts) {
      const failure = describeCheckoutError(conflict.error, "Could not start checkout.");

      expect(failure.kind, conflict.code).toBe(kinds[conflict.code]);
      expect(failure.message).toBe(conflict.error.message);
      if (failure.kind === "overlap") {
        expect(failure.suggestedProductKey).toBe(conflict.suggestedProductKey);
      }
      if (failure.kind === "upgrade") {
        expect(failure.upgrade).toEqual({ productKey: "bundle", interval: "annual" });
      }
    }
    expect(conflicts.some((conflict) => conflict.suggestedProductKey === "bundle")).toBe(true);
  });

  it("S-275 V-198: the checkout lock is recognised by its code, not its wording", () => {
    const lock = serverCheckoutLock();

    expect(describeCheckoutError(lock, "x").kind).toBe("checkout-locked");
    expect(
      describeCheckoutError(new ApiRequestError(lock.message, 409, { code: "OTHER" }), "x").kind,
    ).toBe("other");
    expect(describeCheckoutError(new ApiRequestError(lock.message, 409), "x").kind).toBe("other");

    for (const message of serverOtherCheckoutConflicts()) {
      expect(describeCheckoutError(new ApiRequestError(message, 409), "x"), message).toEqual({
        kind: "other",
        message,
      });
    }
  });

  it("S-232 S-270: /checkout refuses a missing or unknown product or interval and names what it sells", () => {
    const catalog: CatalogProduct[] = [
      {
        key: "ai_credits",
        name: "AI Credits",
        entitlements: [],
        prices: { monthly: 599, annual: 5990 },
        configuredIntervals: ["monthly", "annual"],
        currency: "USD",
      },
    ];

    expect(resolveCheckoutRequest({}, catalog).ok).toBe(false);
    expect(resolveCheckoutRequest({ productKey: "bundle", interval: "annual" }, catalog).ok).toBe(
      false,
    );
    expect(resolveCheckoutRequest({ productKey: "ai_credits" }, catalog).ok).toBe(false);
    expect(
      resolveCheckoutRequest({ productKey: "ai_credits", interval: "one_day" }, catalog).ok,
    ).toBe(false);
    expect(
      resolveCheckoutRequest({ productKey: "ai_credits", interval: "toString" }, catalog).ok,
    ).toBe(false);
    expect(
      resolveCheckoutRequest({ productKey: "ai_credits", interval: "monthly" }, catalog),
    ).toEqual({
      ok: true,
      productKey: "ai_credits",
      interval: "monthly",
      productName: "AI Credits",
      priceLabel: "$5.99 per month",
    });
  });
});
