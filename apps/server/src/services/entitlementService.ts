import type { Prisma } from "@prisma/client";

import { bumpGeneration, resolveGenerationalKey } from "#lib/cacheGeneration";
import { prisma } from "#lib/prisma";
import { cacheGet, cacheSet } from "#lib/redis";

import { enforcedEntitlement } from "#services/entitlementEnforcement";
import { ENTITLEMENT_KEYS, type EntitlementKey } from "#services/productCatalog";
import { PRODUCT_NAMES } from "#services/productNames";

const ENTITLEMENT_CACHE_TTL_SECONDS = 60;

/** Dates travel through Redis as ISO strings; the window is re-evaluated on every read. */
type CachedGrant = { key: string; startsAt: string; endsAt: string | null };

const activeGrantWhere = (at: Date) => ({
  startsAt: { lte: at },
  revokedAt: null,
  OR: [{ endsAt: null }, { endsAt: { gt: at } }],
});

function cacheNamespace(userId: string) {
  return `entitlements:active:${userId}`;
}

/**
 * The key the user's grant set lives under right now (`entitlements:active:{userId}:g{N}`), or
 * `null` when Redis is unavailable. Exported for the integration test that interleaves a read
 * with an invalidation.
 */
export function entitlementCacheKey(userId: string) {
  return resolveGenerationalKey(cacheNamespace(userId));
}

function isActive(grant: CachedGrant, at: Date) {
  const time = at.getTime();
  return (
    new Date(grant.startsAt).getTime() <= time &&
    (grant.endsAt === null || new Date(grant.endsAt).getTime() > time)
  );
}

/**
 * Every unrevoked grant that has not ended yet, cached per user (V-108). The window is checked
 * against `at` on each read, so a grant that ends or starts inside the TTL flips on time; only a
 * write (grant, revoke, reconcile, deletion) needs the explicit invalidation.
 *
 * The key is resolved under the user's cache generation *before* the table is read: a write
 * that bumps the generation in between leaves this reader's stale set under a key nobody reads
 * again. Redis unavailable means no key and no cache, and the table answers, never a denial.
 */
async function loadGrants(userId: string): Promise<CachedGrant[]> {
  const key = await entitlementCacheKey(userId);
  if (key) {
    const cached = await cacheGet<CachedGrant[]>(key);
    if (cached) return cached;
  }

  const now = new Date();
  const rows = await prisma.entitlementGrant.findMany({
    where: { userId, revokedAt: null, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
    select: { key: true, startsAt: true, endsAt: true },
  });
  const grants = rows.map((row) => ({
    key: row.key,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
  }));
  if (key) await cacheSet(key, grants, ENTITLEMENT_CACHE_TTL_SECONDS);
  return grants;
}

/**
 * The entitlements that make a user "paid" (`isPaid`): every subscription and pass grants at
 * least one of them, a credit pack grants neither. Exported so the billing summary can derive the
 * same answer from the grants it already loaded (`isPaidAccessKey`) instead of a second rule.
 */
export const PAID_ACCESS_KEYS: readonly EntitlementKey[] = [
  enforcedEntitlement(ENTITLEMENT_KEYS.AI_CREDITS, "EntitlementService.isPaid"),
  enforcedEntitlement(ENTITLEMENT_KEYS.PORTFOLIO_PUBLISH, "EntitlementService.isPaid"),
];

export function isPaidAccessKey(key: string) {
  return (PAID_ACCESS_KEYS as readonly string[]).includes(key);
}

/** What `isPaid` means, in the product names customers see (V-189). */
export const PAID_ACCESS_PHRASE = `any plan (${PRODUCT_NAMES.ai_credits}, ${PRODUCT_NAMES.portfolio_pro} or the ${PRODUCT_NAMES.bundle}) or a pass`;

export class EntitlementService {
  /**
   * Call after every committed write to `EntitlementGrant` for this user. One `INCR` moves every
   * reader to a fresh key; the old value ages out on its 60 s TTL.
   */
  static async invalidateEntitlements(userId: string) {
    await bumpGeneration(cacheNamespace(userId));
  }

  /**
   * Every live key, read through the same cache as `has`. No request path calls it (V-283): the
   * cache tests use it to see what the cache holds. Request code asks `has` or `isPaid`.
   */
  static async listActive(userId: string, at = new Date()) {
    const grants = await loadGrants(userId);
    return [...new Set(grants.filter((grant) => isActive(grant, at)).map((grant) => grant.key))];
  }

  /**
   * `client` lets a caller inside a transaction count on that connection instead of the pool;
   * that caller needs the transactional view, so the cache is skipped.
   */
  static async has(
    userId: string,
    key: EntitlementKey,
    at = new Date(),
    client: Prisma.TransactionClient = prisma,
  ) {
    if (client !== prisma)
      return (
        (await client.entitlementGrant.count({
          where: { userId, key, ...activeGrantWhere(at) },
        })) > 0
      );

    const grants = await loadGrants(userId);
    return grants.some((grant) => grant.key === key && isActive(grant, at));
  }

  /**
   * The one "paid user" rule (V-173): a live entitlement from a subscription (AI Credits, Creator
   * Pro, Job Hunter Bundle), a pass, or an admin comp of one of those. Paid users skip the
   * free-tier document cap and the profile-import quotas. An AI Credits subscription is a plan,
   * so it lifts the document limit too (as V-189 records); it does not unlock portfolio features,
   * which check `portfolio_publish` themselves (V-174). Credits alone, bought in a pack or
   * granted as goodwill, never make a user paid (owner decision 3): they are AI fuel only.
   * "Paid" here is access, not payment: an admin comp counts, while the billing summary's
   * `isPaying` (did they pay us) does not count it. `client` as for `has`.
   */
  static async isPaid(userId: string, at = new Date(), client: Prisma.TransactionClient = prisma) {
    for (const key of PAID_ACCESS_KEYS) if (await this.has(userId, key, at, client)) return true;
    return false;
  }
}
