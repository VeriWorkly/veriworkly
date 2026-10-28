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
import {
  ADMIN_AUDIT_ACTIONS,
  writeAdminAudit,
  type AdminAuditInput,
} from "#services/admin/adminAuditService";

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
      // Postgres puts NULLs first under DESC: never-used keys go last (V-296).
      orderBy:
        query.sort === "lastUsed"
          ? [{ lastUsed: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }]
          : { createdAt: "desc" },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.apiKey.count({ where }),
  ]);

  return listPage(items, total, query);
}

/**
 * The row change and its audit entry commit together (V-291): an operator never disables,
 * re-quotas or revokes a key with no record of it. The revoked marker still goes first (V-122);
 * if the transaction fails it is taken back, unless the key is off anyway (disabled before, or
 * revoked by a concurrent request).
 */
async function withRevokedMarker<T>(apiKeyId: string, run: () => Promise<T>): Promise<T> {
  await ApiKeyService.markRevokedById(apiKeyId);
  try {
    return await run();
  } catch (error) {
    const row = await prisma.apiKey.findUnique({
      where: { id: apiKeyId },
      select: { isActive: true, revokedAt: true },
    });
    if (row?.isActive && !row.revokedAt) await ApiKeyService.clearRevokedMarkerById(apiKeyId);
    throw error;
  }
}

export async function updateApiKey(
  apiKeyId: string,
  input: ApiKeyUpdateInput,
  audit?: Pick<AdminAuditInput, "actorId" | "reason">,
) {
  const existing = await prisma.apiKey.findUnique({
    where: { id: apiKeyId },
    select: { id: true, isActive: true, rateLimit: true, userId: true, revokedAt: true },
  });

  if (!existing) throw new ApiError(404, "API key not found.");
  // A revocation is permanent: `validateKey` refuses any key with `revokedAt`, so "enabling"
  // one would report success and change nothing (V-293).
  if (input.isActive === true && existing.revokedAt)
    throw new ApiError(
      409,
      "This API key was revoked, which is permanent. The owner can create a new key.",
    );

  const write = () =>
    prisma.$transaction(async (tx) => {
      // Conditional on the key not being revoked when it is enabled (V-293): a revoke that commits
      // after the read above is not undone, and the enable is a 409.
      const { count } = await tx.apiKey.updateMany({
        where: { id: apiKeyId, ...(input.isActive === true ? { revokedAt: null } : {}) },
        data: {
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.rateLimit !== undefined ? { rateLimit: input.rateLimit } : {}),
        },
      });
      if (count === 0)
        throw new ApiError(
          409,
          "This API key was revoked, which is permanent. The owner can create a new key.",
        );
      const updated = await tx.apiKey.findUniqueOrThrow({
        where: { id: apiKeyId },
        select: API_KEY_SELECT,
      });
      if (audit)
        await writeAdminAudit(tx, {
          ...audit,
          action: ADMIN_AUDIT_ACTIONS.apiKeyUpdate,
          targetType: "ApiKey",
          targetId: apiKeyId,
          metadata: {
            ownerId: existing.userId,
            previousIsActive: existing.isActive,
            previousRateLimit: existing.rateLimit,
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
            ...(input.rateLimit !== undefined ? { rateLimit: input.rateLimit } : {}),
          },
        });
      return updated;
    });

  // Disabling is a terminal-style transition for the cache: the revoked marker (written before
  // the row changes) stops the key at once, even if a validateKey() read raced this update and
  // re-caches the old active record afterwards (V-122). Enabling clears it again once the row
  // is active (below), so Enable works at once instead of after the marker's TTL (V-188).
  const updated =
    input.isActive === false ? await withRevokedMarker(apiKeyId, write) : await write();

  // validateKey() caches the whole auth record (isActive, rateLimit, revokedAt included), so a
  // rate-limit change keeps serving the old limit until that entry expires unless it is evicted.
  await ApiKeyService.invalidateAuthCacheForUser(existing.userId);

  if (input.isActive === true) await ApiKeyService.clearRevokedMarkerById(apiKeyId);

  return updated;
}

/**
 * `confirm` is the key prefix the admin retyped (V-082), required and checked before anything
 * changes: no revoked marker, no row update. The audit entry commits with the revoke (V-291).
 */
export async function revokeApiKey(
  apiKeyId: string,
  confirm: string | undefined,
  audit?: Pick<AdminAuditInput, "actorId" | "reason">,
) {
  const existing = await prisma.apiKey.findUnique({
    where: { id: apiKeyId },
    select: { id: true, revokedAt: true, userId: true, keyPrefix: true },
  });

  if (!existing) throw new ApiError(404, "API key not found.");
  assertConfirmation(confirm, existing.keyPrefix, "API key's prefix");
  if (existing.revokedAt) throw new ApiError(409, "This API key is already revoked.");

  // Marker before the row update: see updateApiKey and ApiKeyService.markRevokedById (V-122).
  const updated = await withRevokedMarker(apiKeyId, () =>
    prisma.$transaction(async (tx) => {
      // Conditional, so a second concurrent revoke is a 409 and audits nothing.
      const { count } = await tx.apiKey.updateMany({
        where: { id: apiKeyId, revokedAt: null },
        data: { isActive: false, revokedAt: new Date() },
      });
      if (count === 0) throw new ApiError(409, "This API key is already revoked.");
      const row = await tx.apiKey.findUniqueOrThrow({
        where: { id: apiKeyId },
        select: API_KEY_SELECT,
      });
      if (audit)
        await writeAdminAudit(tx, {
          ...audit,
          action: ADMIN_AUDIT_ACTIONS.apiKeyRevoke,
          targetType: "ApiKey",
          targetId: apiKeyId,
          metadata: { ownerId: row.user.id, name: row.name },
        });
      return row;
    }),
  );

  await ApiKeyService.invalidateAuthCacheForUser(existing.userId);

  return updated;
}
