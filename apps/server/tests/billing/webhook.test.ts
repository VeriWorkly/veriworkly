import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { affiliateMock, creditMock } = vi.hoisted(() => ({
  affiliateMock: { createCommission: vi.fn() },
  creditMock: { grant: vi.fn(), getWallet: vi.fn() },
}));

const prismaMock = {
  billingWebhookEvent: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  subscription: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
  },
  entitlementGrant: {
    updateMany: vi.fn(),
    upsert: vi.fn(),
    findFirst: vi.fn(),
  },
  user: {
    update: vi.fn(),
  },
  portfolioPublication: {
    updateMany: vi.fn(),
    findUnique: vi.fn(),
  },
  $transaction: vi.fn((cb) => cb(prismaMock)),
};

vi.mock("../../src/utils/prisma", () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

vi.mock("../../src/utils/portfolioPublicationCache", () => ({
  invalidatePublicPortfolioCaches: vi.fn().mockResolvedValue(undefined),
  revalidatePublicPortfolios: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/utils/redis", () => ({
  cacheDel: vi.fn().mockResolvedValue(undefined),
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
  getRedis: vi.fn(),
}));

vi.mock("../../src/services/affiliateService", () => ({
  AffiliateService: affiliateMock,
}));

vi.mock("../../src/services/creditService", () => ({
  CreditService: creditMock,
}));

vi.mock("../../src/config", () => ({
  config: {
    portfolio: {
      graceDays: 7,
    },
    dodo: {
      webhookSecret: "secret",
      sevenDayProductId: "prod_seven_day",
      monthlyProductId: "prod_monthly",
      annualProductId: "prod_annual",
    },
    nodeEnv: "test",
  },
}));

describe("billing webhook processing and idempotency", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    prismaMock.billingWebhookEvent.create.mockReset();
    prismaMock.billingWebhookEvent.findUnique.mockReset();
    prismaMock.billingWebhookEvent.update.mockReset();
    prismaMock.billingWebhookEvent.update.mockResolvedValue({ retryCount: 0 });
    prismaMock.subscription.findUnique.mockReset();
    prismaMock.subscription.updateMany.mockReset();
    prismaMock.subscription.create.mockReset();
    prismaMock.entitlementGrant.updateMany.mockReset();
    prismaMock.entitlementGrant.upsert.mockReset();
    prismaMock.entitlementGrant.findFirst.mockReset();
    prismaMock.entitlementGrant.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.entitlementGrant.upsert.mockResolvedValue({});
    prismaMock.entitlementGrant.findFirst.mockResolvedValue({ endsAt: null });
    prismaMock.user.update.mockReset();
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
    const { BillingService } = await import("../../src/services/billingService");

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
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user_123" },
      data: {
        portfolioPlan: "PORTFOLIO_PRO",
        portfolioCanPublish: true,
        portfolioAccessEndsAt: null,
      },
    });
    expect(prismaMock.billingWebhookEvent.update).toHaveBeenCalledWith({
      where: { id: "evt_1" },
      data: { status: "PROCESSED", processedAt: expect.any(Date) },
    });
  });

  it("handles retry for FAILED event, increments retryCount, and attempts reprocessing", async () => {
    const { BillingService } = await import("../../src/services/billingService");

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

    // Mock updating retry parameters
    prismaMock.billingWebhookEvent.update.mockResolvedValue({
      id: "evt_1",
      status: "PROCESSING",
      retryCount: 2,
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
    expect(prismaMock.billingWebhookEvent.update).toHaveBeenCalledWith({
      where: { id: "evt_1" },
      data: {
        status: "PROCESSING",
        retryCount: { increment: 1 },
        lastAttemptAt: expect.any(Date),
      },
    });
  });

  it("returns duplicate: true and skips processing if existing event is PROCESSED", async () => {
    const { BillingService } = await import("../../src/services/billingService");

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
    const { BillingService } = await import("../../src/services/billingService");

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
  });

  it("rejects active subscriptions for unknown products", async () => {
    const { BillingService } = await import("../../src/services/billingService");

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
    const { BillingService } = await import("../../src/services/billingService");

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
    const { BillingService } = await import("../../src/services/billingService");
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
    affiliateMock.createCommission.mockResolvedValue({ id: "commission_1" });

    await BillingService.processWebhook("evt_paid", {
      type: "payment.succeeded",
      timestamp: "2026-06-11T12:00:00.000Z",
      data: {
        payment_id: "payment_123",
        subscription_id: "sub_123",
        settlement_amount: 999,
        settlement_currency: "USD",
        metadata: { veriworkly_user_id: "user_123" },
      },
    });

    expect(affiliateMock.createCommission).toHaveBeenCalledWith({
      referredUserId: "user_123",
      subscriptionId: "sub_123",
      providerPaymentId: "payment_123",
      purchaseAmountCents: 999,
      status: "PENDING",
      reason: "Dodo payment succeeded",
    });
  });
});
