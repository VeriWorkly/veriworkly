import { createHmac } from "node:crypto";

import { config } from "#config";
import { EntitlementService } from "#services/entitlementService";
import { publicAtsPolicy } from "#services/ats/aiPolicy";
import type { AtsQuotaSummary } from "#services/ats/types";
import { ApiError } from "#lib/errors";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";

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

async function paidPeriod(userId: string) {
  if (!(await EntitlementService.has(userId, "ai_credits"))) return null;
  const now = new Date();
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      productKey: { in: ["ai_credits", "bundle"] },
      status: { in: ["ACTIVE"] },
    },
    orderBy: { updatedAt: "desc" },
    select: { interval: true, currentPeriodEnd: true, createdAt: true },
  });
  const anchor = subscription?.createdAt ?? now;
  let end =
    subscription?.interval === "MONTHLY" && subscription.currentPeriodEnd
      ? subscription.currentPeriodEnd
      : anchoredUtcDate(now.getUTCFullYear(), now.getUTCMonth(), anchor.getUTCDate());
  if (end <= now)
    end = anchoredUtcDate(end.getUTCFullYear(), end.getUTCMonth() + 1, anchor.getUTCDate());
  const start = anchoredUtcDate(end.getUTCFullYear(), end.getUTCMonth() - 1, anchor.getUTCDate());
  return { key: `ats:quota:subscriber:${userId}:${start.toISOString().slice(0, 10)}`, end };
}

type QuotaContext = {
  tier: AtsQuotaSummary["tier"];
  paid: boolean;
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
  const paid = userId ? await paidPeriod(userId) : null;
  const tier = paid ? "subscriber" : userId ? "free" : "anonymous";
  const identity = userId ?? anonymousId(ip);
  const windowSeconds = userId ? FREE_WINDOW_SECONDS : ANONYMOUS_WINDOW_SECONDS;

  return {
    tier,
    paid: Boolean(paid),
    key: paid?.key ?? `ats:quota:${tier}:${identity}`,
    extractKey: paid?.key ? `${paid.key}:extract` : `ats:extract-quota:${tier}:${identity}`,
    limit: paid ? PAID_LIMIT : userId ? 2 : 1,
    extractLimit: paid ? PAID_EXTRACT_LIMIT : userId ? FREE_EXTRACT_LIMIT : ANONYMOUS_EXTRACT_LIMIT,
    windowSeconds,
    ttlSeconds: paid
      ? Math.max(1, Math.ceil((paid.end.getTime() - Date.now()) / 1000))
      : windowSeconds,
  };
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

  return {
    tier: ctx.tier,
    limit: ctx.limit,
    used: scanUsed,
    remaining: Math.max(0, ctx.limit - scanUsed),
    resetsAt: new Date(Date.now() + ttl * 1000).toISOString(),
    canConvertResume: ctx.paid,
    pricing: publicAtsPolicy(),
    extract: {
      limit: ctx.extractLimit,
      used: extractUsed,
      remaining: Math.max(0, ctx.extractLimit - extractUsed),
    },
  };
}

async function increment(key: string, limit: number, ttlSeconds: number) {
  return Number(
    await getRedis().eval(INCREMENT_SCRIPT, {
      keys: [key],
      arguments: [String(limit), String(ttlSeconds)],
    }),
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
  static async refund(userId: string | undefined, ip: string) {
    const ctx = await resolveContext(userId, ip);
    await getRedis().eval(DECREMENT_SCRIPT, { keys: [ctx.key], arguments: [] });
    return summarize(ctx);
  }
}
