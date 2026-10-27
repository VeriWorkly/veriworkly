import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * V-125: one open checkout session per (user, product), remembered until the provider settles
 * it. A second click returns the same session instead of opening a second one that could also be
 * paid; the webhook consumes the record; cancel only clears a session the provider says is not
 * being paid.
 */

const { dodoMock, loggerMock } = vi.hoisted(() => ({
  dodoMock: { create: vi.fn(), retrieve: vi.fn(), clientOptions: [] as unknown[] },
  loggerMock: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

/** A tiny Redis: enough of SET NX/EX, GET, DEL and the compare-and-delete script. */
const store = new Map<string, { value: string; ttl?: number }>();
const mockRedis = {
  set: vi.fn(
    async (key: string, value: string, options?: { NX?: boolean; EX?: number; PX?: number }) => {
      if (options?.NX && store.has(key)) return null;
      store.set(key, { value, ttl: options?.EX ?? (options?.PX ? options.PX / 1000 : undefined) });
      return "OK";
    },
  ),
  get: vi.fn(async (key: string) => store.get(key)?.value ?? null),
  del: vi.fn(async (keys: string | string[]) => {
    let removed = 0;
    for (const key of Array.isArray(keys) ? keys : [keys]) if (store.delete(key)) removed += 1;
    return removed;
  }),
  eval: vi.fn(
    async (script: string, { keys, arguments: args }: { keys: string[]; arguments: string[] }) => {
      if (store.get(keys[0]!)?.value !== args[0]) return 0;
      // Compare-and-set (the open record replacing our claim) or compare-and-delete.
      if (script.includes('redis.call("set"'))
        store.set(keys[0]!, { value: args[1]!, ttl: Number(args[2]) });
      else store.delete(keys[0]!);
      return 1;
    },
  ),
};

const prismaMock = {
  user: { findUnique: vi.fn() },
  subscription: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  entitlementGrant: { updateMany: vi.fn(), upsert: vi.fn(), findFirst: vi.fn() },
  portfolioPublication: { updateMany: vi.fn(), findUnique: vi.fn() },
  billingWebhookEvent: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  affiliateReferral: { findUnique: vi.fn() },
  $executeRaw: vi.fn().mockResolvedValue(1),
  $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(prismaMock)),
};

vi.mock("#lib/prisma", () => ({ prisma: prismaMock, default: prismaMock }));
vi.mock("#lib/logger", () => ({ logger: loggerMock }));
vi.mock("#lib/redis", () => ({
  cacheDel: vi.fn().mockResolvedValue(undefined),
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
  getRedis: vi.fn(() => mockRedis),
}));
vi.mock("#utils/portfolioPublicationCache", () => ({
  invalidatePublicPortfolioCaches: vi.fn().mockResolvedValue(undefined),
  revalidatePublicPortfolios: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("#services/affiliate/index", () => ({ AffiliateService: { createCommission: vi.fn() } }));
vi.mock("#services/creditService", () => ({
  CreditService: { grant: vi.fn(), getWallet: vi.fn() },
}));
// billingService imports the deleted-account check from userService, which pulls in better-auth.
vi.mock("#services/userService", () => ({ isDeletedAccount: vi.fn().mockResolvedValue(false) }));
vi.mock("#services/mail/billingMail", () => ({
  sendPurchaseConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
  sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("dodopayments", () => ({
  default: class {
    checkoutSessions = { create: dodoMock.create, retrieve: dodoMock.retrieve };
    constructor(options: unknown) {
      dodoMock.clientOptions.push(options);
    }
  },
}));
vi.mock("#config", () => ({
  config: {
    nodeEnv: "test",
    portfolio: { graceDays: 7 },
    dodo: {
      apiKey: "key",
      webhookSecret: "secret",
      environment: "test_mode",
      portfolioProMonthlyProductId: "prod_monthly",
      portfolioProAnnualProductId: "prod_annual",
      bundleMonthlyProductId: "prod_bundle_monthly",
      bundleAnnualProductId: "prod_bundle_annual",
      bundleOneDayProductId: "prod_bundle_one_day",
      bundleSevenDayProductId: "prod_bundle_seven_day",
      aiCreditsMonthlyProductId: "prod_ai_monthly",
      aiCreditsAnnualProductId: "prod_ai_annual",
      checkoutReturnUrl: "http://localhost:3001/billing?checkout=complete",
      checkoutCancelUrl: "http://localhost:3001/billing?checkout=cancelled",
    },
  },
}));

const { BillingService } = await import("../../src/services/billingService.js");

const USER = "user_123";
/** The user's one checkout record (V-218). */
const key = () => `billing:checkout:${USER}`;
/** A per-product record written before V-218, still read until it expires. */
const legacyKey = (product: string) => `billing:checkout:${USER}:${product}`;

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
  dodoMock.clientOptions.length = 0;
  prismaMock.user.findUnique.mockResolvedValue({ id: USER, email: "u@example.test", name: "U" });
  prismaMock.subscription.findFirst.mockResolvedValue(null);
  prismaMock.subscription.findMany.mockResolvedValue([]);
  prismaMock.subscription.count.mockResolvedValue(0);
  let n = 0;
  dodoMock.create.mockImplementation(async () => {
    n += 1;
    return { session_id: `cks_${n}`, checkout_url: `https://pay.example/${n}` };
  });
});

describe("createCheckout idempotency per user (V-125, V-218)", () => {
  it("returns the same session for a repeated checkout of one product and interval, with one provider call", async () => {
    const first = await BillingService.createCheckout(USER, "portfolio_pro", "monthly");
    const second = await BillingService.createCheckout(USER, "portfolio_pro", "monthly");

    expect(first.url).toBe("https://pay.example/1");
    expect(second.url).toBe("https://pay.example/1");
    expect(dodoMock.create).toHaveBeenCalledTimes(1);
  });

  it("remembers the session, with its product, for as long as the provider keeps it payable", async () => {
    await BillingService.createCheckout(USER, "portfolio_pro", "monthly");

    const record = store.get(key());
    expect(record).toBeTruthy();
    expect(JSON.parse(record!.value)).toMatchObject({
      sessionId: "cks_1",
      url: "https://pay.example/1",
      productKey: "portfolio_pro",
      interval: "monthly",
    });
    expect(record!.ttl).toBe(24 * 60 * 60);
  });

  it("refuses a different interval while a session for the product is open", async () => {
    await BillingService.createCheckout(USER, "portfolio_pro", "monthly");

    await expect(
      BillingService.createCheckout(USER, "portfolio_pro", "annual"),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("checkout is already active"),
    });
    expect(dodoMock.create).toHaveBeenCalledTimes(1);
  });

  it("V-198: every checkout-lock 409 carries CHECKOUT_IN_PROGRESS, apart from the overlap codes", async () => {
    await BillingService.createCheckout(USER, "portfolio_pro", "monthly");

    // The same product at another interval while its session is open.
    await expect(
      BillingService.createCheckout(USER, "portfolio_pro", "annual"),
    ).rejects.toMatchObject({ statusCode: 409, details: { code: "CHECKOUT_IN_PROGRESS" } });
    // An overlapping product (the bundle contains Creator Pro) while that session is open.
    await expect(BillingService.createCheckout(USER, "bundle", "monthly")).rejects.toMatchObject({
      statusCode: 409,
      details: { code: "CHECKOUT_IN_PROGRESS" },
    });

    // A session still being prepared by a concurrent click that never finishes.
    store.clear();
    store.set(key(), { value: JSON.stringify({ state: "claimed", token: "t" }) });
    vi.useFakeTimers();
    try {
      const pending = BillingService.createCheckout(USER, "ai_credits", "monthly");
      const settled = expect(pending).rejects.toMatchObject({
        statusCode: 409,
        details: { code: "CHECKOUT_IN_PROGRESS" },
      });
      await vi.runAllTimersAsync();
      await settled;
    } finally {
      vi.useRealTimers();
    }
  });

  it("refuses any second product while one checkout is open (V-218)", async () => {
    await BillingService.createCheckout(USER, "bundle", "monthly");
    await expect(
      BillingService.createCheckout(USER, "portfolio_pro", "monthly"),
    ).rejects.toMatchObject({
      statusCode: 409,
    });

    store.clear();
    await BillingService.createCheckout(USER, "ai_credits", "monthly");
    await expect(BillingService.createCheckout(USER, "bundle", "annual")).rejects.toMatchObject({
      statusCode: 409,
    });
    // Two single products are the bundle at a higher price (V-176): one checkout at a time.
    await expect(
      BillingService.createCheckout(USER, "portfolio_pro", "monthly"),
    ).rejects.toMatchObject({ statusCode: 409, details: { code: "CHECKOUT_IN_PROGRESS" } });
    expect(dodoMock.create).toHaveBeenCalledTimes(2);
  });

  it("still honours a per-product record written before V-218", async () => {
    store.set(legacyKey("portfolio_pro"), {
      value: JSON.stringify({
        state: "open",
        sessionId: "cks_old",
        url: "https://pay.example/old",
        interval: "monthly",
        createdAt: new Date().toISOString(),
      }),
    });

    await expect(BillingService.createCheckout(USER, "portfolio_pro", "monthly")).resolves.toEqual({
      url: "https://pay.example/old",
      reused: true,
    });
    await expect(
      BillingService.createCheckout(USER, "ai_credits", "monthly"),
    ).rejects.toMatchObject({
      statusCode: 409,
      details: { code: "CHECKOUT_IN_PROGRESS" },
    });
    expect(dodoMock.create).not.toHaveBeenCalled();
  });

  it("releases its claim with compare-and-delete when the provider call fails", async () => {
    dodoMock.create.mockRejectedValueOnce(new Error("provider down"));

    await expect(BillingService.createCheckout(USER, "portfolio_pro", "monthly")).rejects.toThrow(
      "provider down",
    );
    expect(store.has(key())).toBe(false);
    expect(mockRedis.del).not.toHaveBeenCalled();
    expect(mockRedis.eval).toHaveBeenCalledWith(expect.stringContaining('redis.call("get"'), {
      keys: [key()],
      arguments: [expect.any(String)],
    });

    // And the next attempt opens a session of its own.
    await expect(
      BillingService.createCheckout(USER, "portfolio_pro", "monthly"),
    ).resolves.toMatchObject({
      reused: false,
    });
    expect(dodoMock.create).toHaveBeenCalledTimes(2);
  });

  it("a concurrent second click waits for the first session instead of opening another", async () => {
    let release!: (value: { session_id: string; checkout_url: string }) => void;
    dodoMock.create.mockImplementationOnce(() => new Promise((resolve) => (release = resolve)));

    const first = BillingService.createCheckout(USER, "portfolio_pro", "monthly");
    await new Promise((resolve) => setTimeout(resolve, 10));
    const second = BillingService.createCheckout(USER, "portfolio_pro", "monthly");
    await new Promise((resolve) => setTimeout(resolve, 50));
    release({ session_id: "cks_slow", checkout_url: "https://pay.example/slow" });

    expect((await first).url).toBe("https://pay.example/slow");
    expect((await second).url).toBe("https://pay.example/slow");
    expect(dodoMock.create).toHaveBeenCalledTimes(1);
  });

  it("a provider call that outlives its claim does not overwrite the session a later click opened", async () => {
    let release!: (value: { session_id: string; checkout_url: string }) => void;
    dodoMock.create.mockImplementationOnce(() => new Promise((resolve) => (release = resolve)));

    const first = BillingService.createCheckout(USER, "portfolio_pro", "monthly");
    await new Promise((resolve) => setTimeout(resolve, 10));
    // The claim TTL runs out while the provider stalls; a second click claims and opens session 2.
    store.delete(key());
    const second = await BillingService.createCheckout(USER, "portfolio_pro", "monthly");
    expect(second).toMatchObject({ url: "https://pay.example/1", reused: false });

    release({ session_id: "cks_stalled", checkout_url: "https://pay.example/stalled" });

    await expect(first).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("checkout is already active"),
    });
    // Session 2 stays the tracked one; session 1's URL was never handed out.
    expect(JSON.parse(store.get(key())!.value)).toMatchObject({
      sessionId: "cks_1",
      url: "https://pay.example/1",
    });
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.stringContaining("claim lost"),
      expect.objectContaining({ sessionId: "cks_stalled" }),
    );
  });

  it("bounds the provider call so it finishes inside the claim TTL, without retrying the create", async () => {
    await BillingService.createCheckout(USER, "portfolio_pro", "monthly");

    const options = dodoMock.clientOptions.at(-1) as { timeout?: number; maxRetries?: number };
    expect(options.maxRetries).toBe(0);
    expect(options.timeout).toBeGreaterThan(0);
    // Every attempt (one, no retries) ends well before the 60 s claim expires.
    expect(options.timeout! * (options.maxRetries! + 1)).toBeLessThanOrEqual(30_000);
  });
});

describe("cancelCheckout", () => {
  it("keeps a session the provider reports as paying or paid, clears one that is not", async () => {
    await BillingService.createCheckout(USER, "portfolio_pro", "monthly");

    dodoMock.retrieve.mockResolvedValueOnce({ id: "cks_1", payment_status: "processing" });
    await expect(BillingService.cancelCheckout(USER)).rejects.toMatchObject({ statusCode: 409 });
    expect(store.has(key())).toBe(true);

    dodoMock.retrieve.mockResolvedValueOnce({ id: "cks_1", payment_status: null });
    await expect(BillingService.cancelCheckout(USER)).resolves.toMatchObject({
      success: true,
      cleared: ["portfolio_pro"],
    });
    expect(store.has(key())).toBe(false);
    expect(mockRedis.del).not.toHaveBeenCalled();
  });

  it("refuses to clear when the provider cannot be asked", async () => {
    await BillingService.createCheckout(USER, "portfolio_pro", "monthly");
    dodoMock.retrieve.mockRejectedValueOnce(new Error("timeout"));

    await expect(BillingService.cancelCheckout(USER)).rejects.toMatchObject({ statusCode: 503 });
    expect(store.has(key())).toBe(true);
  });

  it("is a no-op success with nothing open", async () => {
    await expect(BillingService.cancelCheckout(USER)).resolves.toEqual({
      success: true,
      cleared: [],
    });
    expect(dodoMock.retrieve).not.toHaveBeenCalled();
  });
});

describe("the webhook settles the checkout record", () => {
  const event = (status: string, subscriptionId = "sub_1") => ({
    type: `subscription.${status}`,
    timestamp: "2026-05-31T12:00:00.000Z",
    data: {
      subscription_id: subscriptionId,
      customer: { customer_id: "cust_1" },
      product_id: "prod_monthly",
      status,
      cancel_at_next_billing_date: false,
      metadata: { veriworkly_user_id: USER },
    },
  });

  beforeEach(() => {
    prismaMock.billingWebhookEvent.create.mockResolvedValue({
      id: "evt_row",
      status: "PROCESSING",
      retryCount: 0,
    });
    prismaMock.billingWebhookEvent.update.mockResolvedValue({ retryCount: 0 });
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    prismaMock.subscription.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.subscription.create.mockResolvedValue({});
    prismaMock.entitlementGrant.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.entitlementGrant.upsert.mockResolvedValue({});
    prismaMock.entitlementGrant.findFirst.mockResolvedValue(null);
    prismaMock.portfolioPublication.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.portfolioPublication.findUnique.mockResolvedValue(null);
    prismaMock.affiliateReferral.findUnique.mockResolvedValue(null);
  });

  it("a subscription event for the product consumes the record", async () => {
    await BillingService.createCheckout(USER, "portfolio_pro", "monthly");
    expect(store.has(key())).toBe(true);

    await BillingService.processWebhook("evt_consume", event("active"));

    expect(store.has(key())).toBe(false);
    // The lock for the event itself was taken with a token and a renewable PX TTL (V-127).
    expect(mockRedis.set).toHaveBeenCalledWith(
      "billing:webhook:lock:evt_consume",
      expect.any(String),
      { NX: true, PX: 60_000 },
    );
  });

  it("a late cancel for an older subscription leaves the newer open checkout alone", async () => {
    await BillingService.createCheckout(USER, "portfolio_pro", "monthly");
    const late = event("cancelled", "sub_old");
    const createdAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    await BillingService.processWebhook("evt_late_cancel", {
      ...late,
      data: { ...late.data, created_at: createdAt },
    });

    expect(store.has(key())).toBe(true);
  });

  it("a subscription created after the checkout opened consumes it", async () => {
    await BillingService.createCheckout(USER, "portfolio_pro", "monthly");
    const active = event("active", "sub_new");

    await BillingService.processWebhook("evt_new_active", {
      ...active,
      data: { ...active.data, created_at: new Date(Date.now() + 1_000).toISOString() },
    });

    expect(store.has(key())).toBe(false);
  });

  it("a payment settles the record only when it names that checkout session", async () => {
    await BillingService.createCheckout(USER, "portfolio_pro", "monthly");
    const payment = (id: string, checkoutSessionId: string) => ({
      type: "payment.succeeded",
      timestamp: "2026-05-31T12:00:00.000Z",
      data: {
        payment_id: id,
        subscription_id: null,
        product_id: "prod_monthly",
        total_amount: 900,
        settlement_amount: 900,
        settlement_currency: "USD",
        checkout_session_id: checkoutSessionId,
        metadata: { veriworkly_user_id: USER, veriworkly_product: "portfolio_pro" },
      },
    });

    await BillingService.processWebhook("evt_pay_other", payment("pay_other", "cks_other"));
    expect(store.has(key())).toBe(true);

    await BillingService.processWebhook("evt_pay_own", payment("pay_own", "cks_1"));
    expect(store.has(key())).toBe(false);
  });

  it("alerts when a user ends up with a second live subscription, whatever its product (V-218)", async () => {
    prismaMock.subscription.findMany.mockResolvedValue([
      { providerSubId: "sub_1", productKey: "ai_credits", status: "ACTIVE" },
    ]);

    await BillingService.processWebhook("evt_double", event("active", "sub_2"));

    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.stringContaining("more than one live subscription"),
      expect.objectContaining({ userId: USER, productKey: "portfolio_pro" }),
    );
    expect(prismaMock.subscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: USER, providerSubId: { not: "sub_2" } }),
      }),
    );
  });
});
