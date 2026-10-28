import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, number>();

const redis = {
  get: vi.fn(async (key: string) => (store.has(key) ? String(store.get(key)) : null)),
  ttl: vi.fn(async () => 3600),
  eval: vi.fn(async (script: string, opts: { keys: string[]; arguments: string[] }) => {
    const [key] = opts.keys;
    if (script.includes("DECR")) {
      const current = store.get(key) ?? 0;
      if (current > 0) store.set(key, current - 1);
      return Math.max(0, current - 1);
    }
    const limit = Number(opts.arguments[0]);
    const current = store.get(key) ?? 0;
    if (current >= limit) return -1;
    const next = current + 1;
    store.set(key, next);
    return next;
  }),
};

class RedisTimeoutError extends Error {}
/** Scripted like lib/redis: by default the command answers in time. */
const redisWrite = vi.fn(
  async (
    run: (client: typeof redis) => Promise<unknown>,
    _undo: (late: unknown) => Promise<unknown>,
  ) => run(redis),
);
vi.mock("#lib/redis", () => ({ getRedis: () => redis, redisWrite, RedisTimeoutError }));
vi.mock("#config", () => ({
  config: { auth: { secret: "test-secret" } },
}));
/** The active `ai_credits` grant the paid period anchors on; none by default (free tier). */
const findActiveGrant = vi.fn(async (): Promise<{ createdAt: Date } | null> => null);
/** An active grant someone paid for (a subscription's or a pass's); none by default. */
const findPurchasedGrant = vi.fn(async (): Promise<{ id: string } | null> => null);
/** A paused subscription of the caller's; none by default. */
const findPausedSubscription = vi.fn(async (): Promise<{ id: string } | null> => null);
vi.mock("#lib/prisma", () => ({
  prisma: {
    entitlementGrant: {
      // The period anchor names the `ai_credits` key; the "did they pay" lookup does not.
      findFirst: (args: { where: { key?: string } }) =>
        args.where.key ? findActiveGrant() : findPurchasedGrant(),
    },
    subscription: { findFirst: () => findPausedSubscription() },
  },
}));
const publicAtsPolicy = vi.fn(
  (): {
    analysisCredits: { min: number; max: number };
    jobUrlAnalysisCredits: { min: number; max: number };
    resumeConversionCredits: number;
    parseRepairCredits: number | null;
  } => ({
    analysisCredits: { min: 5, max: 25 },
    jobUrlAnalysisCredits: { min: 10, max: 50 },
    resumeConversionCredits: 25,
    parseRepairCredits: 10,
  }),
);
vi.mock("#services/ats/aiPolicy", () => ({ publicAtsPolicy }));
/** Spendable credits from any source (owner decision 1); none by default. */
const getWallet = vi.fn(async () => ({ available: 0 }));
vi.mock("#services/creditService", () => ({ CreditService: { getWallet } }));

/**
 * V-390: `clearMocks` and `restoreMocks` keep a `vi.fn`'s implementation, so a
 * `mockResolvedValue` or `mockImplementation` in one block used to carry into every block after
 * it, and the "Redis answers late" cases ran on whichever tier the file order left behind.
 * `mockReset` puts each mock back on the implementation it was created with.
 */
beforeEach(() => {
  for (const mock of [
    findActiveGrant,
    findPurchasedGrant,
    findPausedSubscription,
    getWallet,
    publicAtsPolicy,
    redisWrite,
  ])
    mock.mockReset();
});

describe("ATS quota — extraction and scanning are independent budgets", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it("gives an anonymous caller a single scan per window", async () => {
    const { AtsQuotaService } = await import("../../src/services/ats/quota.js");

    const first = await AtsQuotaService.consume(undefined, "203.0.113.5");
    expect(first.tier).toBe("anonymous");
    expect(first.remaining).toBe(0);

    await expect(AtsQuotaService.consume(undefined, "203.0.113.5")).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  it("does not spend the scan quota when a resume is uploaded first", async () => {
    const { AtsQuotaService } = await import("../../src/services/ats/quota.js");

    await AtsQuotaService.consumeExtract(undefined, "203.0.113.9");
    const summary = await AtsQuotaService.summary(undefined, "203.0.113.9");

    expect(summary.remaining).toBe(1);
    expect(summary.extract.remaining).toBe(2);

    await expect(AtsQuotaService.consume(undefined, "203.0.113.9")).resolves.toMatchObject({
      remaining: 0,
    });
  });

  it("lets an anonymous caller upload a few times before extraction itself is capped", async () => {
    const { AtsQuotaService } = await import("../../src/services/ats/quota.js");

    await AtsQuotaService.consumeExtract(undefined, "203.0.113.20");
    await AtsQuotaService.consumeExtract(undefined, "203.0.113.20");
    await AtsQuotaService.consumeExtract(undefined, "203.0.113.20");

    await expect(AtsQuotaService.consumeExtract(undefined, "203.0.113.20")).rejects.toMatchObject({
      statusCode: 429,
      message: "ATS upload quota exceeded.",
    });
  });

  it("gives a logged-in free user a bigger, and separate, upload budget", async () => {
    const { AtsQuotaService } = await import("../../src/services/ats/quota.js");

    const summary = await AtsQuotaService.summary("user_1", "203.0.113.40");
    expect(summary.tier).toBe("free");
    expect(summary.limit).toBe(2);
    expect(summary.extract.limit).toBe(6);
  });
});

/**
 * V-037: the paid period is anchored on the day the active `ai_credits` grant started, whatever
 * granted it. Anchoring on `now` whenever no ACTIVE subscription row existed (a manual grant, a
 * cancelled-but-entitled plan, PAST_DUE) made a key per day: 300 per period became 300 per day.
 */
describe("ATS quota — the paid period follows the grant, not the calendar day", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => vi.useRealTimers());

  beforeEach(() => getWallet.mockResolvedValue({ available: 100 }));

  it("keeps one period key across days for a grant with no subscription row", async () => {
    const { AtsQuotaService } = await import("../../src/services/ats/quota.js");
    findActiveGrant.mockResolvedValue({ createdAt: new Date("2026-10-10T09:30:00Z") });

    vi.setSystemTime(new Date("2026-10-25T12:00:00Z"));
    const dayOne = await AtsQuotaService.consume("user_9", "203.0.113.50");
    vi.setSystemTime(new Date("2026-10-26T12:00:00Z"));
    const dayTwo = await AtsQuotaService.consume("user_9", "203.0.113.50");

    expect(dayOne.tier).toBe("subscriber");
    expect(dayOne.limit).toBe(300);
    expect(dayTwo.used).toBe(2);
    expect([...store.keys()]).toEqual(["ats:quota:subscriber:user_9:2026-10-10"]);
    expect(dayTwo.resetsAt).toBe("2026-11-10T00:00:00.000Z");
  });

  it("rolls to the next period on the grant's day of the month", async () => {
    const { AtsQuotaService } = await import("../../src/services/ats/quota.js");
    findActiveGrant.mockResolvedValue({ createdAt: new Date("2026-01-31T00:00:00Z") });

    vi.setSystemTime(new Date("2026-02-15T00:00:00Z"));
    await AtsQuotaService.consume("user_9", "203.0.113.50");
    vi.setSystemTime(new Date("2026-03-01T00:00:00Z"));
    await AtsQuotaService.consume("user_9", "203.0.113.50");

    // February has no 31st: the period is clamped to the month's last day, like before.
    expect([...store.keys()]).toEqual([
      "ats:quota:subscriber:user_9:2026-01-31",
      "ats:quota:subscriber:user_9:2026-02-28",
    ]);
  });

  it("never anchors on today when the grant's start is unreadable", async () => {
    const { AtsQuotaService } = await import("../../src/services/ats/quota.js");
    findActiveGrant.mockResolvedValue({ createdAt: new Date(Number.NaN) });

    vi.setSystemTime(new Date("2026-10-25T12:00:00Z"));
    await AtsQuotaService.consume("user_9", "203.0.113.50");
    vi.setSystemTime(new Date("2026-10-26T12:00:00Z"));
    const dayTwo = await AtsQuotaService.consume("user_9", "203.0.113.50");

    expect(dayTwo.used).toBe(2);
    expect([...store.keys()]).toEqual(["ats:quota:subscriber:user_9:2026-10"]);
  });
});

/**
 * Owner decision 1 (V-179): every AI feature runs on credits from any source. The 300-scan tier,
 * conversion and repair follow a spendable balance, never the `ai_credits` grant, and the
 * summary says whether repair is possible (V-178).
 */
describe("ATS quota — credits, not the ai_credits grant, unlock the paid tier", () => {
  beforeEach(() => {
    store.clear();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-25T12:00:00Z"));
    findActiveGrant.mockResolvedValue(null);
  });

  afterEach(() => vi.useRealTimers());

  it("gives a credit-pack buyer with no grant the paid tier, conversion and repair", async () => {
    const { AtsQuotaService } = await import("../../src/services/ats/quota.js");
    getWallet.mockResolvedValue({ available: 250 });

    const summary = await AtsQuotaService.consume("pack_buyer", "203.0.113.60");

    expect(summary.tier).toBe("subscriber");
    expect(summary.limit).toBe(300);
    expect(summary.canConvertResume).toBe(true);
    expect(summary.canRepair).toBe(true);
    // No grant to anchor on: one window per calendar month, never per day.
    expect([...store.keys()]).toEqual(["ats:quota:subscriber:pack_buyer:2026-10"]);
    expect(summary.resetsAt).toBe("2026-11-01T00:00:00.000Z");
  });

  it("keeps an unpaid grant holder (an admin comp) with an empty wallet on the free tier, unable to convert or repair", async () => {
    const { AtsQuotaService } = await import("../../src/services/ats/quota.js");
    findActiveGrant.mockResolvedValue({ createdAt: new Date("2026-10-10T09:30:00Z") });
    getWallet.mockResolvedValue({ available: 0 });

    const summary = await AtsQuotaService.summary("drained", "203.0.113.61");

    expect(summary.tier).toBe("free");
    expect(summary.canConvertResume).toBe(false);
    expect(summary.canRepair).toBe(false);
  });

  // V-398: payers are never shown free. A subscriber or pass holder who spent every credit, or a
  // Creator Pro subscriber who never had any, keeps the paid scan tier and its period; only the
  // credit-priced features (conversion, repair) switch off.
  it("keeps a paying subscriber with an empty wallet on the paid tier and its period", async () => {
    const { AtsQuotaService } = await import("../../src/services/ats/quota.js");
    findPurchasedGrant.mockResolvedValue({ id: "grant_subscription" });
    findActiveGrant.mockResolvedValue({ createdAt: new Date("2026-10-10T09:30:00Z") });
    getWallet.mockResolvedValue({ available: 0 });

    const summary = await AtsQuotaService.consume("spent_subscriber", "203.0.113.64");

    expect(summary.tier).toBe("subscriber");
    expect(summary.limit).toBe(300);
    expect(summary.canConvertResume).toBe(false);
    expect(summary.canRepair).toBe(false);
    expect([...store.keys()]).toEqual(["ats:quota:subscriber:spent_subscriber:2026-10-10"]);
  });

  it("keeps a Creator Pro subscriber with no credits on the paid tier, one window per calendar month", async () => {
    const { AtsQuotaService } = await import("../../src/services/ats/quota.js");
    findPurchasedGrant.mockResolvedValue({ id: "grant_portfolio" });
    getWallet.mockResolvedValue({ available: 0 });

    const summary = await AtsQuotaService.summary("creator_pro", "203.0.113.65");

    expect(summary.tier).toBe("subscriber");
    expect(summary.limit).toBe(300);
    expect(summary.resetsAt).toBe("2026-11-01T00:00:00.000Z");
  });

  it("says repair is not possible when the balance cannot cover it or no route is configured", async () => {
    const { AtsQuotaService } = await import("../../src/services/ats/quota.js");
    getWallet.mockResolvedValue({ available: 8 });
    expect((await AtsQuotaService.summary("low", "203.0.113.62")).canRepair).toBe(false);

    getWallet.mockResolvedValue({ available: 500 });
    publicAtsPolicy.mockReturnValue({
      analysisCredits: { min: 5, max: 25 },
      jobUrlAnalysisCredits: { min: 10, max: 50 },
      resumeConversionCredits: 25,
      parseRepairCredits: null,
    });
    expect((await AtsQuotaService.summary("rich", "203.0.113.62")).canRepair).toBe(false);
  });

  it("answers with pricing: null, not a 503, when the ATS AI policy is invalid (V-185)", async () => {
    const { AtsQuotaService } = await import("../../src/services/ats/quota.js");
    const { ApiError } = await import("../../src/lib/errors.js");
    publicAtsPolicy.mockImplementation(() => {
      throw new ApiError(503, "AI ATS policy is invalid.");
    });

    const summary = await AtsQuotaService.consume("user_policy", "203.0.113.63");

    expect(summary.pricing).toBeNull();
    expect(summary.used).toBe(1);
    expect(summary.canConvertResume).toBe(false);
    expect(summary.canRepair).toBe(false);
  });
});

describe("ATS quota when Redis answers late", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it("hands back a scan whose count landed after the request already failed on the timeout", async () => {
    const { AtsQuotaService } = await import("../../src/services/ats/quota.js");
    redisWrite.mockImplementationOnce(async (run, undo) => {
      const late = await run(redis); // Redis applied the count after all...
      await undo(late); // ...and answered once it recovered.
      throw new RedisTimeoutError("Redis did not answer within 500 ms");
    });

    await expect(AtsQuotaService.consume("user-1", "203.0.113.7")).rejects.toBeInstanceOf(
      RedisTimeoutError,
    );

    // On the free tier whatever ran before this block (V-390): its counter is the one checked.
    expect(await AtsQuotaService.summary("user-1", "203.0.113.7")).toMatchObject({
      tier: "free",
      used: 0,
    });
  });

  it("refunds nothing when the late reply says the quota was already full", async () => {
    const { AtsQuotaService } = await import("../../src/services/ats/quota.js");
    await AtsQuotaService.consume(undefined, "203.0.113.8");
    redisWrite.mockImplementationOnce(async (run, undo) => {
      await undo(await run(redis));
      throw new RedisTimeoutError("late");
    });

    await expect(AtsQuotaService.consume(undefined, "203.0.113.8")).rejects.toBeInstanceOf(
      RedisTimeoutError,
    );
    expect((await AtsQuotaService.summary(undefined, "203.0.113.8")).used).toBe(1);
  });
});

/**
 * V-326: a refund decrements the counter the scan was taken from. The tier is chosen by the
 * wallet's current balance, so re-deriving the key at refund time could land on another counter.
 */
describe("ATS quota refunds the counter the scan was spent on", () => {
  beforeEach(() => {
    store.clear();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-25T12:00:00Z"));
    findActiveGrant.mockResolvedValue(null);
  });

  afterEach(() => vi.useRealTimers());

  it("returns a subscriber's scan even when their balance is held by a reservation by then", async () => {
    const { AtsQuotaService } = await import("../../src/services/ats/quota.js");
    getWallet.mockResolvedValue({ available: 10 });
    const spent = await AtsQuotaService.consume("racer", "203.0.113.70");
    expect(spent.tier).toBe("subscriber");
    expect(store.get("ats:quota:subscriber:racer:2026-10")).toBe(1);

    // A concurrent analysis reserved the credits: the caller now reads as free.
    getWallet.mockResolvedValue({ available: 0 });
    await AtsQuotaService.refund("racer", "203.0.113.70", spent);

    expect(store.get("ats:quota:subscriber:racer:2026-10")).toBe(0);
    expect(store.get("ats:quota:free:racer") ?? 0).toBe(0);
  });
});

/**
 * V-388: `onReturned` fires once the scan is back on the counter and never when the decrement
 * itself failed, so the controller knows whether a retry would hand back a second scan.
 */
describe("ATS quota refund reports when the scan is back", () => {
  beforeEach(() => store.clear());

  it("calls onReturned after the decrement, even if the summary read then fails", async () => {
    const { AtsQuotaService } = await import("../../src/services/ats/quota.js");
    await AtsQuotaService.consume("user-r", "203.0.113.80");
    const onReturned = vi.fn();
    redis.get.mockRejectedValueOnce(new Error("GET failed after the DECR"));

    await expect(
      AtsQuotaService.refund("user-r", "203.0.113.80", { tier: "free" }, onReturned),
    ).rejects.toThrow("GET failed");
    expect(onReturned).toHaveBeenCalledTimes(1);
    expect([...store.values()]).toEqual([0]);
  });

  it("never calls onReturned when the decrement fails", async () => {
    const { AtsQuotaService } = await import("../../src/services/ats/quota.js");
    const onReturned = vi.fn();
    redis.eval.mockRejectedValueOnce(new Error("EVAL failed"));

    await expect(
      AtsQuotaService.refund("user-r", "203.0.113.80", { tier: "free" }, onReturned),
    ).rejects.toThrow("EVAL failed");
    expect(onReturned).not.toHaveBeenCalled();
  });
});

/**
 * V-398, owner decision 2026-10-28: a paused subscription gives no paid features, but the
 * customer is not shown as free. The scan quota says `paused`, with the free limits and the
 * free counter, so pausing or resuming never resets what was used.
 */
describe("ATS quota for a paused subscription", () => {
  beforeEach(() => store.clear());

  it("labels a paused subscriber paused, on the free limits and the free counter", async () => {
    const { AtsQuotaService } = await import("../../src/services/ats/quota.js");
    findPausedSubscription.mockResolvedValue({ id: "sub_paused" });

    const summary = await AtsQuotaService.consume("paused_user", "203.0.113.90");

    expect(summary).toMatchObject({ tier: "paused", limit: 2, used: 1 });
    expect(summary.extract.limit).toBe(6);
    expect([...store.keys()]).toEqual(["ats:quota:free:paused_user"]);
  });

  it("refunds a scan spent while paused to the same counter", async () => {
    const { AtsQuotaService } = await import("../../src/services/ats/quota.js");
    findPausedSubscription.mockResolvedValue({ id: "sub_paused" });
    const spent = await AtsQuotaService.consume("paused_user", "203.0.113.91");

    await AtsQuotaService.refund("paused_user", "203.0.113.91", spent);

    expect(store.get("ats:quota:free:paused_user")).toBe(0);
  });

  it("keeps credits on the paid tier even while a subscription is paused", async () => {
    const { AtsQuotaService } = await import("../../src/services/ats/quota.js");
    findPausedSubscription.mockResolvedValue({ id: "sub_paused" });
    getWallet.mockResolvedValue({ available: 100 });

    expect((await AtsQuotaService.summary("paused_with_pack", "203.0.113.92")).tier).toBe(
      "subscriber",
    );
  });
});
