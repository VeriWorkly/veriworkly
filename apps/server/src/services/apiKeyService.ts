import crypto from "crypto";

import { config } from "#config";

import { prisma } from "#lib/prisma";
import { logger } from "#lib/logger";
import { ApiError } from "#lib/errors";
import { cacheDel, cacheGet, cacheSet, getRedis } from "#lib/redis";
import { userProfileCacheKey } from "#lib/cacheKeys";

const MAX_API_KEY_RATE_LIMIT = Math.max(
  config.apiKeys.maxRateLimit,
  config.apiKeys.defaultRateLimit,
);

const DEFAULT_SCOPES = config.apiKeys.defaultScopes;
const DEFAULT_RATE_LIMIT = config.apiKeys.defaultRateLimit;
const AUTH_CACHE_TTL_SECONDS = config.apiKeys.authCacheTtlSeconds;
const DEFAULT_KEY_LIFETIME_DAYS = config.apiKeys.defaultKeyLifetimeDays;
const LAST_USED_UPDATE_INTERVAL_SECONDS = config.apiKeys.lastUsedTouchIntervalSeconds;

/**
 * Single source of truth for API key scopes. Keep this in sync with the
 * gates in `src/routes/*.ts` (`requireApiKeyScopes(...)`) — a scope listed
 * here that no route checks is dead; a route checking a scope not listed
 * here is unreachable (see the `ai:write` incident this fixed).
 */
export const ALLOWED_SCOPES = new Set([
  "user:read",
  "user:write",
  "resume:read",
  "resume:write",
  "roadmap:read",
  "changelog:read",
  "github:read",
  "ai:write",
]);

type ApiKeyAuthUser = {
  id: string;
  email: string | null;
  name: string | null;
};

type ApiKeyAuthRecord = {
  id: string;
  keyHash: string;
  keyPrefix: string;
  keySuffix: string;
  name: string;
  userId: string;
  isActive: boolean;
  rateLimit: number;
  scopes: string[];
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastUsed: string | null;
  user: ApiKeyAuthUser;
};

type ApiKeyListRecord = {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  createdAt: Date;
  lastUsed: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
};

type ApiKeyListQuery = {
  limit: number;
  offset: number;
};

type ApiKeyCreateInput = {
  name: string;
  scopes?: string[];
  rateLimit?: number;
  expiresAt?: Date | null;
};

type ApiKeyCreateResult = {
  id: string;
  keyPrefix: string;
  keySuffix: string;
  name: string;
  userId: string;
  isActive: boolean;
  rateLimit: number;
  scopes: string[];
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastUsed: Date | null;
  key: string;
};

type ApiKeyRotateResult = ApiKeyCreateResult & { rotatedFromId: string };

function normalizeScopes(scopes: string[] | undefined) {
  const sourceScopes = scopes && scopes.length > 0 ? scopes : DEFAULT_SCOPES;

  const normalizedScopes = Array.from(
    new Set(sourceScopes.map((scope) => scope.trim()).filter(Boolean)),
  );

  const invalidScopes = normalizedScopes.filter((scope) => !ALLOWED_SCOPES.has(scope));

  if (invalidScopes.length > 0)
    throw new ApiError(400, `Unsupported API key scope(s): ${invalidScopes.join(", ")}`);

  return normalizedScopes;
}

function normalizeRateLimit(rateLimit: number | undefined) {
  const requestedRateLimit = rateLimit ?? DEFAULT_RATE_LIMIT;
  return Math.min(MAX_API_KEY_RATE_LIMIT, Math.max(1, requestedRateLimit));
}

function generateRawKey() {
  return `vw_${crypto.randomBytes(32).toString("hex")}`;
}

function normalizeKeyForHash(key: string) {
  return key.trim();
}

export function hashKey(key: string) {
  return crypto
    .createHmac("sha256", config.apiKeys.hashSecret)
    .update(normalizeKeyForHash(key))
    .digest("hex");
}

function keyPrefix(key: string) {
  return key.slice(0, 8);
}

function keySuffix(key: string) {
  return key.slice(-8);
}

function getExpiryDate(expiresAt?: Date | null) {
  if (expiresAt) return expiresAt;

  const fallback = new Date();
  fallback.setUTCDate(fallback.getUTCDate() + DEFAULT_KEY_LIFETIME_DAYS);

  return fallback;
}

function isExpired(expiresAt: string | Date | null | undefined) {
  if (!expiresAt) return false;

  return new Date(expiresAt).getTime() <= Date.now();
}

/**
 * Negative cache: a well-formed key with no valid row is remembered for a minute, so a client
 * retrying a dead key (or a scanner) costs one Postgres lookup per minute, not one per request.
 * Read in the same round trip as the revoked marker. Dropped by `invalidateAuthCache` (admin
 * reactivation) and on create; a fresh random key cannot already have one, but it costs nothing.
 */
const INVALID_KEY_TTL_SECONDS = 60;

function invalidKeyMarkerKey(keyHash: string) {
  return `apikey:invalid:${keyHash}`;
}

async function markKeyInvalid(keyHash: string) {
  await cacheSet(invalidKeyMarkerKey(keyHash), 1, INVALID_KEY_TTL_SECONDS);
}

async function invalidateAuthCache(keyHash: string) {
  try {
    await getRedis().unlink([`apikey:auth:${keyHash}`, invalidKeyMarkerKey(keyHash)]);
  } catch (error) {
    logger.warn("Failed to invalidate API key auth cache", error);
  }
}

/**
 * V-122 (API-key half). Deleting `apikey:auth:{hash}` is not enough on its own: a validateKey()
 * that read the row from Postgres just before the revoke committed can SETEX the old, active
 * record after our DEL and keep the key alive for the full auth-cache TTL. A short-lived negative
 * marker, written before the DEL and checked first by validateKey(), closes that window: it
 * outlives any stale positive entry that raced it (the stale SETEX's own TTL is the same length
 * and started no later than the marker plus a few ms of slack). Only terminal transitions
 * (revoke, rotate, delete, account deletion) write it; plain cache invalidation
 * (`invalidateAuthCacheForUser`) must not, or it would lock every live key for the marker's
 * lifetime.
 */
const REVOKED_MARKER_TTL_SECONDS = AUTH_CACHE_TTL_SECONDS + 30;

function revokedMarkerKey(keyHash: string) {
  return `apikey:revoked:${keyHash}`;
}

async function markKeyRevoked(keyHash: string) {
  try {
    await cacheSet(revokedMarkerKey(keyHash), 1, REVOKED_MARKER_TTL_SECONDS);
  } catch (error) {
    logger.warn("Failed to write API key revoked marker", error);
  }

  await invalidateAuthCache(keyHash);
}

/** True when the key is revoked or known invalid; one MGET for both markers. */
async function isKeyMarkedRevoked(keyHash: string) {
  try {
    const markers = await getRedis().mGet([
      revokedMarkerKey(keyHash),
      invalidKeyMarkerKey(keyHash),
    ]);
    return markers.some((marker) => marker != null);
  } catch (error) {
    logger.warn("Failed to read API key revoked marker", error);
    return false;
  }
}

async function invalidateProfileCache(userId: string) {
  await cacheDel(userProfileCacheKey(userId));
}

async function setAuthCache(record: ApiKeyAuthRecord) {
  try {
    await cacheSet(`apikey:auth:${record.keyHash}`, record, AUTH_CACHE_TTL_SECONDS);
  } catch (error) {
    logger.warn("Failed to set API key auth cache", error);
  }
}

async function getAuthCache(keyHash: string) {
  try {
    return await cacheGet<ApiKeyAuthRecord>(`apikey:auth:${keyHash}`);
  } catch (error) {
    logger.warn("Failed to read API key auth cache", error);
    return null;
  }
}

/** Live (active, unrevoked, unexpired) keys one user may hold (V-242). */
export const MAX_LIVE_API_KEYS_PER_USER = 10;

export class ApiKeyService {
  static async generateKey(userId: string, input: ApiKeyCreateInput) {
    const rawKey = generateRawKey();

    const scopes = normalizeScopes(input.scopes);
    const expiresAt = getExpiryDate(input.expiresAt ?? null);

    const hashedKey = hashKey(rawKey);

    // One cap per user (V-242): each key carries its own rate limit, so without it N keys were N
    // times the budget. Counted and created under the user's advisory lock, so two racing
    // creates at the cap cannot both pass the count.
    const created = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`apikeys:${userId}`}))`;
      const now = new Date();
      const live = await tx.apiKey.count({
        where: {
          userId,
          isActive: true,
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      });
      if (live >= MAX_LIVE_API_KEYS_PER_USER)
        throw new ApiError(
          409,
          `You can have at most ${MAX_LIVE_API_KEYS_PER_USER} active API keys. Revoke one you no longer use first.`,
          { code: "API_KEY_LIMIT", limit: MAX_LIVE_API_KEYS_PER_USER },
        );

      return tx.apiKey.create({
        data: {
          keyHash: hashedKey,
          keyPrefix: keyPrefix(rawKey),
          keySuffix: keySuffix(rawKey),
          name: input.name,
          scopes,
          userId,
          rateLimit: normalizeRateLimit(input.rateLimit),
          expiresAt,
        },
        select: {
          id: true,
          keyPrefix: true,
          keySuffix: true,
          name: true,
          userId: true,
          isActive: true,
          rateLimit: true,
          scopes: true,
          expiresAt: true,
          revokedAt: true,
          createdAt: true,
          updatedAt: true,
          lastUsed: true,
        },
      });
    });

    await Promise.all([invalidateProfileCache(userId), invalidateAuthCache(hashedKey)]);
    return { ...created, key: rawKey } satisfies ApiKeyCreateResult;
  }

  static async validateKey(key: string) {
    const normalizedKey = normalizeKeyForHash(key);
    const keyHash = hashKey(normalizedKey);

    // A key is valid iff `isActive && !revokedAt && (expiresAt == null || expiresAt > now)`.
    // Nothing about the user's billing state takes part (V-140): the old check rejected a key
    // when the user's most recently *updated* subscription row was CANCELED/INACTIVE, which
    // locked out every past subscriber (and anyone with a newer cancelled row for a different
    // product, or a `past_due`/`paused` row) while never-paid users, who have no row at all,
    // passed. Product-level gating, if ever wanted, belongs on entitlements, not here.
    if (await isKeyMarkedRevoked(keyHash)) return null;

    const cached = await getAuthCache(keyHash);

    if (cached && cached.isActive && !isExpired(cached.expiresAt) && !cached.revokedAt) {
      void this.touchLastUsed(cached.id);

      return cached;
    }

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        keyHash,
        isActive: true,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!apiKey) {
      await markKeyInvalid(keyHash);
      return null;
    }

    const authRecord: ApiKeyAuthRecord = {
      id: apiKey.id,
      keyHash: apiKey.keyHash,
      keyPrefix: apiKey.keyPrefix,
      keySuffix: apiKey.keySuffix,
      name: apiKey.name,
      userId: apiKey.userId,
      isActive: apiKey.isActive,
      rateLimit: apiKey.rateLimit,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt ? apiKey.expiresAt.toISOString() : null,
      revokedAt: apiKey.revokedAt ? apiKey.revokedAt.toISOString() : null,
      createdAt: apiKey.createdAt.toISOString(),
      updatedAt: apiKey.updatedAt.toISOString(),
      lastUsed: apiKey.lastUsed ? apiKey.lastUsed.toISOString() : null,
      user: {
        id: apiKey.user.id,
        email: apiKey.user.email,
        name: apiKey.user.name,
      },
    };

    void setAuthCache(authRecord);
    void this.touchLastUsed(apiKey.id);

    return authRecord;
  }

  private static async touchLastUsed(keyId: string) {
    try {
      const redis = getRedis();

      const throttleKey = `apikey:lastused:touch:${keyId}`;

      const shouldWrite = await redis.set(throttleKey, "1", {
        NX: true,
        EX: LAST_USED_UPDATE_INTERVAL_SECONDS,
      });

      if (shouldWrite !== "OK") {
        return;
      }
    } catch {
      return;
    }

    prisma.apiKey
      .update({
        where: { id: keyId },
        data: { lastUsed: new Date() },
      })
      .catch((err) => logger.error("Failed to update API key lastUsed", err));
  }

  static async listKeysPaginated(userId: string, query: ApiKeyListQuery) {
    const [items, total] = await Promise.all([
      prisma.apiKey.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: query.limit,
        skip: query.offset,
        select: {
          id: true,
          keyPrefix: true,
          name: true,
          isActive: true,
          createdAt: true,
          lastUsed: true,
          // V-195: the studio labels a key "Expired" or "Revoked" from these.
          expiresAt: true,
          revokedAt: true,
        },
      }),
      prisma.apiKey.count({ where: { userId } }),
    ]);

    return { items: items satisfies ApiKeyListRecord[], total };
  }

  static async getKey(userId: string, keyId: string) {
    return prisma.apiKey.findFirst({
      where: { id: keyId, userId },
      select: {
        id: true,
        keyPrefix: true,
        keySuffix: true,
        name: true,
        userId: true,
        isActive: true,
        rateLimit: true,
        scopes: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true,
        lastUsed: true,
      },
    });
  }

  static async revokeKey(userId: string, keyId: string) {
    const existing = await prisma.apiKey.findFirst({
      where: { id: keyId, userId },
      select: { id: true, keyHash: true, revokedAt: true },
    });

    if (!existing) return 0;

    // Revoking is terminal and idempotent: a key that is already revoked (by the user, by a
    // rotate that retired it, or by a racing second click) keeps its original `revokedAt` and
    // the call still succeeds.
    if (existing.revokedAt) return 1;

    // Marker first, DB second. A crash in between fails closed for the marker's lifetime; the
    // other order would leave a revoked key authenticating from the cache for the full TTL.
    await markKeyRevoked(existing.keyHash);

    await prisma.apiKey.updateMany({
      where: {
        id: keyId,
        userId,
        revokedAt: null,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    await invalidateProfileCache(userId);

    return 1;
  }

  static async rotateKey(
    userId: string,
    keyId: string,
    input: Partial<ApiKeyCreateInput> = {},
  ): Promise<ApiKeyRotateResult | null> {
    const rawKey = generateRawKey();
    const hashedKey = hashKey(rawKey);

    // V-123: the whole precondition → retire → create sequence runs in one transaction, and the
    // retire step is a conditional updateMany whose count is the only thing that decides whether
    // this call owns the rotation. Two concurrent rotates (double-click) or a rotate racing a
    // revoke both contend on that row; the second to commit sees count 0 and rolls back, so the
    // user never ends up with two live keys or a live key they just revoked.
    const rotated = await prisma.$transaction(async (tx) => {
      const current = await tx.apiKey.findFirst({
        where: { id: keyId, userId },
        select: {
          id: true,
          keyHash: true,
          name: true,
          scopes: true,
          rateLimit: true,
          expiresAt: true,
          isActive: true,
          revokedAt: true,
        },
      });

      if (!current) return null;

      if (!current.isActive || current.revokedAt) {
        throw new ApiError(409, "Key is no longer active");
      }

      // V-051: an expired key is not rotated (the copy would inherit a past date and fail on
      // first use); the user creates a fresh key instead. Past this check `current.expiresAt` is
      // null or in the future, so copying it is safe.
      if (isExpired(current.expiresAt)) {
        throw new ApiError(409, "Key has expired, create a new one");
      }

      const scopes = normalizeScopes(input.scopes ?? current.scopes);
      const expiresAt = getExpiryDate(input.expiresAt ?? current.expiresAt ?? null);

      const retired = await tx.apiKey.updateMany({
        where: { id: current.id, userId, isActive: true, revokedAt: null },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });

      if (retired.count !== 1) {
        throw new ApiError(409, "Key is no longer active");
      }

      const created = await tx.apiKey.create({
        data: {
          keyHash: hashedKey,
          keyPrefix: keyPrefix(rawKey),
          keySuffix: keySuffix(rawKey),
          name: input.name?.trim() || current.name,
          scopes,
          userId,
          // V-196: the copy keeps the old key's limit as-is, so one an admin raised above the user
          // maximum survives the rotate; only a limit the caller asks for is clamped.
          rateLimit:
            input.rateLimit === undefined ? current.rateLimit : normalizeRateLimit(input.rateLimit),
          expiresAt,
        },
        select: {
          id: true,
          keyPrefix: true,
          keySuffix: true,
          name: true,
          userId: true,
          isActive: true,
          rateLimit: true,
          scopes: true,
          expiresAt: true,
          revokedAt: true,
          createdAt: true,
          updatedAt: true,
          lastUsed: true,
        },
      });

      return { created, previousId: current.id, previousKeyHash: current.keyHash };
    });

    if (!rotated) {
      return null;
    }

    // After commit only: a marker written before the rollback of a lost race would lock a key
    // that is still live.
    await markKeyRevoked(rotated.previousKeyHash);
    await Promise.all([invalidateProfileCache(userId), invalidateAuthCache(hashedKey)]);

    return { ...rotated.created, key: rawKey, rotatedFromId: rotated.previousId };
  }

  /**
   * Drop every cached auth record for a user's API keys (admin edits to a key). Key validity
   * depends on nothing outside the key row, so this is a plain cache drop: it deliberately does
   * NOT write the revoked marker, which would lock every live key for its lifetime. Must be
   * called while the key rows still exist, since the hashes are read from them.
   */
  static async invalidateAuthCacheForUser(userId: string) {
    const keys = await prisma.apiKey.findMany({
      where: { userId },
      select: { keyHash: true },
    });

    await Promise.all(keys.map((key) => invalidateAuthCache(key.keyHash)));

    // A validateKey() that read the row just before an admin reactivation committed can write
    // the negative marker after the delete above; drop it once more shortly afterwards.
    if (keys.length > 0) {
      const dropMarkers = async () => {
        try {
          await getRedis().unlink(keys.map((key) => invalidKeyMarkerKey(key.keyHash)));
        } catch (error) {
          logger.warn("Delayed API key negative-marker delete failed", error);
        }
      };
      setTimeout(() => void dropMarkers(), 1000).unref();
    }
  }

  /**
   * Terminal invalidation for every key of a user (account deletion): writes the revoked marker
   * for each key hash and then drops the auth entry, so a validateKey() that read a row just
   * before the cascade removed it cannot re-cache the key for the auth-cache TTL (V-122). Must
   * be called while the key rows still exist, since the hashes are read from them.
   */
  static async markAllRevokedForUser(userId: string) {
    const keys = await prisma.apiKey.findMany({
      where: { userId },
      select: { keyHash: true },
    });

    await Promise.all(keys.map((key) => markKeyRevoked(key.keyHash)));
  }

  /**
   * Terminal cache invalidation for a key the caller identifies by id only (the admin module,
   * which must never see `keyHash`): writes the revoked marker and drops the auth entry, so an
   * admin revoke/disable stops the key at once instead of racing the cache repopulation
   * (V-122). Call it before the row is updated or deleted; no-op when the id is unknown.
   */
  static async markRevokedById(keyId: string) {
    const existing = await prisma.apiKey.findUnique({
      where: { id: keyId },
      select: { keyHash: true },
    });

    if (!existing) return;

    await markKeyRevoked(existing.keyHash);
  }

  /**
   * Undoes `markRevokedById` for an admin re-enable (V-188): without this the marker from the
   * disable keeps refusing the key for up to its TTL after the row is active again. Only a key
   * that is live in the row (active, never revoked) is cleared; a revoked key stays terminal.
   * Call it after the row update has committed.
   */
  static async clearRevokedMarkerById(keyId: string) {
    const existing = await prisma.apiKey.findUnique({
      where: { id: keyId },
      select: { keyHash: true, isActive: true, revokedAt: true },
    });

    if (!existing || !existing.isActive || existing.revokedAt) return;

    try {
      await getRedis().unlink([revokedMarkerKey(existing.keyHash)]);
    } catch (error) {
      logger.warn("Failed to clear API key revoked marker", error);
    }

    await invalidateAuthCache(existing.keyHash);
  }

  static async deleteKey(userId: string, keyId: string) {
    const existing = await prisma.apiKey.findFirst({
      where: { id: keyId, userId },
      select: { id: true, keyHash: true },
    });

    if (!existing) {
      return 0;
    }

    // Marker before the row goes away (same reasoning as revokeKey).
    await markKeyRevoked(existing.keyHash);

    const deleted = await prisma.apiKey.deleteMany({
      where: {
        id: keyId,
        userId,
      },
    });

    await invalidateProfileCache(userId);

    return deleted.count;
  }
}
