import { createHmac } from "node:crypto";

import { config } from "#config";
import { publicAtsPolicy } from "#services/ats/aiPolicy";
import type { AtsQuotaSummary } from "#services/ats/types";
import { CreditService } from "#services/creditService";
import { ApiError } from "#lib/errors";
import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";
import { getRedis, redisWrite } from "#lib/redis";
import { addressBucket } from "#utils/requestIp";

const ANONYMOUS_WINDOW_SECONDS = 48 * 60 * 60;
const FREE_WINDOW_SECONDS = 24 * 60 * 60;
const PAID_LIMIT = 300;

/**
 * Extraction (file upload -> text) has its own budget, separate from the scan quota above.
 * It used to share the same counter as check/analyze, which meant an anonymous visitor
 * (scan limit: 1 per 48h) could spend their only scan just by uploading a file — the check
 * call that followed always came back 429. Extraction is still IP/size/type limited on its
 * own, so a more generous, independent allowance is safe.
 */
const ANONYMOUS_EXTRACT_LIMIT = 3;
const FREE_EXTRACT_LIMIT = 6;
const PAID_EXTRACT_LIMIT = 300;

const INCREMENT_SCRIPT = `local current = tonumber(redis.call("GET", KEYS[1]) or "0")
         local limit = tonumber(ARGV[1])
         if current >= limit then return -1 end
         current = redis.call("INCR", KEYS[1])
         if current == 1 then redis.call("EXPIRE", KEYS[1], tonumber(ARGV[2])) end
         return current`;

/**
 * Hands one unit back. Guarded on the key still existing and still being positive so a refund
 * that races the window expiring cannot create a negative counter, which would silently grant
 * the next caller an extra scan.
 */
const DECREMENT_SCRIPT = `local current = tonumber(redis.call("GET", KEYS[1]) or "0")
         if current <= 0 then return 0 end
         return redis.call("DECR", KEYS[1])`;

function anonymousId(ip: string) {
  return createHmac("sha256", config.auth.secret).update(ip).digest("hex").slice(0, 32);
}

function anchoredUtcDate(year: number, month: number, day: number) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

/**
 * The paid scan period of an account that holds credits (owner decision 1: credits from any
 * source unlock the 300-scan tier; the `ai_credits` grant only places the window). It is a
 * month-long window anchored on the day of the month the active `ai_credits` grant row was
 * created, whatever granted it — subscription, admin, promotion — and, for credits without
 * such a grant (a pack, a pass that ended, goodwill), the calendar month. `createdAt` rather
 * than `startsAt`: every billing webhook upserts the grant and rewrites `startsAt`, which would
 * move the anchor (and the key) with each renewal.
 *
 * It used to anchor on an ACTIVE subscription row and, without one (a manual grant, a cancelled
 * but still entitled plan, PAST_DUE), on `now`: a new key every day, so 300 per period became
 * 300 per day and the keys piled up for their 30-day TTL (V-037). The oldest active grant is the
 * anchor so a renewal row cannot restart the period. Should the stored date ever be unreadable
 * the key falls back to the calendar month, which is still one window per month, never per day.
 */
async function paidPeriod(userId: string) {
  const now = new Date();
  const calendarMonth = () => ({
    key: `ats:quota:subscriber:${userId}:${now.toISOString().slice(0, 7)}`,
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  });
  const grant = await prisma.entitlementGrant.findFirst({
    where: {
      userId,
      key: "ai_credits",
      startsAt: { lte: now },
      revokedAt: null,
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  if (!grant || Number.isNaN(grant.createdAt.getTime())) return calendarMonth();

  const anchorDay = grant.createdAt.getUTCDate();
  let end = anchoredUtcDate(now.getUTCFullYear(), now.getUTCMonth(), anchorDay);
  if (end <= now) end = anchoredUtcDate(end.getUTCFullYear(), end.getUTCMonth() + 1, anchorDay);
  const start = anchoredUtcDate(end.getUTCFullYear(), end.getUTCMonth() - 1, anchorDay);
  return { key: `ats:quota:subscriber:${userId}:${start.toISOString().slice(0, 10)}`, end };
}

/**
 * Whether the account holds access someone paid for right now: a subscription's grant or a
 * pass's (the `isPurchasedGrant` rule of the billing summary). Payers are never shown as free
 * (owner decision 2, V-398), so a subscriber who spent every credit, or a Creator Pro subscriber
 * who has none, keeps the paid scan tier; only the credit-priced features need a balance. An
 * admin comp (MANUAL) or a promotion does not count. Asked only when the wallet is empty.
 */
async function holdsPurchasedAccess(userId: string) {
  const now = new Date();
  const grant = await prisma.entitlementGrant.findFirst({
    where: {
      userId,
      startsAt: { lte: now },
      revokedAt: null,
      AND: [
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        {
          OR: [
            { source: "SUBSCRIPTION" },
            { source: "SYSTEM", metadata: { path: ["pass"], equals: true } },
          ],
        },
      ],
    },
    select: { id: true },
  });
  return grant !== null;
}

/**
 * Owner decision 2026-10-28 (V-398): a paused subscription gives no paid features, so its scans
 * are the free ones, but the customer is told it is paused, not free. Dunning (any other
 * PAST_DUE) reads free: paid features stop the moment a payment fails (owner decision 9). Asked
 * only when the account is not on the paid tier.
 */
async function hasPausedSubscription(userId: string) {
  const paused = await prisma.subscription.findFirst({
    where: { userId, status: "PAST_DUE", rawStatus: "paused" },
    select: { id: true },
  });
  return paused !== null;
}

/** The counter a tier spends from: a paused account shares the free one. */
function counterTier(tier: AtsQuotaSummary["tier"]) {
  return tier === "paused" ? "free" : tier;
}

type QuotaContext = {
  tier: AtsQuotaSummary["tier"];
  paid: boolean;
  /** Spendable credits, any source; 0 for an anonymous caller. */
  availableCredits: number;
  key: string;
  extractKey: string;
  limit: number;
  extractLimit: number;
  windowSeconds: number;
  ttlSeconds: number;
};

/**
 * Everything a quota decision needs, resolved in one pass.
 *
 * `consume` previously built a full summary (Redis GET + TTL on two counters, an entitlement
 * check, and a subscription query), then re-ran `paidPeriod` for a second identical
 * subscription query, then built the whole summary a third time for the response — roughly
 * three database round trips and seven Redis calls for one increment, on the free
 * unauthenticated endpoint that takes the most traffic. Resolving the context once and deriving
 * the response from the counter the increment already returned removes all of that.
 */
async function resolveContext(userId: string | undefined, ip: string): Promise<QuotaContext> {
  const availableCredits = userId ? (await CreditService.getWallet(userId)).available : 0;
  const paying = Boolean(userId) && (availableCredits > 0 || (await holdsPurchasedAccess(userId!)));
  const paid = paying ? await paidPeriod(userId!) : null;
  const tier: AtsQuotaSummary["tier"] = paid
    ? "subscriber"
    : !userId
      ? "anonymous"
      : (await hasPausedSubscription(userId))
        ? "paused"
        : "free";
  // A paused account counts on the free counter, so a pause or a resume never resets it.
  const counter = counterTier(tier);
  const identity = userId ?? anonymousId(addressBucket(ip));
  const windowSeconds = userId ? FREE_WINDOW_SECONDS : ANONYMOUS_WINDOW_SECONDS;

  return {
    tier,
    paid: Boolean(paid),
    availableCredits,
    key: paid?.key ?? `ats:quota:${counter}:${identity}`,
    extractKey: paid?.key ? `${paid.key}:extract` : `ats:extract-quota:${counter}:${identity}`,
    limit: paid ? PAID_LIMIT : userId ? 2 : 1,
    extractLimit: paid ? PAID_EXTRACT_LIMIT : userId ? FREE_EXTRACT_LIMIT : ANONYMOUS_EXTRACT_LIMIT,
    windowSeconds,
    ttlSeconds: paid
      ? Math.max(1, Math.ceil((paid.end.getTime() - Date.now()) / 1000))
      : windowSeconds,
  };
}

/** The scan counter of a tier for this caller, the key `resolveContext` builds for that tier. */
async function scanKeyForTier(
  tier: AtsQuotaSummary["tier"],
  userId: string | undefined,
  ip: string,
): Promise<string> {
  if (tier === "subscriber" && userId) return (await paidPeriod(userId)).key;
  return `ats:quota:${counterTier(tier)}:${userId ?? anonymousId(addressBucket(ip))}`;
}

/**
 * Builds the wire summary from an already-resolved context.
 *
 * `knownUsed` lets a caller that just incremented a counter supply the value the Lua script
 * returned instead of reading it back, which is both one fewer round trip and immune to another
 * request landing in between.
 */
async function summarize(
  ctx: QuotaContext,
  knownUsed?: { scans?: number; extracts?: number },
): Promise<AtsQuotaSummary> {
  const redis = getRedis();
  const [scanUsed, extractUsed, rawTtl] = await Promise.all([
    knownUsed?.scans !== undefined ? knownUsed.scans : redis.get(ctx.key).then(Number),
    knownUsed?.extracts !== undefined ? knownUsed.extracts : redis.get(ctx.extractKey).then(Number),
    ctx.paid ? Promise.resolve(ctx.ttlSeconds) : redis.ttl(ctx.key),
  ]);

  const ttl = rawTtl > 0 ? rawTtl : ctx.windowSeconds;
  const pricing = pricingOrNull();

  return {
    tier: ctx.tier,
    limit: ctx.limit,
    used: scanUsed,
    remaining: Math.max(0, ctx.limit - scanUsed),
    resetsAt: new Date(Date.now() + ttl * 1000).toISOString(),
    canConvertResume: Boolean(pricing) && ctx.availableCredits >= pricing!.resumeConversionCredits,
    // V-178: the client offers the repair pass only when this is true.
    canRepair:
      pricing?.parseRepairCredits != null && ctx.availableCredits >= pricing.parseRepairCredits,
    pricing,
    extract: {
      limit: ctx.extractLimit,
      used: extractUsed,
      remaining: Math.max(0, ctx.extractLimit - extractUsed),
    },
  };
}

/**
 * V-185: the summary is built after the scan counter moved, so a policy that fails to load must
 * not turn it into a 503 (the scan would be spent and the response lost). Prices are left out
 * instead, which also switches conversion and repair off, and the cause is logged.
 */
function pricingOrNull(): AtsQuotaSummary["pricing"] {
  try {
    return publicAtsPolicy();
  } catch (error) {
    logger.error("ATS quota summary sent without pricing: the ATS AI policy did not load", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function increment(key: string, limit: number, ttlSeconds: number) {
  return Number(
    await redisWrite(
      (redis) =>
        redis.eval(INCREMENT_SCRIPT, {
          keys: [key],
          arguments: [String(limit), String(ttlSeconds)],
        }),
      // The request already failed on the timeout; a count Redis applied later is handed back so
      // nobody is charged a scan or upload for an error (-1: over the limit, nothing counted).
      async (late) => {
        if (Number(late) >= 0)
          await getRedis().eval(DECREMENT_SCRIPT, { keys: [key], arguments: [] });
      },
    ),
  );
}

export class AtsQuotaService {
  static async summary(userId: string | undefined, ip: string): Promise<AtsQuotaSummary> {
    return summarize(await resolveContext(userId, ip));
  }

  static async consume(userId: string | undefined, ip: string) {
    const ctx = await resolveContext(userId, ip);
    const used = await increment(ctx.key, ctx.limit, ctx.ttlSeconds);

    if (used < 0)
      throw new ApiError(
        429,
        "ATS scan quota exceeded.",
        await summarize(ctx, { scans: ctx.limit }),
      );
    return summarize(ctx, { scans: used });
  }

  /**
   * Extraction has its own budget so uploading a file never spends the scan quota above —
   * see the comment on ANONYMOUS_EXTRACT_LIMIT.
   */
  static async consumeExtract(userId: string | undefined, ip: string) {
    const ctx = await resolveContext(userId, ip);
    const used = await increment(ctx.extractKey, ctx.extractLimit, ctx.ttlSeconds);

    if (used < 0) throw new ApiError(429, "ATS upload quota exceeded.", await summarize(ctx));
    return summarize(ctx, { extracts: used });
  }

  /**
   * Returns a scan to the caller's allowance.
   *
   * Used only when the server could not deliver the analysis the scan was spent on — a routing
   * or configuration failure on our side. Deliberately not wired to every error path: metering
   * runs before the outbound job-page fetch precisely so quota bounds server-initiated egress,
   * and refunding on a failed fetch would hand that budget straight back.
   */
  static async refund(
    userId: string | undefined,
    ip: string,
    /** What `consume` returned: the scan goes back to the counter of the tier it was taken from. */
    spent: Pick<AtsQuotaSummary, "tier">,
    /**
     * Called once the scan is back on the counter, before the summary is read: a caller that
     * sees this method throw can tell "nothing returned yet" from "returned, summary failed" (V-388).
     */
    onReturned?: () => void,
  ) {
    // Not the tier the caller has now (V-326): it follows the live balance, so a subscriber whose
    // credits are held by a concurrent reservation would be refunded on the free counter.
    await getRedis().eval(DECREMENT_SCRIPT, {
      keys: [await scanKeyForTier(spent.tier, userId, ip)],
      arguments: [],
    });
    onReturned?.();
    return summarize(await resolveContext(userId, ip));
  }

  /**
   * Returns an upload to the caller's allowance, when the server and not the file failed it: the
   * extraction queue was full, or extraction was unavailable. A file that could not be read or
   * took too long keeps its charge, so a hostile file cannot be retried for free.
   */
  static async refundExtract(userId: string | undefined, ip: string) {
    const ctx = await resolveContext(userId, ip);
    await getRedis().eval(DECREMENT_SCRIPT, { keys: [ctx.extractKey], arguments: [] });
  }
}
