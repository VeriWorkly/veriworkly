import { auth } from "#auth/index";

import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";
import { revokeSessionCaches } from "#utils/authCache";

/**
 * Revoking a session means clearing it from THREE independent stores. Deleting the Postgres row
 * on its own does nothing observable, because better-auth is configured with `secondaryStorage`
 * and its `findSession` reads Redis first and returns without ever querying the database — so a
 * raw `prisma.session.deleteMany()` leaves the user fully authenticated until the Redis entry
 * expires on its own (`AUTH_SESSION_TTL_SECONDS`, 30 days by default).
 *
 * The three stores:
 *   1. better-auth's session-by-token entry in Redis  -> internalAdapter.deleteSessions()
 *   2. better-auth's `active-sessions-<userId>` index  -> deleted here; note that the *plural*
 *      deleteSessions() does not prune it (only the singular deleteSession() does)
 *   3. this app's own `auth:session:<token-hash>` cache -> revokeSessionCaches(), which also
 *      leaves a tombstone so a lookup already in flight cannot re-cache it (V-122)
 *
 * A raw Prisma delete also bypasses better-auth's `databaseHooks.session.delete.after`, which is
 * what would otherwise have called revokeSessionCaches for us. Always route session removal
 * through this module rather than deleting `session` rows directly.
 *
 * better-auth's `cookieCache` is off (`auth/index.ts`) and the middleware passes
 * `disableCookieCache`, so a `session_data` cookie a client still holds can never answer for the
 * store: once these three are cleared, the next request is 401 (V-369 / V-312).
 */
export async function revokeAllSessionsForUser(userId: string): Promise<number> {
  const sessions = await prisma.session.findMany({
    where: { userId },
    select: { token: true },
  });

  if (!sessions.length) return 0;

  const tokens = sessions.map((session) => session.token);
  const context = await auth.$context;

  await context.internalAdapter.deleteSessions(tokens);
  // better-auth's secondary storage logs and swallows Redis errors, so its deletes above can
  // fail silently. Strict (V-259): its per-token entries and the active-sessions index are
  // deleted again here, with our own cache, and anything Redis does not confirm throws, so a
  // caller never reports a revocation that did not happen.
  await revokeSessionCaches(tokens, {
    strict: true,
    extraKeys: [...tokens, `active-sessions-${userId}`],
  });

  return tokens.length;
}

/**
 * Same as revokeAllSessionsForUser, but tolerates failure. Used on paths where the primary
 * action (deleting a user) must not be blocked by a cache-eviction problem — the rows are gone
 * from Postgres via cascade either way, so the worst case is a stale Redis entry rather than a
 * failed delete.
 */
export async function revokeAllSessionsForUserSafely(userId: string): Promise<void> {
  try {
    await revokeAllSessionsForUser(userId);
  } catch (error) {
    logger.error("Failed to revoke sessions during user teardown", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
