import { createHash } from "node:crypto";

import { Prisma, type CreditTransaction } from "@prisma/client";

import { getAiModePolicy } from "#services/aiPolicy";
import type { AiActionKey, AiMode } from "#services/aiTypes";
import { ApiError } from "#lib/errors";
import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";
import { cacheDel, cacheGet, cacheSet } from "#lib/redis";
import { CREDIT_SOURCES, PAID_CREDIT_SOURCES } from "#services/creditSources";

const CREDIT_SUMMARY_TTL_SECONDS = 30;
const CREDIT_HISTORY_TTL_SECONDS = 60;
const CREDIT_HISTORY_LIMIT = 50;
/**
 * Must outlive the slowest AI run that holds a reservation open, or a concurrent wallet read
 * expires the reservation and the commit 409s after the provider was paid. Worst case today:
 * `(retries + 1) × AI_TIMEOUT_MS` with retries ≤ 2 (`ats/aiPolicy.ts`) and `AI_TIMEOUT_MS` 120 s
 * (`config.ts`) = 360 s, plus 1 s + 2 s backoff and up to two honoured 60 s `retry-after` waits
 * = 483 s. 900 s keeps a margin above that; lowering the AI timeout only widens the margin.
 */
const CREDIT_RESERVATION_TTL_MS = 15 * 60 * 1000;

/**
 * Every transaction in this file walks a variable-length list of grants or reservations with one
 * conditional write per item. Prisma's 5s default is enough for the common single-grant case but
 * not for an account with many stacked grants under pool contention — and a P2028 abort here
 * surfaces to the user as a failed AI action they were never charged for but also never got.
 */
const CREDIT_TRANSACTION_OPTIONS = { timeout: 15_000, maxWait: 8_000 } as const;

type CreditContext = {
  requestId: string;
  action?: string;
  documentId?: string;
  referenceId?: string;
  reason?: string;
  metadata?: Prisma.InputJsonValue;
  /** Who performed the operation when it was not the wallet owner (admin adjustments). */
  actorId?: string;
  /**
   * Runs inside the ledger transaction once the transaction row exists, and only for a new row (a
   * replayed request id returns the stored row and skips it). The admin paths write their audit
   * entry here so it commits with the adjustment or not at all (V-074).
   */
  onWrite?: (tx: Prisma.TransactionClient, transaction: CreditTransaction) => Promise<void>;
  /**
   * The ledger row's type when it is not a plain GRANT or DEBIT (V-011): an admin adjustment is
   * written as ADJUSTMENT, so money reports never count goodwill as paid credit or as AI spend.
   */
  ledgerType?: "ADJUSTMENT";
};

type CreditGrantContext = CreditContext & {
  source: string;
  sourceId: string;
  expiresAt?: Date | null;
  /**
   * Earlier grants this one replaces: subscription credits reset monthly, so a new month's
   * allowance ends whatever is left of the last one instead of adding to it. Matching grants
   * still valid after `at` are cut to expire at `at`, or now when `at` has passed, never
   * earlier: a reservation made before the cut was carved out of them and still commits from them
   * (its commit draws on grants valid at its `createdAt`), and the expiry sweep removes the rest
   * once no reservation is pending. Applied only when the new grant is written, so a replayed
   * request id cuts nothing.
   */
  supersedes?: { where: Prisma.CreditGrantWhereInput; at: Date };
};

type LockedWallet = { id: string; balance: number; reserved: number };
type LockedGrant = { id: string; remaining: number };

/**
 * The ledger key of an AI request (V-228). The client picks its request id (any 8-200
 * characters), and a committed request's id becomes the `CreditTransaction.requestId` in the same
 * per-user key space as the ids the server mints (`expire:<grant id>`, `annual-credit:...`,
 * `refund-clawback:...`). Unprefixed, a client id equal to one of those (grant ids are visible in
 * the credit history) would make that later ledger write fail and roll back, for good. Every
 * reservation path maps the caller's id here, so no client needs to change and no client id can
 * reach the server's prefixes.
 */
function aiRequestKey(requestId: string) {
  return `ai:${requestId}`;
}

/**
 * A reservation by the caller's request id: under the `ai:` key, or under the bare id it was
 * stored with before V-228 (a request in flight across the deploy, or one still in its replay
 * window).
 */
async function findReservation(
  tx: Prisma.TransactionClient,
  userId: string,
  clientRequestId: string,
) {
  return (
    (await tx.creditReservation.findUnique({
      where: { userId_requestId: { userId, requestId: aiRequestKey(clientRequestId) } },
    })) ??
    (await tx.creditReservation.findUnique({
      where: { userId_requestId: { userId, requestId: clientRequestId } },
    }))
  );
}

function validateAmount(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0)
    throw new ApiError(400, "Credit amount must be a positive integer.");
}

function summaryCacheKey(userId: string) {
  return `credits:summary:${userId}`;
}

function historyCacheKey(userId: string) {
  // v3: rows are the user-facing shape (V-200). A list cached as v1 still carries the admin's
  // id in its metadata, and one cached as v2 the internal reference ids; neither is served.
  return `credits:history:v3:${userId}`;
}

/** Metadata keys that name an admin: an adjustment records who made it (`withActor`). */
const ADMIN_METADATA_KEY = /actor/i;

/**
 * A ledger row as its owner sees it (V-200): what the credits page shows, without the admin who
 * made an adjustment. The request id is left out as well (an admin adjustment's embeds the admin's
 * id), and so are the wallet and user ids the owner has no use for, and the reference id (a grant
 * id or the AI provider's completion id: internal keys the credits page never shows).
 */
function toUserHistoryRow(row: CreditTransaction) {
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? Object.fromEntries(
          Object.entries(row.metadata).filter(([key]) => !ADMIN_METADATA_KEY.test(key)),
        )
      : null;
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    balanceAfter: row.balanceAfter,
    action: row.action,
    documentId: row.documentId,
    reason: row.reason,
    metadata: metadata && Object.keys(metadata).length > 0 ? metadata : null,
    createdAt: row.createdAt,
  };
}

type UserHistoryRow = ReturnType<typeof toUserHistoryRow>;

/**
 * Every ledger mutation starts by locking the wallet row, so reserve, commit, release, consume
 * and both expiry sweeps for one user run strictly one after another; READ COMMITTED gives no
 * such guarantee on its own. Lock order everywhere is wallet → reservation → grants, which is
 * what keeps the sweeps and a commit from deadlocking on each other.
 */
async function lockWallet(tx: Prisma.TransactionClient, userId: string): Promise<LockedWallet> {
  const rows = await tx.$queryRaw<LockedWallet[]>`
    SELECT id, balance, reserved FROM "CreditWallet" WHERE "userId" = ${userId} FOR UPDATE`;
  const wallet = rows[0];
  if (!wallet) throw new ApiError(404, "Credit wallet was not found.");
  return wallet;
}

/**
 * Grants that are still valid as of `validAt`, oldest expiry first, row-locked: two allocators
 * can no longer both pass the `remaining >= amount` check against the same rows.
 */
function lockGrants(tx: Prisma.TransactionClient, walletId: string, validAt: Date) {
  return tx.$queryRaw<LockedGrant[]>`
    SELECT id, remaining FROM "CreditGrant"
    WHERE "walletId" = ${walletId} AND remaining > 0
      AND ("expiresAt" IS NULL OR "expiresAt" > ${validAt})
    ORDER BY "expiresAt" ASC NULLS LAST, "createdAt" ASC, id ASC
    FOR UPDATE`;
}

/** What the wallet can still spend: unexpired grant credits minus what pending reservations hold. */
async function availableCredits(tx: Prisma.TransactionClient, wallet: LockedWallet, at: Date) {
  const unexpired = await tx.creditGrant.aggregate({
    where: {
      walletId: wallet.id,
      remaining: { gt: 0 },
      OR: [{ expiresAt: null }, { expiresAt: { gt: at } }],
    },
    _sum: { remaining: true },
  });
  return Math.min(wallet.balance, (unexpired._sum.remaining ?? 0) - wallet.reserved);
}

/**
 * Expires what is left of a wallet's due grants (up to 100 per call): one EXPIRATION row per grant,
 * allocated to it. Runs under the caller's wallet lock with no reservation pending. `userId` is null
 * for a wallet detached by an account deletion (V-252): its ledger rows stay detached too.
 */
async function expireDueGrants(
  tx: Prisma.TransactionClient,
  wallet: LockedWallet,
  userId: string | null,
  at: Date,
) {
  const expired = await tx.creditGrant.findMany({
    where: { walletId: wallet.id, remaining: { gt: 0 }, expiresAt: { lte: at } },
    select: { id: true, remaining: true },
    take: 100,
  });
  let balance = wallet.balance;
  let expiredTotal = 0;
  for (const grant of expired) {
    const changed = await tx.creditGrant.updateMany({
      where: { id: grant.id, remaining: grant.remaining },
      data: { remaining: 0 },
    });
    if (!changed.count) continue;
    // Under the lock, with no reservation pending, the balance covers every expiring grant.
    // Clamping is the backstop that keeps a hand-edited ledger from going negative.
    const amount = Math.min(grant.remaining, balance);
    if (amount < grant.remaining)
      logger.warn("Credit expiry clamped: balance below the expiring grant", {
        userId,
        grantId: grant.id,
        balance,
        remaining: grant.remaining,
      });
    if (!amount) continue;
    balance -= amount;
    await tx.creditWallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: amount }, lifetimeDebited: { increment: amount } },
    });
    const transaction = await tx.creditTransaction.create({
      data: {
        walletId: wallet.id,
        userId,
        type: "EXPIRATION",
        amount: -amount,
        balanceAfter: balance,
        requestId: `expire:${grant.id}`,
        referenceId: grant.id,
        reason: "Credit grant expired",
      },
    });
    await tx.creditUsageAllocation.create({
      data: { transactionId: transaction.id, grantId: grant.id, amount },
    });
    expiredTotal += amount;
  }
  return expiredTotal;
}

/** Moves `cost` from `reserved` back to `balance`; refuses to take `reserved` below zero. */
async function refundReserved(tx: Prisma.TransactionClient, walletId: string, cost: number) {
  const changed = await tx.creditWallet.updateMany({
    where: { id: walletId, reserved: { gte: cost } },
    data: { balance: { increment: cost }, reserved: { decrement: cost } },
  });
  if (!changed.count) throw new ApiError(409, "Credit ledger is out of balance for this wallet.");
}

function withActor(metadata: Prisma.InputJsonValue | undefined, actorId: string | undefined) {
  if (!actorId) return metadata;
  const base = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
  return { ...base, actorId } satisfies Prisma.InputJsonValue;
}

/**
 * What a committed request stores so a retry of it can be answered (V-192): the response, and a
 * fingerprint of the request it answered. A retry is the same request only when its fingerprint
 * matches; anything else under that id is still "used for another operation".
 */
export type StoredReplay = { fingerprint: string; response: Prisma.InputJsonValue };

/** A stable digest of what a billed request asked for, for `StoredReplay.fingerprint`. */
export function replayFingerprint(request: unknown) {
  return createHash("sha256").update(JSON.stringify(request)).digest("hex");
}

function readReplay(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { fingerprint, response } = value as Record<string, Prisma.JsonValue | undefined>;
  if (typeof fingerprint !== "string" || response === undefined || response === null) return null;
  return { fingerprint, response };
}

function reservationConflict(
  existing: { userId: string; action: string; cost: number; status: string },
  userId: string,
  action: string,
  cost: number,
) {
  if (existing.userId !== userId || existing.action !== action || existing.cost !== cost)
    return new ApiError(409, "AI request id was already used for another operation.");
  if (existing.status === "PENDING") return new ApiError(409, "This AI request is processing.");
  if (existing.status === "COMMITTED")
    return new ApiError(409, "This AI request already completed.");
  return new ApiError(409, "This AI request id can no longer be reused.");
}

export class CreditService {
  static async invalidate(userId: string) {
    await Promise.all([
      cacheDel(summaryCacheKey(userId)),
      cacheDel(historyCacheKey(userId)),
      cacheDel(`billing:summary:${userId}`),
    ]);
  }

  static costFor(action: AiActionKey, mode: AiMode = "standard") {
    return getAiModePolicy(action, mode).credits;
  }

  static async releaseExpiredReservations(userId: string, at = new Date()) {
    const expired = await prisma.creditReservation.findMany({
      where: { userId, status: "PENDING", expiresAt: { lte: at } },
      select: { id: true, walletId: true, cost: true },
      take: 100,
    });
    if (!expired.length) return 0;

    const released = await prisma.$transaction(async (tx) => {
      await lockWallet(tx, userId);
      let total = 0;
      for (const reservation of expired) {
        const changed = await tx.creditReservation.updateMany({
          where: { id: reservation.id, status: "PENDING" },
          data: { status: "EXPIRED" },
        });
        if (!changed.count) continue;
        await refundReserved(tx, reservation.walletId, reservation.cost);
        total += reservation.cost;
      }
      return total;
    }, CREDIT_TRANSACTION_OPTIONS);
    if (released) await this.invalidate(userId);
    return released;
  }

  static async expireCredits(userId: string, at = new Date()) {
    const due = await prisma.creditGrant.findMany({
      where: { userId, remaining: { gt: 0 }, expiresAt: { lte: at } },
      select: { id: true },
      take: 1,
    });
    if (!due.length) return 0;
    // Cheap pre-check: while a reservation is pending the transaction below would only take the
    // wallet lock to defer, and this runs at the start of every `reserve` and `consume`. The
    // count inside the lock stays authoritative.
    if (await prisma.creditReservation.count({ where: { userId, status: "PENDING" } })) return 0;

    const total = await prisma.$transaction(async (tx) => {
      const wallet = await lockWallet(tx, userId);
      /**
       * Credits held by a pending reservation were carved out of these very grants, and the
       * commit deliberately still allocates from a grant that was valid when the reservation
       * was made. Expiring under it would debit a balance that no longer holds those credits.
       * Every PENDING row counts, including an overdue one the release sweep has not flipped
       * yet; the sweep runs first on every path, so the deferral lasts one call at most.
       */
      const pending = await tx.creditReservation.count({
        where: { walletId: wallet.id, status: "PENDING" },
      });
      if (pending) return 0;

      return expireDueGrants(tx, wallet, userId, at);
    }, CREDIT_TRANSACTION_OPTIONS);
    if (total) await this.invalidate(userId);
    return total;
  }

  /**
   * Read path (V-107): no sweep and no write. Expired credits may still sit in `balance` until a
   * write path (`reserve`, `consume`) or `sweepExpiredCredits` runs; `available` already leaves
   * them out, so nothing expired is ever shown as spendable.
   */
  static async getWallet(userId: string) {
    const cached = await cacheGet<{
      balance: number;
      reserved: number;
      available: number;
      lifetimeCredited: number;
      lifetimeDebited: number;
      nextExpiryAt: Date | null;
      nextExpiryCredits: number;
      updatedAt: Date;
    }>(summaryCacheKey(userId));
    if (cached) return cached;

    const now = new Date();
    const [row, nextGrant, unexpired] = await Promise.all([
      prisma.creditWallet.findUnique({
        where: { userId },
        select: {
          balance: true,
          reserved: true,
          lifetimeCredited: true,
          lifetimeDebited: true,
          updatedAt: true,
        },
      }),
      prisma.creditGrant.findFirst({
        where: { userId, remaining: { gt: 0 }, expiresAt: { gt: now } },
        orderBy: { expiresAt: "asc" },
        select: { expiresAt: true, remaining: true },
      }),
      prisma.creditGrant.aggregate({
        where: {
          userId,
          remaining: { gt: 0 },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        _sum: { remaining: true },
      }),
    ]);
    // A user who never earned a credit has no wallet row; the first grant creates it.
    const wallet = row ?? {
      balance: 0,
      reserved: 0,
      lifetimeCredited: 0,
      lifetimeDebited: 0,
      updatedAt: now,
    };
    const result = {
      ...wallet,
      // What `reserve` would accept right now. Differs from `balance` while an expiry is
      // deferred under a pending reservation: those credits show but cannot be spent.
      available: Math.max(
        0,
        Math.min(wallet.balance, (unexpired._sum.remaining ?? 0) - wallet.reserved),
      ),
      nextExpiryAt: nextGrant?.expiresAt ?? null,
      nextExpiryCredits: nextGrant?.remaining ?? 0,
    };
    await cacheSet(summaryCacheKey(userId), result, CREDIT_SUMMARY_TTL_SECONDS);
    return result;
  }

  /** Unexpired credits left from paid sources (`PAID_CREDIT_SOURCES`); goodwill grants excluded. */
  static async paidCreditsRemaining(userId: string, at = new Date()) {
    const paid = await prisma.creditGrant.aggregate({
      where: {
        userId,
        source: { in: [...PAID_CREDIT_SOURCES] },
        remaining: { gt: 0 },
        OR: [{ expiresAt: null }, { expiresAt: { gt: at } }],
      },
      _sum: { remaining: true },
    });
    return paid._sum.remaining ?? 0;
  }

  static async reserveAction(userId: string, action: AiActionKey, mode: AiMode, requestId: string) {
    const cost = this.costFor(action, mode);
    return this.reserve(userId, cost, action, requestId);
  }

  static async reserve(userId: string, cost: number, action: string, clientRequestId: string) {
    validateAmount(cost);
    const requestId = aiRequestKey(clientRequestId);
    await this.releaseExpiredReservations(userId);
    await this.expireCredits(userId);

    let reservation;
    try {
      reservation = await prisma.$transaction(async (tx) => {
        await tx.creditWallet.upsert({ where: { userId }, create: { userId }, update: {} });
        const wallet = await lockWallet(tx, userId);

        // After the lock: a same-requestId twin queued behind us sees our committed row here.
        const existing = await tx.creditReservation.findUnique({
          where: { userId_requestId: { userId, requestId } },
        });
        if (existing) throw reservationConflict(existing, userId, action, cost);
        // A request reserved before V-228 is stored under the bare id: still the same request.
        const legacy = await tx.creditReservation.findUnique({
          where: { userId_requestId: { userId, requestId: clientRequestId } },
        });
        if (legacy) throw reservationConflict(legacy, userId, action, cost);

        // `balance` alone still counts grants that expired under a pending reservation, so the
        // check is what the unexpired grants can cover beyond what other reservations hold.
        // The same instant becomes the reservation's `createdAt`, which the commit's grant
        // filter compares against: one app clock, no database-clock skew between the two.
        const now = new Date();
        if ((await availableCredits(tx, wallet, now)) < cost)
          throw new ApiError(402, "Not enough AI credits.");

        const changed = await tx.creditWallet.updateMany({
          where: { id: wallet.id, balance: { gte: cost } },
          data: { balance: { decrement: cost }, reserved: { increment: cost } },
        });
        if (!changed.count) throw new ApiError(409, "Credit balance changed. Retry the action.");

        return tx.creditReservation.create({
          data: {
            walletId: wallet.id,
            userId,
            requestId,
            action,
            cost,
            createdAt: now,
            expiresAt: new Date(now.getTime() + CREDIT_RESERVATION_TTL_MS),
          },
        });
      }, CREDIT_TRANSACTION_OPTIONS);
    } catch (error) {
      // Two reserves with one request id at once: the loser must get a clean 409, not a P2002.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await prisma.creditReservation.findUnique({
          where: { userId_requestId: { userId, requestId } },
        });
        throw existing
          ? reservationConflict(existing, userId, action, cost)
          : new ApiError(409, "This AI request is processing.");
      }
      throw error;
    }
    await this.invalidate(userId);
    return reservation;
  }

  /**
   * The stored response of a request this user already paid for, when `fingerprint` says the
   * retry is that same request (V-192). Null when there is nothing to replay: no such request,
   * not committed, committed without a stored response, or the retention job has cleared it;
   * the caller then reserves as usual and `reserve` answers any conflict. A committed request
   * with a stored response under a different fingerprint is another operation: 409.
   */
  static async storedResult(
    userId: string,
    clientRequestId: string,
    action: string,
    fingerprint: string,
  ): Promise<Prisma.JsonValue | null> {
    const select = { action: true, status: true, replay: true } as const;
    const reservation =
      (await prisma.creditReservation.findUnique({
        where: { userId_requestId: { userId, requestId: aiRequestKey(clientRequestId) } },
        select,
      })) ??
      // Committed before V-228, under the bare id, and still inside the replay window.
      (await prisma.creditReservation.findUnique({
        where: { userId_requestId: { userId, requestId: clientRequestId } },
        select,
      }));
    if (!reservation || reservation.status !== "COMMITTED") return null;
    const replay = readReplay(reservation.replay);
    if (!replay) return null;
    if (reservation.action !== action || replay.fingerprint !== fingerprint)
      throw new ApiError(409, "AI request id was already used for another operation.");
    return replay.response;
  }

  /**
   * Stores a committed request's response after the fact, for a path that only knows its full
   * response once the charge is made (the ATS analysis). Best effort: a failure here leaves the
   * request unreplayable (a retry answers 409, as before V-192) and never touches the charge.
   */
  static async attachReplay(userId: string, clientRequestId: string, replay: StoredReplay) {
    await prisma.creditReservation.updateMany({
      where: {
        userId,
        requestId: { in: [aiRequestKey(clientRequestId), clientRequestId] },
        status: "COMMITTED",
      },
      data: { replay },
    });
  }

  static async commitReservation(
    userId: string,
    clientRequestId: string,
    context: Omit<CreditContext, "requestId" | "action"> & {
      /**
       * Stored on the reservation in the same transaction as the charge, so a request that was
       * paid for can always be answered again (`storedResult`).
       */
      replay?: {
        fingerprint: string;
        /** Built from the ledger row, so the stored copy reports the balance this charge left. */
        response: (transaction: CreditTransaction) => Prisma.InputJsonValue;
      };
    },
  ) {
    const { replay, ...ledgerContext } = context;
    const requestId = aiRequestKey(clientRequestId);
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await findReservation(tx, userId, clientRequestId);
      if (!reservation) throw new ApiError(404, "AI credit reservation was not found.");

      // Wallet lock before the flip: the release sweep locks wallet → reservation, so taking
      // the reservation row first here would deadlock against it. The flip is conditional so a
      // reservation the sweep already expired cannot be charged a second time.
      const wallet = await lockWallet(tx, userId);
      const flipped = await tx.creditReservation.updateMany({
        where: { id: reservation.id, status: "PENDING" },
        data: { status: "COMMITTED" },
      });
      if (flipped.count !== 1)
        throw new ApiError(409, "AI credit reservation is no longer pending.");

      const grants = await lockGrants(tx, reservation.walletId, reservation.createdAt);
      let outstanding = reservation.cost;
      const allocations: Array<{ grantId: string; amount: number }> = [];
      for (const grant of grants) {
        if (!outstanding) break;
        const amount = Math.min(grant.remaining, outstanding);
        const changed = await tx.creditGrant.updateMany({
          where: { id: grant.id, remaining: { gte: amount } },
          data: { remaining: { decrement: amount } },
        });
        if (!changed.count) throw new ApiError(409, "Credit balance changed. Retry the action.");
        allocations.push({ grantId: grant.id, amount });
        outstanding -= amount;
      }
      if (outstanding) throw new ApiError(409, "Reserved credits are no longer available.");

      const settled = await tx.creditWallet.updateMany({
        where: { id: reservation.walletId, reserved: { gte: reservation.cost } },
        data: {
          reserved: { decrement: reservation.cost },
          lifetimeDebited: { increment: reservation.cost },
        },
      });
      if (!settled.count)
        throw new ApiError(409, "Credit ledger is out of balance for this wallet.");
      const { actorId, metadata, onWrite, ...rest } = ledgerContext;
      const transaction = await tx.creditTransaction.create({
        data: {
          walletId: reservation.walletId,
          userId,
          type: "DEBIT",
          amount: -reservation.cost,
          balanceAfter: wallet.balance,
          requestId,
          action: reservation.action,
          ...rest,
          metadata: withActor(metadata, actorId),
        },
      });
      await tx.creditUsageAllocation.createMany({
        data: allocations.map((item) => ({ transactionId: transaction.id, ...item })),
      });
      if (replay)
        await tx.creditReservation.update({
          where: { id: reservation.id },
          data: {
            replay: {
              fingerprint: replay.fingerprint,
              response: replay.response(transaction),
            } satisfies StoredReplay,
          },
        });
      if (onWrite) await onWrite(tx, transaction);
      return transaction;
    }, CREDIT_TRANSACTION_OPTIONS);
    await this.invalidate(userId);
    return result;
  }

  static async releaseReservation(userId: string, clientRequestId: string) {
    const released = await prisma.$transaction(async (tx) => {
      const reservation = await findReservation(tx, userId, clientRequestId);
      if (!reservation || reservation.status !== "PENDING") return false;
      await lockWallet(tx, userId);
      const changed = await tx.creditReservation.updateMany({
        where: { id: reservation.id, status: "PENDING" },
        data: { status: "RELEASED" },
      });
      if (!changed.count) return false;
      await refundReserved(tx, reservation.walletId, reservation.cost);
      return true;
    }, CREDIT_TRANSACTION_OPTIONS);
    if (released) await this.invalidate(userId);
    return released;
  }

  /** The owner's ledger, newest first, in the user-facing shape (`toUserHistoryRow`). */
  static async getHistory(userId: string, take = CREDIT_HISTORY_LIMIT) {
    if (take === CREDIT_HISTORY_LIMIT) {
      const cached = await cacheGet<UserHistoryRow[]>(historyCacheKey(userId));
      if (cached) return cached;
    }
    const rows = await prisma.creditTransaction.findMany({
      where: { userId },
      // The id breaks ties: rows written in one transaction share a timestamp.
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: Math.min(Math.max(take, 1), 100),
    });
    const result = rows.map(toUserHistoryRow);
    if (take === CREDIT_HISTORY_LIMIT)
      await cacheSet(historyCacheKey(userId), result, CREDIT_HISTORY_TTL_SECONDS);
    return result;
  }

  static async consume(userId: string, cost: number, context: CreditContext) {
    validateAmount(cost);
    // Release first: an overdue PENDING reservation would otherwise defer the expiry below and
    // keep holding credits an admin debit should be able to reach.
    await this.releaseExpiredReservations(userId);
    await this.expireCredits(userId);

    const result = await prisma
      .$transaction(async (tx) => {
        const existing = await tx.creditTransaction.findUnique({
          where: { userId_requestId: { userId, requestId: context.requestId } },
        });
        if (existing) {
          if (existing.amount !== -cost)
            throw new ApiError(409, "Credit request id was already used for another operation.");
          return existing;
        }

        const wallet = await tx.creditWallet.upsert({
          where: { userId },
          create: { userId },
          update: {},
        });
        if (wallet.balance < cost) throw new ApiError(402, "Not enough AI credits.");

        // Credits held by pending reservations are not ours to take: an admin debit must leave
        // every PENDING reservation able to commit.
        const locked = await lockWallet(tx, userId);
        const now = new Date();
        if ((await availableCredits(tx, locked, now)) < cost)
          throw new ApiError(402, "Not enough AI credits outside pending AI requests.");

        const grants = await lockGrants(tx, wallet.id, now);
        let outstanding = cost;
        const allocations: Array<{ grantId: string; amount: number }> = [];
        for (const grant of grants) {
          if (!outstanding) break;
          const amount = Math.min(grant.remaining, outstanding);
          const changed = await tx.creditGrant.updateMany({
            where: { id: grant.id, remaining: { gte: amount } },
            data: { remaining: { decrement: amount } },
          });
          if (!changed.count) throw new ApiError(409, "Credit balance changed. Retry the action.");
          allocations.push({ grantId: grant.id, amount });
          outstanding -= amount;
        }
        if (outstanding) throw new ApiError(402, "Not enough unexpired AI credits.");

        const updated = await tx.creditWallet.updateMany({
          where: { id: wallet.id, balance: { gte: cost } },
          data: { balance: { decrement: cost }, lifetimeDebited: { increment: cost } },
        });
        if (!updated.count)
          throw new ApiError(409, "Credit ledger is out of balance for this wallet.");
        const { actorId, metadata, onWrite, ledgerType, ...rest } = context;
        const transaction = await tx.creditTransaction.create({
          data: {
            walletId: wallet.id,
            userId,
            type: ledgerType ?? "DEBIT",
            amount: -cost,
            balanceAfter: locked.balance - cost,
            ...rest,
            metadata: withActor(metadata, actorId),
          },
        });
        await tx.creditUsageAllocation.createMany({
          data: allocations.map((item) => ({ transactionId: transaction.id, ...item })),
        });
        if (onWrite) await onWrite(tx, transaction);
        return transaction;
      }, CREDIT_TRANSACTION_OPTIONS)
      .catch(async (error: unknown) => {
        // The same request id committed by a concurrent call between the lookup above and the
        // insert: that call's row is the answer (a replay), not a raw unique-constraint 500.
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"))
          throw error;
        const existing = await prisma.creditTransaction.findUnique({
          where: { userId_requestId: { userId, requestId: context.requestId } },
        });
        if (!existing) throw error;
        if (existing.amount !== -cost)
          throw new ApiError(409, "Credit request id was already used for another operation.");
        return existing;
      });
    await this.invalidate(userId);
    return result;
  }

  static async grant(userId: string, amount: number, context: CreditGrantContext) {
    validateAmount(amount);
    try {
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.creditTransaction.findUnique({
          where: { userId_requestId: { userId, requestId: context.requestId } },
        });
        if (existing) return existing;
        const wallet = await tx.creditWallet.upsert({
          where: { userId },
          create: { userId, balance: amount, lifetimeCredited: amount },
          update: { balance: { increment: amount }, lifetimeCredited: { increment: amount } },
        });
        const grant = await tx.creditGrant.create({
          data: {
            walletId: wallet.id,
            userId,
            amount,
            remaining: amount,
            source: context.source,
            sourceId: context.sourceId,
            expiresAt: context.expiresAt,
          },
        });
        if (context.supersedes) {
          const cutoff = new Date(Math.max(context.supersedes.at.getTime(), Date.now()));
          await tx.creditGrant.updateMany({
            where: {
              AND: [
                context.supersedes.where,
                {
                  walletId: wallet.id,
                  id: { not: grant.id },
                  remaining: { gt: 0 },
                  OR: [{ expiresAt: null }, { expiresAt: { gt: cutoff } }],
                },
              ],
            },
            data: { expiresAt: cutoff },
          });
        }
        const transaction = await tx.creditTransaction.create({
          data: {
            walletId: wallet.id,
            userId,
            type: context.ledgerType ?? "GRANT",
            amount,
            balanceAfter: wallet.balance,
            referenceId: grant.id,
            requestId: context.requestId,
            action: context.action,
            documentId: context.documentId,
            reason: context.reason,
            metadata: withActor(context.metadata, context.actorId),
          },
        });
        if (context.onWrite) await context.onWrite(tx, transaction);
        return transaction;
      }, CREDIT_TRANSACTION_OPTIONS);
      await this.invalidate(userId);
      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await prisma.creditTransaction.findUnique({
          where: { userId_requestId: { userId, requestId: context.requestId } },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

  /**
   * Takes back what is left of one grant whose payment was refunded or lost in a dispute (V-205):
   * a `REFUND` row for the amount taken, allocated to the grant, so the ledger invariant (balance +
   * reserved = what the grants hold) holds. Takes at most the wallet's spendable balance: credits a
   * pending AI request has reserved still commit from the grants left, and credits already spent
   * are gone. Keyed `refund-clawback:<grant id>`, so a redelivered refund or a refund followed by a
   * lost dispute on the same payment takes nothing twice. Returns the credits taken.
   */
  static async clawBackGrant(userId: string, grantId: string, reason: string) {
    const requestId = `refund-clawback:${grantId}`;
    const taken = await prisma.$transaction(async (tx) => {
      const wallet = await lockWallet(tx, userId);
      const existing = await tx.creditTransaction.findUnique({
        where: { userId_requestId: { userId, requestId } },
        select: { id: true },
      });
      if (existing) return 0;

      const [grant] = await tx.$queryRaw<LockedGrant[]>`
        SELECT id, remaining FROM "CreditGrant"
        WHERE id = ${grantId} AND "walletId" = ${wallet.id}
        FOR UPDATE`;
      const amount = Math.min(grant?.remaining ?? 0, Math.max(wallet.balance, 0));
      if (!grant || amount <= 0) return 0;
      if (amount < grant.remaining)
        logger.warn("Refund claw-back limited to the spendable balance", {
          userId,
          grantId,
          remaining: grant.remaining,
          balance: wallet.balance,
        });

      await tx.creditGrant.update({
        where: { id: grant.id },
        data: { remaining: { decrement: amount } },
      });
      await tx.creditWallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount }, lifetimeDebited: { increment: amount } },
      });
      const transaction = await tx.creditTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: "REFUND",
          amount: -amount,
          balanceAfter: wallet.balance - amount,
          action: "payment_refund",
          requestId,
          referenceId: grant.id,
          reason,
        },
      });
      await tx.creditUsageAllocation.create({
        data: { transactionId: transaction.id, grantId: grant.id, amount },
      });
      return amount;
    }, CREDIT_TRANSACTION_OPTIONS);
    if (taken) await this.invalidate(userId);
    return taken;
  }

  /**
   * An admin adjustment. A positive one grants goodwill credits (`admin_adjustment`, no expiry)
   * unless `grant` says what they are instead (V-230: a restored pack or subscription month keeps
   * that source and expiry); a negative one is a debit.
   */
  static async adjust(
    userId: string,
    amount: number,
    context: CreditContext,
    grant?: { source: string; sourceId: string; expiresAt: Date | null },
  ) {
    if (!Number.isSafeInteger(amount) || amount === 0)
      throw new ApiError(400, "Credit adjustment must be a non-zero integer.");
    if (amount > 0)
      return this.grant(userId, amount, {
        ...context,
        // Goodwill is an ADJUSTMENT (V-011). A restored pack or subscription month is the paid
        // credit it replaces: a GRANT with that source, counted with paid grants (V-230).
        ...(grant ? {} : { ledgerType: "ADJUSTMENT" as const }),
        source: grant?.source ?? CREDIT_SOURCES.adminAdjustment,
        sourceId: grant?.sourceId ?? context.requestId,
        expiresAt: grant?.expiresAt ?? null,
      });
    return this.consume(userId, Math.abs(amount), {
      ...context,
      ledgerType: "ADJUSTMENT",
      action: "admin_adjustment",
    });
  }
}

const SWEEP_BATCH_SIZE = 100;

/**
 * Periodic expiry sweep (V-107): the wallets with a due grant or an overdue PENDING reservation,
 * walked in `userId` order in batches, each one through the same locked sweeps the write paths
 * run. A wallet whose expiry is deferred under a live reservation is visited once per run, not
 * retried, because the cursor only moves forward. Per-wallet failures are logged and skipped so
 * one bad ledger cannot stall the rest.
 *
 * Scheduled hourly by `jobs/creditSweepJob.ts` under its own Redis lock.
 */
export async function sweepExpiredCredits(at = new Date()) {
  const totals = { wallets: 0, released: 0, expired: 0, failed: 0 };
  let cursor = "";
  for (;;) {
    // Relies on the partial indexes CreditGrant("expiresAt","userId") WHERE remaining > 0 and
    // CreditReservation("expiresAt","userId") WHERE status = 'PENDING' (database track).
    const due = await prisma.$queryRaw<Array<{ userId: string }>>`
      SELECT "userId" FROM (
        SELECT "userId" FROM "CreditGrant"
          WHERE remaining > 0 AND "expiresAt" <= ${at} AND "userId" > ${cursor}
        UNION
        SELECT "userId" FROM "CreditReservation"
          WHERE status = 'PENDING' AND "expiresAt" <= ${at} AND "userId" > ${cursor}
      ) AS due ORDER BY "userId" ASC LIMIT ${SWEEP_BATCH_SIZE}`;
    if (!due.length) break;

    for (const { userId } of due) {
      totals.wallets += 1;
      try {
        totals.released += await CreditService.releaseExpiredReservations(userId, at);
        totals.expired += await CreditService.expireCredits(userId, at);
      } catch (error) {
        totals.failed += 1;
        logger.error("Credit expiry sweep failed for a wallet", { userId, error });
      }
    }
    cursor = due[due.length - 1]!.userId;
    if (due.length < SWEEP_BATCH_SIZE) break;
  }

  const detached = await expireDetachedCredits(at);
  totals.wallets += detached.wallets;
  totals.expired += detached.expired;
  totals.failed += detached.failed;
  return totals;
}

/**
 * Wallets detached by an account deletion (`userId` null, V-252) are billing records, not live
 * credits, but their grants still expire: the user-keyed walk above never reaches them (`"userId" >
 * cursor` is never true for NULL), so they are swept here by wallet. Nothing defers them: the
 * account's reservations were deleted with it and its `reserved` cleared.
 */
async function expireDetachedCredits(at: Date) {
  const totals = { wallets: 0, expired: 0, failed: 0 };
  const seen = new Set<string>();
  for (;;) {
    const due = await prisma.$queryRaw<Array<{ walletId: string }>>`
      SELECT DISTINCT "walletId" FROM "CreditGrant"
      WHERE "userId" IS NULL AND remaining > 0 AND "expiresAt" <= ${at}
      ORDER BY "walletId" ASC LIMIT ${SWEEP_BATCH_SIZE}`;
    const fresh = due.filter(({ walletId }) => !seen.has(walletId));
    if (!fresh.length) break;

    for (const { walletId } of fresh) {
      seen.add(walletId);
      totals.wallets += 1;
      try {
        totals.expired += await prisma.$transaction(async (tx) => {
          const [wallet] = await tx.$queryRaw<LockedWallet[]>`
            SELECT id, balance, reserved FROM "CreditWallet"
            WHERE id = ${walletId} AND "userId" IS NULL FOR UPDATE`;
          return wallet ? expireDueGrants(tx, wallet, null, at) : 0;
        }, CREDIT_TRANSACTION_OPTIONS);
      } catch (error) {
        totals.failed += 1;
        logger.error("Credit expiry sweep failed for a detached wallet", { walletId, error });
      }
    }
    if (due.length < SWEEP_BATCH_SIZE) break;
  }
  return totals;
}
