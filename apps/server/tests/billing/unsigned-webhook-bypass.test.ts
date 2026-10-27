import { beforeEach, describe, expect, it, vi } from "vitest";

// V-138: with no webhook secret the server used to accept unsigned JSON whenever NODE_ENV was
// "development", which compose defaulted to. The bypass must now need an explicit opt-in, a
// non-production environment, and a loopback caller, all three.

const { configMock } = vi.hoisted(() => ({
  configMock: {
    nodeEnv: "development",
    portfolio: { graceDays: 7 },
    dodo: { webhookSecret: "" },
    apiKeys: {
      hashSecret: "test-api-key-secret",
      authCacheTtlSeconds: 300,
      lastUsedTouchIntervalSeconds: 300,
      defaultRateLimit: 20,
      defaultScopes: ["user:read"],
      defaultKeyLifetimeDays: 365,
    },
  },
}));

vi.mock("#config", () => ({
  config: configMock,
  get isProduction() {
    return configMock.nodeEnv === "production";
  },
}));
vi.mock("#lib/prisma", () => ({ prisma: {}, default: {} }));
vi.mock("#lib/redis", () => ({
  cacheDel: vi.fn(),
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  getRedis: vi.fn(),
}));
vi.mock("#utils/portfolioPublicationCache", () => ({
  invalidatePublicPortfolioCaches: vi.fn(),
  revalidatePublicPortfolios: vi.fn(),
}));
vi.mock("#services/affiliate/index", () => ({ AffiliateService: {} }));
vi.mock("#services/creditService", () => ({ CreditService: {} }));
vi.mock("#services/apiKeyService", () => ({ ApiKeyService: {} }));
// billingService imports the deleted-account check from userService, which pulls in better-auth.
vi.mock("#services/userService", () => ({ isDeletedAccount: vi.fn().mockResolvedValue(false) }));
vi.mock("#services/mail/billingMail", () => ({}));

import { ApiError } from "#lib/errors";
import { BillingService } from "#services/billingService";

const body = JSON.stringify({ type: "payment.succeeded", data: {} });
const headers = { "webhook-id": "evt_1" };

function expectRefused(remote?: string) {
  let caught: unknown;
  try {
    BillingService.unwrapWebhook(body, headers, remote);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(ApiError);
  expect((caught as ApiError).statusCode).toBe(503);
}

describe("unsigned webhook bypass (V-138)", () => {
  beforeEach(() => {
    configMock.nodeEnv = "development";
    configMock.dodo.webhookSecret = "";
    vi.stubEnv("ALLOW_UNSIGNED_WEBHOOKS", undefined);
  });

  it("refuses an unsigned webhook in development when the opt-in flag is absent", () => {
    expectRefused("127.0.0.1");
  });

  it("refuses an unsigned webhook from a non-loopback caller even with the flag", () => {
    vi.stubEnv("ALLOW_UNSIGNED_WEBHOOKS", "1");
    expectRefused("10.0.0.5");
    expectRefused("::ffff:172.18.0.1");
    expectRefused(undefined);
  });

  it("refuses an unsigned webhook in production even with the flag from loopback", () => {
    vi.stubEnv("ALLOW_UNSIGNED_WEBHOOKS", "1");
    configMock.nodeEnv = "production";
    expectRefused("127.0.0.1");
  });

  it("accepts an unsigned webhook only with the flag, outside production, from loopback", () => {
    vi.stubEnv("ALLOW_UNSIGNED_WEBHOOKS", "1");
    expect(BillingService.unwrapWebhook(body, headers, "127.0.0.1")).toEqual(JSON.parse(body));
    expect(BillingService.unwrapWebhook(body, headers, "::1")).toEqual(JSON.parse(body));
    expect(BillingService.unwrapWebhook(body, headers, "::ffff:127.0.0.1")).toEqual(
      JSON.parse(body),
    );
  });

  it("reports a malformed body as 400 inside the bypass", () => {
    vi.stubEnv("ALLOW_UNSIGNED_WEBHOOKS", "1");
    expect(() => BillingService.unwrapWebhook("{not json", headers, "127.0.0.1")).toThrowError(
      /Invalid JSON body/,
    );
  });
});
