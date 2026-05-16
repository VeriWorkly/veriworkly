import crypto from "crypto";

import { config } from "#config";

import { prisma } from "#utils/prisma";
import { logger } from "#utils/logger";
import { cacheDel, cacheGet, cacheSet, getRedis } from "#utils/redis";

const MAX_API_KEY_RATE_LIMIT = 20;

const DEFAULT_SCOPES = config.apiKeys.defaultScopes;
const DEFAULT_RATE_LIMIT = config.apiKeys.defaultRateLimit;
const AUTH_CACHE_TTL_SECONDS = config.apiKeys.authCacheTtlSeconds;
const DEFAULT_KEY_LIFETIME_DAYS = config.apiKeys.defaultKeyLifetimeDays;
const LAST_USED_UPDATE_INTERVAL_SECONDS = config.apiKeys.lastUsedTouchIntervalSeconds;

const ALLOWED_SCOPES = new Set([
  "user:read",
  "user:write",
  "resume:read",
  "resume:write",
  "roadmap:read",
  "roadmap:write",
  "github:read",
  "github:write",
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

type ApiKeyCreateResult = ApiKeyListRecord & { key: string };

type ApiKeyRotateResult = ApiKeyCreateResult & { rotatedFromId: string };

function normalizeScopes(scopes: string[] | undefined) {
  const sourceScopes = scopes && scopes.length > 0 ? scopes : DEFAULT_SCOPES;

  const normalizedScopes = Array.from(
    new Set(sourceScopes.map((scope) => scope.trim()).filter(Boolean)),
  );

  const invalidScopes = normalizedScopes.filter((scope) => !ALLOWED_SCOPES.has(scope));

  if (invalidScopes.length > 0)
    throw new Error(`Unsupported API key scope(s): ${invalidScopes.join(", ")}`);

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

function hashKey(key: string) {
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

async function invalidateAuthCache(keyHash: string) {
  try {
    await cacheDel(`apikey:auth:${keyHash}`);
  } catch (error) {
    logger.warn("Failed to invalidate API key auth cache", error);
  }
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

export class ApiKeyService {
  static hashKey(key: string) {
    return hashKey(key);
  }

  static async generateKey(userId: string, input: ApiKeyCreateInput) {
    const rawKey = generateRawKey();

    const scopes = normalizeScopes(input.scopes);
    const expiresAt = getExpiryDate(input.expiresAt ?? null);

    const hashedKey = hashKey(rawKey);

    const created = await prisma.apiKey.create({
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

    return { ...created, key: rawKey } satisfies ApiKeyCreateResult;
  }

  static async validateKey(key: string) {
    const normalizedKey = normalizeKeyForHash(key);
    const keyHash = hashKey(normalizedKey);

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
      user: apiKey.user,
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

  static async listKeys(userId: string) {
    return this.listKeysPaginated(userId, { limit: 100, offset: 0 });
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
      }),
      prisma.apiKey.count({ where: { userId } }),
    ]);

    return { items: items satisfies ApiKeyListRecord[], total };
  }

  static async revokeKey(userId: string, keyId: string) {
    const existing = await prisma.apiKey.findFirst({
      where: { id: keyId, userId },
      select: { id: true, keyHash: true },
    });

    if (!existing) return 0;

    const result = await prisma.apiKey.updateMany({
      where: {
        id: keyId,
        userId,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    await invalidateAuthCache(existing.keyHash);

    return result.count;
  }

  static async rotateKey(
    userId: string,
    keyId: string,
    input: Partial<ApiKeyCreateInput> = {},
  ): Promise<ApiKeyRotateResult | null> {
    const current = await prisma.apiKey.findFirst({
      where: { id: keyId, userId },
      select: {
        id: true,
        keyHash: true,
        name: true,
        scopes: true,
        rateLimit: true,
        expiresAt: true,
      },
    });

    if (!current) {
      return null;
    }

    const rawKey = generateRawKey();
    const hashedKey = hashKey(rawKey);

    const scopes = normalizeScopes(input.scopes ?? current.scopes);
    const expiresAt = getExpiryDate(input.expiresAt ?? current.expiresAt ?? null);

    const rotated = await prisma.$transaction(async (tx) => {
      await tx.apiKey.update({
        where: { id: current.id },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });

      const created = await tx.apiKey.create({
        data: {
          keyHash: hashedKey,
          keyPrefix: keyPrefix(rawKey),
          keySuffix: keySuffix(rawKey),
          name: input.name?.trim() || current.name,
          scopes,
          userId,
          rateLimit: normalizeRateLimit(input.rateLimit ?? current.rateLimit),
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

      return created;
    });

    await invalidateAuthCache(current.keyHash);

    return { ...rotated, key: rawKey, rotatedFromId: current.id };
  }

  static async deleteKey(userId: string, keyId: string) {
    const existing = await prisma.apiKey.findFirst({
      where: { id: keyId, userId },
      select: { id: true, keyHash: true },
    });

    if (!existing) {
      return 0;
    }

    const deleted = await prisma.apiKey.deleteMany({
      where: {
        id: keyId,
        userId,
      },
    });

    await invalidateAuthCache(existing.keyHash);

    return deleted.count;
  }
}
