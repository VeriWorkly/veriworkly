import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { affiliateMock, creditMock, apiKeyServiceMock, billingMailMock, loggerMock } = vi.hoisted(
  () => ({
    loggerMock: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    affiliateMock: { createCommission: vi.fn() },
    creditMock: { grant: vi.fn(), getWallet: vi.fn() },
    apiKeyServiceMock: { invalidateAuthCacheForUser: vi.fn().mockResolvedValue(undefined) },
    billingMailMock: {
      sendPurchaseConfirmationEmail: vi.fn().mockResolvedValue(undefined),
      sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
      sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
    },
  }),
);

vi.mock("#lib/logger", () => ({ logger: loggerMock }));

const prismaMock = {
  billingWebhookEvent: {
    create: vi.fn(),
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  subscription: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
  },
  entitlementGrant: {
    updateMany: vi.fn(),
    upsert: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  user: {
    update: vi.fn(),
    findUnique: vi.fn().mockResolvedValue(null),
  },
  portfolioPublication: {
    updateMany: vi.fn(),
    findUnique: vi.fn(),
  },
  affiliateReferral: {
    findUnique: vi.fn(),
  },
  // The subscription's earlier credit grants a renewal supersedes (no annual schedules here).
  subscriptionCreditSchedule: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  $executeRaw: vi.fn().mockResolvedValue(1),
  $queryRaw: vi.fn().mockResolvedValue([]),
  $transaction: vi.fn((cb) => cb(prismaMock)),
};

vi.mock("#lib/prisma", () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

// Every user here exists; the deleted-account path (V-183) is covered by the integration suite.
vi.mock("#services/deletedAccount", () => ({
  isDeletedAccount: vi.fn(async () => false),
  redactIfForDeletedAccount: vi.fn(async () => undefined),
}));

vi.mock("#utils/portfolioPublicationCache", () => ({
  invalidatePublicPortfolioCaches: vi.fn().mockResolvedValue(undefined),
  revalidatePublicPortfolios: vi.fn().mockResolvedValue(undefined),
}));

const mockRedis = {
  set: vi.fn().mockResolvedValue("OK"),
  del: vi.fn().mockResolvedValue(1),
  eval: vi.fn().mockResolvedValue(1),
};

vi.mock("#lib/redis", () => ({
  cacheDel: vi.fn().mockResolvedValue(undefined),
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
  getRedis: vi.fn(() => mockRedis),
  // Answers in time: the late-write path is covered in tests/redis and the callers' own tests.
  redisWrite: vi.fn((run: (redis: typeof mockRedis) => Promise<unknown>) => run(mockRedis)),
}));

vi.mock("#services/affiliate/index", () => ({
  AffiliateService: affiliateMock,
}));

vi.mock("#services/creditService", () => ({
  CreditService: creditMock,
}));

vi.mock("#services/apiKeyService", () => ({
  ApiKeyService: apiKeyServiceMock,
}));

// billingService imports the deleted-account check from userService, which pulls in better-auth.
vi.mock("#services/userService", () => ({ isDeletedAccount: vi.fn().mockResolvedValue(false) }));
vi.mock("#services/mail/billingMail", () => billingMailMock);

vi.mock("#config", () => ({
  config: {
    portfolio: {
      graceDays: 7,
    },
    dodo: {
      webhookSecret: "secret",
      portfolioProMonthlyProductId: "prod_monthly",
      portfolioProAnnualProductId: "prod_annual",
      aiCreditsMonthlyProductId: "prod_ai_monthly",
      aiCreditsAnnualProductId: "prod_ai_annual",
      bundleMonthlyProductId: "prod_bundle_monthly",
      bundleAnnualProductId: "prod_bundle_annual",
      bundleOneDayProductId: "prod_bundle_one_day",
      bundleSevenDayProductId: "prod_bundle_seven_day",
      creditPack250ProductId: "prod_pack_250",
      creditPack500ProductId: "prod_pack_500",
      creditPack1200ProductId: "prod_pack_1200",
    },
    apiKeys: {
      hashSecret: "test-api-key-secret",
      authCacheTtlSeconds: 300,
      lastUsedTouchIntervalSeconds: 300,
      defaultRateLimit: 20,
      defaultScopes: ["user:read"],
      defaultKeyLifetimeDays: 365,
    },
    nodeEnv: "test",
  },
}));

describe("billing webhook processing and idempotency", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockRedis.set.mockReset().mockResolvedValue("OK");
    mockRedis.del.mockReset().mockResolvedValue(1);
    mockRedis.eval.mockReset().mockResolvedValue(1);
    prismaMock.affiliateReferral.findUnique.mockReset().mockResolvedValue(null);
    prismaMock.$executeRaw.mockReset().mockResolvedValue(1);
    apiKeyServiceMock.invalidateAuthCacheForUser.mockReset().mockResolvedValue(undefined);
    billingMailMock.sendPurchaseConfirmationEmail.mockReset().mockResolvedValue(undefined);
    billingMailMock.sendSubscriptionCancelledEmail.mockReset().mockResolvedValue(undefined);
    prismaMock.billingWebhookEvent.create.mockReset();
    prismaMock.billingWebhookEvent.findUnique.mockReset();
    prismaMock.billingWebhookEvent.update.mockReset();
    prismaMock.billingWebhookEvent.update.mockResolvedValue({ retryCount: 0 });
    prismaMock.billingWebhookEvent.updateMany.mockReset().mockResolvedValue({ count: 1 });
    prismaMock.subscription.findUnique.mockReset();
    prismaMock.subscription.updateMany.mockReset();
    prismaMock.subscription.create.mockReset();
    prismaMock.subscription.count.mockReset().mockResolvedValue(0);
    prismaMock.subscription.findMany.mockReset().mockResolvedValue([]);
    prismaMock.entitlementGrant.findMany.mockReset().mockResolvedValue([]);
    prismaMock.entitlementGrant.create.mockReset().mockResolvedValue({});
    loggerMock.warn.mockReset();
    loggerMock.error.mockReset();
    prismaMock.entitlementGrant.updateMany.mockReset();
    prismaMock.entitlementGrant.upsert.mockReset();
    prismaMock.entitlementGrant.findFirst.mockReset();
    prismaMock.entitlementGrant.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.entitlementGrant.upsert.mockResolvedValue({});
    prismaMock.entitlementGrant.findFirst.mockResolvedValue({ endsAt: null });
    prismaMock.user.update.mockReset();
    prismaMock.user.findUnique.mockReset().mockResolvedValue(null);
    prismaMock.portfolioPublication.updateMany.mockReset();
    prismaMock.portfolioPublication.findUnique.mockReset();
    affiliateMock.createCommission.mockReset();
    creditMock.grant.mockReset();
  });

  const validEvent = {
    type: "subscription.created",
    timestamp: "2026-05-31T12:00:00.000Z",
    data: {
      subscription_id: "sub_123",
      customer: {
        customer_id: "cust_123",
      },
      product_id: "prod_monthly",
      status: "active",
      cancel_at_next_billing_date: false,
      metadata: {
        veriworkly_user_id: "user_123",
      },
    },
  };

  it("successfully processes and marks webhook as PROCESSED", async () => {
    const { BillingService } = await import("../../src/services/billingService.js");

    prismaMock.billingWebhookEvent.create.mockResolvedValue({
      id: "evt_1",
      status: "PROCESSING",
      retryCount: 0,
    });
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    prismaMock.subscription.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.portfolioPublication.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.portfolioPublication.findUnique.mockResolvedValue({ subdomain: "my-portfolio" });
    prismaMock.user.update.mockResolvedValue({ id: "user_123" });

    const result = await BillingService.processWebhook("evt_123", validEvent);

    expect(result).toEqual({ duplicate: false });
    expect(prismaMock.billingWebhookEvent.create).toHaveBeenCalled();
    expect(prismaMock.billingWebhookEvent.update).toHaveBeenCalledWith({
      where: { id: "evt_1" },
      data: { status: "PROCESSED", processedAt: expect.any(Date) },
    });
  });

  it("handles retry for FAILED event, increments retryCount, and attempts reprocessing", async () => {
    const { BillingService } = await import("../../src/services/billingService.js");

    // First, simulate P2002 duplicate key violation on create
    const prismaError = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
      code: "P2002",
      clientVersion: "x.y.z",
    });
    prismaMock.billingWebhookEvent.create.mockRejectedValue(prismaError);

    // Mock finding the existing failed event
    prismaMock.billingWebhookEvent.findUnique.mockResolvedValue({
      id: "evt_1",
      providerEventId: "evt_123",
      status: "FAILED",
      retryCount: 1,
    });

    prismaMock.subscription.findUnique.mockResolvedValue(null);
    prismaMock.subscription.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.portfolioPublication.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.portfolioPublication.findUnique.mockResolvedValue({ subdomain: "my-portfolio" });
    prismaMock.user.update.mockResolvedValue({ id: "user_123" });

    const result = await BillingService.processWebhook("evt_123", validEvent);

    expect(result).toEqual({ duplicate: false });
    expect(prismaMock.billingWebhookEvent.findUnique).toHaveBeenCalledWith({
      where: { providerEventId: "evt_123" },
    });
    // Claimed by a conditional update (V-014): only while no live attempt holds the row.
    expect(prismaMock.billingWebhookEvent.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: "evt_1", status: { not: "PROCESSED" } }),
      data: {
        status: "PROCESSING",
        retryCount: { increment: 1 },
        lastAttemptAt: expect.any(Date),
      },
    });
  });

  it("still processes the event when the Redis lock cannot be taken (V-014)", async () => {
    const { BillingService } = await import("../../src/services/billingService.js");

    mockRedis.set.mockRejectedValue(new Error("Redis is not ready"));
    prismaMock.billingWebhookEvent.create.mockResolvedValue({
      id: "evt_1",
      status: "PROCESSING",
      retryCount: 0,
    });
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    prismaMock.subscription.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.portfolioPublication.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.portfolioPublication.findUnique.mockResolvedValue(null);

    await expect(BillingService.processWebhook("evt_no_redis", validEvent)).resolves.toEqual({
      duplicate: false,
    });
    expect(prismaMock.billingWebhookEvent.update).toHaveBeenCalledWith({
      where: { id: "evt_1" },
      data: { status: "PROCESSED", processedAt: expect.any(Date) },
    });
  });

  it("answers 503 when another attempt claimed the retried row first (V-014)", async () => {
    const { BillingService } = await import("../../src/services/billingService.js");

    prismaMock.billingWebhookEvent.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "x.y.z",
      }),
    );
    prismaMock.billingWebhookEvent.findUnique
      .mockResolvedValueOnce({ id: "evt_1", providerEventId: "evt_123", status: "FAILED" })
      .mockResolvedValueOnce({ status: "PROCESSING" });
    prismaMock.billingWebhookEvent.updateMany.mockResolvedValue({ count: 0 });

    await expect(BillingService.processWebhook("evt_123", validEvent)).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(prismaMock.subscription.updateMany).not.toHaveBeenCalled();
  });

  it("returns duplicate: true and skips processing if existing event is PROCESSED", async () => {
    const { BillingService } = await import("../../src/services/billingService.js");

    const prismaError = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
      code: "P2002",
      clientVersion: "x.y.z",
    });
    prismaMock.billingWebhookEvent.create.mockRejectedValue(prismaError);

    prismaMock.billingWebhookEvent.findUnique.mockResolvedValue({
      id: "evt_1",
      providerEventId: "evt_123",
      status: "PROCESSED",
      retryCount: 1,
    });

    const result = await BillingService.processWebhook("evt_123", validEvent);

    expect(result).toEqual({ duplicate: true });
    expect(prismaMock.subscription.updateMany).not.toHaveBeenCalled();
  });

  it("ignores older events and does not overwrite newer subscription state in DB", async () => {
    const { BillingService } = await import("../../src/services/billingService.js");

    // Existing subscription lastWebhookAt is T2 (newer)
    prismaMock.subscription.findUnique.mockResolvedValue({
      id: "sub_1",
      providerSubId: "sub_123",
      userId: "user_123",
      lastWebhookAt: new Date("2026-05-31T13:00:00.000Z"),
    });

    prismaMock.billingWebhookEvent.create.mockResolvedValue({
      id: "evt_1",
      status: "PROCESSING",
      retryCount: 0,
    });

    // Try processing an event with timestamp T1 (older: 12:00:00 vs 13:00:00)
    const result = await BillingService.processWebhook("evt_123", validEvent);

    expect(result).toEqual({ duplicate: false });
    // Since existing subscription lastWebhookAt is newer, updateMany/create should not be called inside transaction
    expect(prismaMock.subscription.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.subscription.create).not.toHaveBeenCalled();

    // V-013: a stale or retried event skips the DB mutation only; the post-commit invalidation
    // still runs so a retry after a failed invalidation repairs the caches.
    const { cacheDel } = await import("#lib/redis");
    expect(cacheDel).toHaveBeenCalledWith("billing:summary:user_123");
    // V-140: key validity no longer depends on billing, so billing never touches the key cache.
    expect(apiKeyServiceMock.invalidateAuthCacheForUser).not.toHaveBeenCalled();
  });

  it("applies a distinct event that shares the row's lastWebhookAt timestamp (V-013)", async () => {
    const { BillingService } = await import("../../src/services/billingService.js");

    prismaMock.subscription.findUnique.mockResolvedValue({
      id: "sub_1",
      providerSubId: "sub_123",
      userId: "user_123",
      status: "ACTIVE",
      lastWebhookAt: new Date("2026-05-31T12:00:00.000Z"),
    });
    prismaMock.billingWebhookEvent.create.mockResolvedValue({
      id: "evt_1",
      status: "PROCESSING",
      retryCount: 0,
    });
    prismaMock.subscription.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.portfolioPublication.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.portfolioPublication.findUnique.mockResolvedValue(null);

    await BillingService.processWebhook("evt_same_ts", {
      ...validEvent,
      type: "subscription.updated",
      data: { ...validEvent.data, cancel_at_next_billing_date: true },
    });

    expect(prismaMock.subscription.updateMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.subscription.updateMany.mock.calls[0][0].where.OR).toEqual([
      { lastWebhookAt: null },
      { lastWebhookAt: { lte: new Date("2026-05-31T12:00:00.000Z") } },
    ]);
    expect(prismaMock.subscription.updateMany.mock.calls[0][0].data.cancelAtPeriodEnd).toBe(true);
  });

  it("takes a token-checked, renewable 60 s lock and releases it by compare-and-delete (V-014, V-127)", async () => {
    const { BillingService } = await import("../../src/services/billingService.js");

    prismaMock.billingWebhookEvent.create.mockResolvedValue({
      id: "evt_1",
      status: "PROCESSING",
      retryCount: 0,
    });
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    prismaMock.subscription.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.portfolioPublication.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.portfolioPublication.findUnique.mockResolvedValue(null);

    await BillingService.processWebhook("evt_lock", validEvent);

    expect(mockRedis.set).toHaveBeenCalledWith(
      "billing:webhook:lock:evt_lock",
      expect.any(String),
      { NX: true, PX: 60_000 },
    );
    const token = mockRedis.set.mock.calls[0][1];
    expect(token).not.toBe("1");
    expect(mockRedis.del).not.toHaveBeenCalledWith("billing:webhook:lock:evt_lock");
    expect(mockRedis.eval).toHaveBeenCalledWith(expect.stringContaining('redis.call("get"'), {
      keys: ["billing:webhook:lock:evt_lock"],
      arguments: [token],
    });
  });

  it("treats a PROCESSING row younger than the lock TTL as in flight (V-014)", async () => {
    const { BillingService } = await import("../../src/services/billingService.js");

    const prismaError = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
      code: "P2002",
      clientVersion: "x.y.z",
    });
    prismaMock.billingWebhookEvent.create.mockRejectedValue(prismaError);
    prismaMock.billingWebhookEvent.findUnique.mockResolvedValue({
      id: "evt_1",
      providerEventId: "evt_123",
      status: "PROCESSING",
      retryCount: 0,
      lastAttemptAt: new Date(Date.now() - 5_000),
    });
    // The conditional claim matches no row: the live attempt still holds it.
    prismaMock.billingWebhookEvent.updateMany.mockResolvedValue({ count: 0 });

    await expect(BillingService.processWebhook("evt_123", validEvent)).rejects.toMatchObject({
      statusCode: 503,
    });

    expect(prismaMock.billingWebhookEvent.update).not.toHaveBeenCalled();
    expect(prismaMock.subscription.updateMany).not.toHaveBeenCalled();
  });

  it("takes the per-user advisory lock first inside the billing transaction (V-120)", async () => {
    const { BillingService } = await import("../../src/services/billingService.js");

    prismaMock.billingWebhookEvent.create.mockResolvedValue({
      id: "evt_1",
      status: "PROCESSING",
      retryCount: 0,
    });
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    prismaMock.subscription.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.portfolioPublication.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.portfolioPublication.findUnique.mockResolvedValue(null);

    await BillingService.processWebhook("evt_advisory", validEvent);

    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
    const lockOrder = prismaMock.$executeRaw.mock.invocationCallOrder[0];
    expect(lockOrder).toBeLessThan(prismaMock.subscription.updateMany.mock.invocationCallOrder[0]);
    expect(prismaMock.$executeRaw.mock.calls[0][0].join("?")).toContain(
      "pg_advisory_xact_lock(hashtext(?))",
    );
    expect(prismaMock.$executeRaw.mock.calls[0][1]).toBe("user_123");
  });

  it("rejects active subscriptions for unknown products", async () => {
    const { BillingService } = await import("../../src/services/billingService.js");

    prismaMock.billingWebhookEvent.create.mockResolvedValue({
      id: "evt_1",
      status: "PROCESSING",
      retryCount: 0,
    });
    prismaMock.subscription.findUnique.mockResolvedValue(null);

    await expect(
      BillingService.processWebhook("evt_unknown_product", {
        ...validEvent,
        data: { ...validEvent.data, product_id: "prod_unknown" },
      }),
    ).rejects.toThrow("unknown product");

    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("rejects webhook metadata that conflicts with the subscription owner", async () => {
    const { BillingService } = await import("../../src/services/billingService.js");

    prismaMock.billingWebhookEvent.create.mockResolvedValue({
      id: "evt_1",
      status: "PROCESSING",
      retryCount: 0,
    });
    prismaMock.subscription.findUnique.mockResolvedValue({
      id: "sub_1",
      providerSubId: "sub_123",
      userId: "different_user",
      lastWebhookAt: null,
    });

    await expect(BillingService.processWebhook("evt_wrong_owner", validEvent)).rejects.toThrow(
      "does not match its owner",
    );

    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("creates affiliate commission only when a paid payment event succeeds", async () => {
    const { BillingService } = await import("../../src/services/billingService.js");
    prismaMock.billingWebhookEvent.create.mockResolvedValue({
      id: "evt_payment",
      status: "PROCESSING",
      retryCount: 0,
    });
    prismaMock.subscription.findUnique.mockResolvedValue({
      userId: "user_123",
      productKey: "portfolio_pro",
      interval: "MONTHLY",
      currentPeriodEnd: new Date("2026-07-01T00:00:00.000Z"),
    });
    prismaMock.affiliateReferral.findUnique.mockResolvedValue({
      affiliate: { affiliateTier: "TIER_1", affiliateStatus: "ACTIVE" },
    });
    affiliateMock.createCommission.mockResolvedValue({ id: "commission_1" });

    await BillingService.processWebhook("evt_paid", {
      type: "payment.succeeded",
      timestamp: "2026-06-11T12:00:00.000Z",
      data: {
        payment_id: "payment_123",
        subscription_id: "sub_123",
        total_amount: 1_099,
        settlement_amount: 1_099,
        settlement_tax: 100,
        settlement_currency: "USD",
        metadata: { veriworkly_user_id: "user_123" },
      },
    });

    // V-017: the base is the settlement net of tax; V-017 (T3 half): the settlement currency
    // travels with it.
    expect(affiliateMock.createCommission).toHaveBeenCalledWith({
      referredUserId: "user_123",
      subscriptionId: "sub_123",
      providerPaymentId: "payment_123",
      purchaseAmountCents: 999,
      status: "PENDING",
      reason: "Dodo payment succeeded",
      currency: "USD",
    });
  });

  it("skips a sub-cent commission and still processes the payment (V-143)", async () => {
    const { BillingService } = await import("../../src/services/billingService.js");
    prismaMock.billingWebhookEvent.create.mockResolvedValue({
      id: "evt_payment",
      status: "PROCESSING",
      retryCount: 0,
    });
    prismaMock.subscription.findUnique.mockResolvedValue({
      userId: "user_123",
      productKey: "portfolio_pro",
      interval: "MONTHLY",
      currentPeriodEnd: new Date("2026-07-01T00:00:00.000Z"),
    });
    prismaMock.affiliateReferral.findUnique.mockResolvedValue({
      affiliate: { affiliateTier: "TIER_1", affiliateStatus: "ACTIVE" },
    });

    const result = await BillingService.processWebhook("evt_tiny", {
      type: "payment.succeeded",
      timestamp: "2026-06-11T12:00:00.000Z",
      data: {
        payment_id: "payment_tiny",
        subscription_id: "sub_123",
        total_amount: 40,
        settlement_amount: 40,
        settlement_currency: "USD",
        metadata: { veriworkly_user_id: "user_123" },
      },
    });

    expect(result).toEqual({ duplicate: false });
    expect(affiliateMock.createCommission).not.toHaveBeenCalled();
    expect(prismaMock.billingWebhookEvent.update).toHaveBeenCalledWith({
      where: { id: "evt_payment" },
      data: { status: "PROCESSED", processedAt: expect.any(Date) },
    });
  });

  it("fails a payment event with no user and grants nothing (V-012)", async () => {
    const { BillingService } = await import("../../src/services/billingService.js");
    prismaMock.billingWebhookEvent.create.mockResolvedValue({
      id: "evt_payment",
      status: "PROCESSING",
      retryCount: 0,
    });

    await expect(
      BillingService.processWebhook("evt_orphan", {
        type: "payment.succeeded",
        timestamp: "2026-06-11T12:00:00.000Z",
        data: {
          payment_id: "payment_orphan",
          total_amount: 599,
          settlement_amount: 599,
          settlement_currency: "USD",
          metadata: {},
        },
      }),
    ).rejects.toThrow("missing VeriWorkly user metadata");

    expect(creditMock.grant).not.toHaveBeenCalled();
    expect(prismaMock.billingWebhookEvent.update).toHaveBeenCalledWith({
      where: { id: "evt_payment" },
      data: { status: "FAILED", error: expect.stringContaining("user metadata") },
    });
  });

  /**
   * V-154: the payment and status paths the original seven cases never exercised. Timestamps are
   * fixed so interval arithmetic is exact.
   */
  describe("payment.succeeded grants (V-154)", () => {
    const PAID_AT = "2026-06-11T12:00:00.000Z";
    const DAY_MS = 24 * 60 * 60 * 1000;

    function payment(data: Record<string, unknown>) {
      return {
        type: "payment.succeeded",
        timestamp: PAID_AT,
        data: {
          payment_id: "pay_1",
          total_amount: 599,
          settlement_amount: 599,
          settlement_currency: "USD",
          metadata: { veriworkly_user_id: "user_123" },
          ...data,
        },
      };
    }

    beforeEach(() => {
      prismaMock.billingWebhookEvent.create.mockResolvedValue({
        id: "evt_pay",
        status: "PROCESSING",
        retryCount: 0,
      });
      prismaMock.portfolioPublication.findUnique.mockResolvedValue(null);
      creditMock.grant.mockResolvedValue({ id: "tx_1" });
    });

    it("expires a renewal allowance one interval after the payment when the stored period end is stale", async () => {
      const { BillingService } = await import("../../src/services/billingService.js");
      prismaMock.subscription.findUnique.mockResolvedValue({
        userId: "user_123",
        productKey: "ai_credits",
        interval: "MONTHLY",
        // The period that just ended: payment.succeeded arrived before subscription.renewed.
        currentPeriodEnd: new Date("2026-06-11T11:00:00.000Z"),
      });

      await BillingService.processWebhook(
        "evt_stale_period",
        payment({ subscription_id: "sub_ai" }),
      );

      expect(creditMock.grant).toHaveBeenCalledWith(
        "user_123",
        1_000,
        expect.objectContaining({
          requestId: "subscription-credit:pay_1",
          source: "subscription_payment",
          // Keyed under the subscription, so the next month's grant can replace it.
          sourceId: "sub_ai:payment:pay_1",
          expiresAt: new Date("2026-07-11T12:00:00.000Z"),
          supersedes: expect.objectContaining({
            where: {
              OR: [
                {
                  source: "subscription_payment",
                  sourceId: { startsWith: "sub_ai:" },
                  // Never a legacy annual up-front allowance (12,000).
                  amount: { lte: 1_000 },
                },
              ],
            },
          }),
        }),
      );
    });

    it("keeps the stored period end when it lies beyond one interval", async () => {
      const { BillingService } = await import("../../src/services/billingService.js");
      const periodEnd = new Date("2027-06-11T12:00:00.000Z");
      prismaMock.subscription.findUnique.mockResolvedValue({
        userId: "user_123",
        productKey: "ai_credits",
        interval: "MONTHLY",
        currentPeriodEnd: periodEnd,
      });

      await BillingService.processWebhook("evt_far_period", payment({ subscription_id: "sub_ai" }));

      expect(creditMock.grant.mock.calls[0][2].expiresAt).toEqual(periodEnd);
    });

    it.each([
      { productId: "prod_bundle_seven_day", days: 7, credits: 400, interval: "seven_day" },
      { productId: "prod_bundle_one_day", days: 3, credits: 150, interval: "one_day" },
    ])(
      "a one-time bundle pass ($productId) grants the bundle entitlements for $days days and $credits credits",
      async ({ productId, days, credits, interval }) => {
        const { BillingService } = await import("../../src/services/billingService.js");
        const endsAt = new Date(new Date(PAID_AT).getTime() + days * DAY_MS);

        await BillingService.processWebhook(
          `evt_pass_${interval}`,
          payment({ product_cart: [{ product_id: productId, quantity: 1 }] }),
        );

        // Every bundle entitlement, SYSTEM-sourced on the payment id, flagged as a pass.

        const { productCatalog } = await import("../../src/services/productCatalog.js");
        expect(prismaMock.entitlementGrant.create).toHaveBeenCalledTimes(
          productCatalog.bundle.entitlements.length,
        );
        for (const [args] of prismaMock.entitlementGrant.create.mock.calls) {
          expect(args.data).toMatchObject({
            userId: "user_123",
            source: "SYSTEM",
            sourceId: "pay_1",
            startsAt: new Date(PAID_AT),
            endsAt,
            metadata: { productKey: "bundle", interval, pass: true },
          });
        }
        // The payment lock (V-273) and the per-user billing lock.
        expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(2);
        expect(creditMock.grant).toHaveBeenCalledWith(
          "user_123",
          credits,
          expect.objectContaining({ requestId: "subscription-credit:pay_1", expiresAt: endsAt }),
        );
      },
    );

    it("a credit pack grants the pack for 90 days and touches no entitlement", async () => {
      const { BillingService } = await import("../../src/services/billingService.js");

      await BillingService.processWebhook(
        "evt_pack",
        payment({
          // A one-time payment carries its product (V-274: metadata alone never names a pack).
          product_cart: [{ product_id: "prod_pack_250", quantity: 1 }],
          metadata: { veriworkly_user_id: "user_123", veriworkly_product: "credit_pack_250" },
        }),
      );

      expect(creditMock.grant).toHaveBeenCalledWith("user_123", 250, {
        requestId: "payment-credit:pay_1",
        source: "credit_pack",
        sourceId: "pay_1",
        expiresAt: new Date(new Date(PAID_AT).getTime() + 90 * DAY_MS),
        reason: "250 extra credits",
      });
      expect(prismaMock.entitlementGrant.upsert).not.toHaveBeenCalled();
    });

    it.each([
      { label: "an update-payment-method charge", data: { is_update_payment_method: true } },
      { label: "a zero-amount charge", data: { total_amount: 0, settlement_amount: 0 } },
    ])("$label earns no allowance", async ({ data }) => {
      const { BillingService } = await import("../../src/services/billingService.js");
      prismaMock.subscription.findUnique.mockResolvedValue({
        userId: "user_123",
        productKey: "ai_credits",
        interval: "MONTHLY",
        currentPeriodEnd: new Date("2026-07-11T12:00:00.000Z"),
      });

      const result = await BillingService.processWebhook(
        "evt_no_allowance",
        payment({ subscription_id: "sub_ai", ...data }),
      );

      expect(result).toEqual({ duplicate: false });
      expect(creditMock.grant).not.toHaveBeenCalled();
    });

    it("skips a usage-only renewal and keys a real renewal's grant on its service period", async () => {
      const { BillingService } = await import("../../src/services/billingService.js");
      prismaMock.subscription.findUnique.mockResolvedValue({
        userId: "user_123",
        productKey: "ai_credits",
        interval: "MONTHLY",
        currentPeriodEnd: null,
      });

      await BillingService.processWebhook(
        "evt_usage_only",
        payment({
          subscription_id: "sub_ai",
          service_periods: [{ subscription_id: "sub_other", starts_at: "x", ends_at: "y" }],
        }),
      );
      expect(creditMock.grant).not.toHaveBeenCalled();

      await BillingService.processWebhook(
        "evt_period",
        payment({
          subscription_id: "sub_ai",
          service_periods: [{ subscription_id: "sub_ai", starts_at: PAID_AT, ends_at: "y" }],
        }),
      );
      expect(creditMock.grant).toHaveBeenCalledWith(
        "user_123",
        1_000,
        expect.objectContaining({ sourceId: `sub_ai:${PAID_AT}` }),
      );
    });

    it("a non-USD settlement still grants, warns, and records the commission in its currency", async () => {
      const { BillingService } = await import("../../src/services/billingService.js");
      prismaMock.subscription.findUnique.mockResolvedValue({
        userId: "user_123",
        productKey: "ai_credits",
        interval: "MONTHLY",
        currentPeriodEnd: null,
      });
      prismaMock.affiliateReferral.findUnique.mockResolvedValue({
        affiliate: { affiliateTier: "TIER_1", affiliateStatus: "ACTIVE" },
      });
      affiliateMock.createCommission.mockResolvedValue({ id: "c_1" });

      await BillingService.processWebhook(
        "evt_inr",
        payment({
          subscription_id: "sub_ai",
          settlement_amount: 50_000,
          settlement_currency: "inr",
          currency: "INR",
          tax: 5_000,
        }),
      );

      expect(creditMock.grant).toHaveBeenCalledTimes(1);
      expect(loggerMock.warn).toHaveBeenCalledWith(
        expect.stringContaining("settled in INR"),
        expect.objectContaining({ settlementCurrency: "INR" }),
      );
      expect(affiliateMock.createCommission).toHaveBeenCalledWith(
        expect.objectContaining({ purchaseAmountCents: 45_000, currency: "INR" }),
      );
    });
  });

  describe("subscription status table (V-154)", () => {
    const AT = "2026-05-31T12:00:00.000Z";
    const GRACE_END = new Date(new Date(AT).getTime() + 7 * 24 * 60 * 60 * 1000);

    function event(status: string) {
      return {
        type: `subscription.${status}`,
        timestamp: AT,
        data: {
          subscription_id: "sub_table",
          customer: { customer_id: "cust_1" },
          product_id: "prod_monthly",
          status,
          cancel_at_next_billing_date: false,
          // In the future relative to the clock: access (and so the grants) depends on it.
          next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: { veriworkly_user_id: "user_123" },
        },
      };
    }

    beforeEach(() => {
      prismaMock.billingWebhookEvent.create.mockResolvedValue({
        id: "evt_row",
        status: "PROCESSING",
        retryCount: 0,
      });
      prismaMock.subscription.findUnique.mockResolvedValue(null);
      prismaMock.subscription.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.portfolioPublication.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.portfolioPublication.findUnique.mockResolvedValue(null);
    });

    it.each([
      { status: "active", stored: "ACTIVE", grace: null, granted: true },
      { status: "on_hold", stored: "PAST_DUE", grace: GRACE_END, granted: false },
      { status: "past_due", stored: "PAST_DUE", grace: GRACE_END, granted: false },
      { status: "paused", stored: "PAST_DUE", grace: GRACE_END, granted: false },
      { status: "failed", stored: "INACTIVE", grace: null, granted: false },
      { status: "cancelled", stored: "CANCELED", grace: null, granted: true },
      { status: "expired", stored: "CANCELED", grace: null, granted: true },
    ])("$status is stored as $stored", async ({ status, stored, grace, granted }) => {
      const { BillingService } = await import("../../src/services/billingService.js");
      const { productCatalog } = await import("../../src/services/productCatalog.js");
      const grants = granted ? productCatalog.portfolio_pro.entitlements.length : 0;

      await BillingService.processWebhook(`evt_${status}`, event(status));

      const written = prismaMock.subscription.updateMany.mock.calls[0][0].data;
      expect(written).toMatchObject({ status: stored, rawStatus: status, graceEndsAt: grace });
      // Every non-pending status first revokes the subscription's grants, then re-grants the
      // Creator Pro entitlements while access runs (active, or cancelled inside the period).
      expect(prismaMock.entitlementGrant.updateMany).toHaveBeenCalledTimes(1);
      expect(prismaMock.entitlementGrant.upsert).toHaveBeenCalledTimes(grants);
    });

    it("pending is stored INACTIVE and leaves existing grants alone", async () => {
      const { BillingService } = await import("../../src/services/billingService.js");

      await BillingService.processWebhook("evt_pending", event("pending"));

      expect(prismaMock.subscription.updateMany.mock.calls[0][0].data).toMatchObject({
        status: "INACTIVE",
        graceEndsAt: null,
      });
      expect(prismaMock.entitlementGrant.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.entitlementGrant.upsert).not.toHaveBeenCalled();
    });

    it("a status outside the table fails the event instead of revoking access", async () => {
      const { BillingService } = await import("../../src/services/billingService.js");

      await expect(BillingService.processWebhook("evt_odd", event("mystery"))).rejects.toThrow(
        'Unknown subscription status "mystery"',
      );

      expect(prismaMock.subscription.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.billingWebhookEvent.update).toHaveBeenCalledWith({
        where: { id: "evt_row" },
        data: { status: "FAILED", error: expect.stringContaining("mystery") },
      });
    });
  });
});
