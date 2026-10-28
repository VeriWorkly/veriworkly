import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { prisma } from "#lib/prisma";
import { ApiError } from "#lib/errors";
import { assertConfirmation } from "#services/admin/adminConfirmation";
import { ApiKeyService } from "#services/apiKeyService";

import type {
  adminApiKeyListQuerySchema,
  adminApiKeyUpdateSchema,
} from "#validators/admin/adminApiKeyValidator";
import { listPage } from "#utils/pagination";

type ApiKeyListQuery = z.infer<typeof adminApiKeyListQuerySchema>;
type ApiKeyUpdateInput = z.infer<typeof adminApiKeyUpdateSchema>;

/**
 * `keyHash` is deliberately absent from every selection in this module. An admin can disable
 * or revoke a key but must never be able to read material that would let them impersonate the
 * key's owner.
 */
const API_KEY_SELECT = {
  id: true,
  name: true,
  keyPrefix: true,
  keySuffix: true,
  scopes: true,
  isActive: true,
  rateLimit: true,
  expiresAt: true,
  revokedAt: true,
  lastUsed: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ApiKeySelect;

/**
 * A key that authenticates right now: enabled, not revoked and not expired, the rule
 * `ApiKeyService` validates with (V-271). An expired key used to count as active.
 */
function usableKeyWhere(now: Date): Prisma.ApiKeyWhereInput {
  return { isActive: true, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
}

export async function getApiKeySummary() {
  const now = new Date();

  const [total, active, revoked, expired, usedLast7Days] = await Promise.all([
    prisma.apiKey.count(),
    prisma.apiKey.count({ where: usableKeyWhere(now) }),
    prisma.apiKey.count({ where: { revokedAt: { not: null } } }),
    prisma.apiKey.count({ where: { expiresAt: { lte: now } } }),
    prisma.apiKey.count({
      where: { lastUsed: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return { total, active, revoked, expired, usedLast7Days };
}

export async function listApiKeys(query: ApiKeyListQuery) {
  const now = new Date();
  const where: Prisma.ApiKeyWhereInput = {
    ...(query.userId ? { userId: query.userId } : {}),
    // The same rule as the summary's `active` count, so the filter lists what it counted.
    ...(query.active !== undefined
      ? query.active
        ? usableKeyWhere(now)
        : { NOT: usableKeyWhere(now) }
      : {}),
    ...(query.query
      ? {
          AND: [
            {
              OR: [
                { name: { contains: query.query, mode: "insensitive" } },
                { keyPrefix: { contains: query.query, mode: "insensitive" } },
                { user: { email: { contains: query.query, mode: "insensitive" } } },
              ],
            },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.apiKey.findMany({
      where,
      select: API_KEY_SELECT,
      orderBy: query.sort === "lastUsed" ? { lastUsed: "desc" } : { createdAt: "desc" },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.apiKey.count({ where }),
  ]);

  return listPage(items, total, query);
}

export async function updateApiKey(apiKeyId: string, input: ApiKeyUpdateInput) {
  const existing = await prisma.apiKey.findUnique({
    where: { id: apiKeyId },
    select: { id: true, isActive: true, rateLimit: true, userId: true },
  });

  if (!existing) throw new ApiError(404, "API key not found.");

  // Disabling is a terminal-style transition for the cache: the revoked marker (written before
  // the row changes) stops the key at once, even if a validateKey() read raced this update and
  // re-caches the old active record afterwards (V-122). Enabling clears it again once the row
  // is active (below), so Enable works at once instead of after the marker's TTL (V-188).
  if (input.isActive === false) await ApiKeyService.markRevokedById(apiKeyId);

  const updated = await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: {
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.rateLimit !== undefined ? { rateLimit: input.rateLimit } : {}),
    },
    select: API_KEY_SELECT,
  });

  // validateKey() caches the whole auth record (isActive, rateLimit, revokedAt included), so a
  // rate-limit change keeps serving the old limit until that entry expires unless it is evicted.
  await ApiKeyService.invalidateAuthCacheForUser(existing.userId);

  if (input.isActive === true) await ApiKeyService.clearRevokedMarkerById(apiKeyId);

  return { apiKey: updated, previous: existing };
}

/** `confirm` is the key prefix the admin retyped (V-082), checked before anything changes. */
export async function revokeApiKey(apiKeyId: string, confirm?: string) {
  const existing = await prisma.apiKey.findUnique({
    where: { id: apiKeyId },
    select: { id: true, revokedAt: true, userId: true, keyPrefix: true },
  });

  if (!existing) throw new ApiError(404, "API key not found.");
  assertConfirmation(confirm, existing.keyPrefix, "API key's prefix");
  if (existing.revokedAt) throw new ApiError(409, "This API key is already revoked.");

  // Marker before the row update: see updateApiKey and ApiKeyService.markRevokedById (V-122).
  await ApiKeyService.markRevokedById(apiKeyId);

  const updated = await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: { isActive: false, revokedAt: new Date() },
    select: API_KEY_SELECT,
  });

  await ApiKeyService.invalidateAuthCacheForUser(existing.userId);

  return updated;
}
