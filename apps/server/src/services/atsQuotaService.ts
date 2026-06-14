import { createHmac } from "node:crypto";

import { config } from "#config";
import { EntitlementService } from "#services/entitlementService";
import { publicAtsPolicy } from "#services/atsAiPolicy";
import type { AtsQuotaSummary } from "#services/atsTypes";
import { ApiError } from "#utils/errors";
import { prisma } from "#utils/prisma";
import { getRedis } from "#utils/redis";

const ANONYMOUS_WINDOW_SECONDS = 48 * 60 * 60;
const FREE_WINDOW_SECONDS = 24 * 60 * 60;
const PAID_LIMIT = 300;

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
      status: { in: ["ACTIVE", "TRIALING"] },
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

export class AtsQuotaService {
  static async summary(userId: string | undefined, ip: string): Promise<AtsQuotaSummary> {
    const paid = userId ? await paidPeriod(userId) : null;
    const tier = paid ? "subscriber" : userId ? "free" : "anonymous";
    const limit = paid ? PAID_LIMIT : userId ? 2 : 1;
    const windowSeconds = userId ? FREE_WINDOW_SECONDS : ANONYMOUS_WINDOW_SECONDS;
    const key = paid?.key ?? `ats:quota:${tier}:${userId ?? anonymousId(ip)}`;
    const redis = getRedis();
    const used = Number((await redis.get(key)) ?? 0);
    const ttl = paid
      ? Math.max(1, Math.ceil((paid.end.getTime() - Date.now()) / 1000))
      : Math.max(1, await redis.ttl(key));
    return {
      tier,
      limit,
      used,
      remaining: Math.max(0, limit - used),
      resetsAt: new Date(Date.now() + (ttl > 0 ? ttl : windowSeconds) * 1000).toISOString(),
      canConvertResume: Boolean(paid),
      pricing: publicAtsPolicy(),
    };
  }

  static async consume(userId: string | undefined, ip: string) {
    const summary = await this.summary(userId, ip);
    const paid = userId ? await paidPeriod(userId) : null;
    const key = paid?.key ?? `ats:quota:${summary.tier}:${userId ?? anonymousId(ip)}`;
    const windowSeconds = userId ? FREE_WINDOW_SECONDS : ANONYMOUS_WINDOW_SECONDS;
    const redis = getRedis();
    const ttl = paid
      ? Math.max(1, Math.ceil((paid.end.getTime() - Date.now()) / 1000))
      : windowSeconds;
    const used = Number(
      await redis.eval(
        `local current = tonumber(redis.call("GET", KEYS[1]) or "0")
         local limit = tonumber(ARGV[1])
         if current >= limit then return -1 end
         current = redis.call("INCR", KEYS[1])
         if current == 1 then redis.call("EXPIRE", KEYS[1], tonumber(ARGV[2])) end
         return current`,
        { keys: [key], arguments: [String(summary.limit), String(ttl)] },
      ),
    );
    if (used < 0)
      throw new ApiError(429, "ATS scan quota exceeded.", await this.summary(userId, ip));
    return this.summary(userId, ip);
  }
}
