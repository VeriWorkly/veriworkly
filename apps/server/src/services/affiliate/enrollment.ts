import { randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";

import { ApiError } from "#lib/errors";
import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";
import { hashForAnalytics } from "#utils/analyticsHash";
import { addressBucket } from "#utils/requestIp";

import { invalidateAffiliate } from "#services/affiliate/cache";
import { AFFILIATE_ATTRIBUTION_DAYS } from "#services/affiliate/constants";
import { getDashboard } from "#services/affiliate/dashboard";
import { PAID_CREDIT_SOURCES } from "#services/creditSources";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Repeat clicks on one code from one address inside this window count once (V-015). */
const CLICK_DEDUPE_SECONDS = 30 * 60;

/** What a request tells us about who applied a code; hashed before it is stored or compared. */
type ReferralSignals = { ip?: string | null; userAgent?: string | null };

function createAffiliateCode() {
  return randomBytes(5).toString("hex");
}

/** Express reports IPv4 over an IPv6 socket as `::ffff:a.b.c.d`; better-auth records `a.b.c.d`. */
function normalizeIp(ip: string | null | undefined) {
  const value = (ip ?? "").trim().replace(/^::ffff:/i, "");
  return value || undefined;
}

function hashSignals(signals: ReferralSignals | undefined) {
  const ip = normalizeIp(signals?.ip);
  const userAgent = signals?.userAgent?.trim();
  return {
    ipHash: ip ? hashForAnalytics(ip) : undefined,
    userAgentHash: userAgent ? hashForAnalytics(userAgent) : undefined,
  };
}

export async function enroll(userId: string) {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { affiliateStatus: true, affiliateCode: true },
  });
  if (!current) throw new ApiError(404, "User not found.");
  if (current.affiliateStatus === "SUSPENDED")
    throw new ApiError(403, "Affiliate account is suspended");
  if (current.affiliateStatus === "ACTIVE" || current.affiliateStatus === "PENDING")
    return getDashboard(userId);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      // Conditional on NOT_ENROLLED: a concurrent enroll cannot overwrite the code the other
      // request already issued, and a suspension that landed after the read above stays in force.
      const enrolled = await prisma.$transaction(async (tx) => {
        const { count } = await tx.user.updateMany({
          where: { id: userId, affiliateStatus: "NOT_ENROLLED" },
          data: {
            affiliateStatus: "ACTIVE",
            affiliateCode: current.affiliateCode || createAffiliateCode(),
            affiliateEnrolledAt: new Date(),
          },
        });
        if (count === 1)
          await tx.affiliateWallet.upsert({ where: { userId }, create: { userId }, update: {} });
        return count === 1;
      });
      if (!enrolled) {
        const after = await prisma.user.findUnique({
          where: { id: userId },
          select: { affiliateStatus: true },
        });
        if (after?.affiliateStatus === "SUSPENDED")
          throw new ApiError(403, "Affiliate account is suspended");
        return getDashboard(userId);
      }
      await invalidateAffiliate(userId);
      return getDashboard(userId);
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"))
        throw error;
    }
  }
  throw new ApiError(503, "Could not create a unique affiliate code.");
}

/**
 * Claims the (code, address) click slot for the dedupe window. IPv6 is keyed on its /64, since one
 * client usually holds the whole prefix. Without an address there is nothing to key on; without
 * Redis the click is recorded rather than lost.
 */
async function claimClickSlot(code: string, ip: string | null | undefined): Promise<boolean> {
  const address = normalizeIp(ip);
  if (!address) return true;
  try {
    const bucket = hashForAnalytics(addressBucket(address));
    const claimed = await getRedis().set(`affiliate:click:${code}:${bucket}`, "1", {
      NX: true,
      EX: CLICK_DEDUPE_SECONDS,
    });
    return claimed === "OK";
  } catch (error) {
    logger.warn("Affiliate click dedupe unavailable; recording the click", { error });
    return true;
  }
}

/**
 * Public and unauthenticated, so the answer is the same whether or not the code exists (V-153:
 * a 404 made the 10-hex-char codes enumerable). Only clicks on an active code are recorded, once
 * per address per window (V-015).
 */
export async function trackClick(code: string, referrerHost?: string, signals?: ReferralSignals) {
  const normalizedCode = code.toLowerCase();
  const accepted = { tracked: true };

  const affiliate = await prisma.user.findUnique({
    where: { affiliateCode: normalizedCode },
    select: { id: true, affiliateStatus: true },
  });
  if (!affiliate || affiliate.affiliateStatus !== "ACTIVE") return accepted;

  const hashed = hashSignals(signals);
  if (!(await claimClickSlot(normalizedCode, signals?.ip))) return accepted;

  await prisma.affiliateClick.create({
    data: {
      affiliateId: affiliate.id,
      code: normalizedCode,
      referrerHost,
      ...hashed,
    },
  });
  await invalidateAffiliate(affiliate.id);
  return accepted;
}

/**
 * Attribution rules (V-016): the code is accepted only while the account is inside the
 * attribution window and has never paid.
 *
 * The address check is record-and-allow, not a refusal: the session IP better-auth stores comes
 * from client-supplied headers while `req.ip` follows TRUST_PROXY, so a determined affiliate can
 * dodge a hard block while a shared campus NAT (the ambassador case) would be refused for nothing.
 * Instead the referral is flagged `sharedAddressWithAffiliate` when the applicant's IP hash matches
 * any of the affiliate's session addresses, and `createCommission` forces that referral's
 * commissions to PENDING review. The hashes stay on the row so a later review can correlate more.
 */
export async function applyReferral(userId: string, code: string, signals?: ReferralSignals) {
  const affiliate = await prisma.user.findUnique({
    where: { affiliateCode: code.toLowerCase() },
    select: { id: true, affiliateStatus: true },
  });
  if (!affiliate || affiliate.affiliateStatus !== "ACTIVE")
    throw new ApiError(404, "Affiliate code not found.");
  if (affiliate.id === userId) throw new ApiError(400, "Self-referrals are not allowed.");

  const [referred, subscriptions, paidGrants, affiliateSessions] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
    prisma.subscription.count({ where: { userId } }),
    prisma.creditGrant.count({ where: { userId, source: { in: [...PAID_CREDIT_SOURCES] } } }),
    prisma.session.findMany({
      where: { userId: affiliate.id, ipAddress: { not: null } },
      select: { ipAddress: true },
    }),
  ]);
  if (!referred) throw new ApiError(404, "User not found.");

  if (Date.now() - referred.createdAt.getTime() > AFFILIATE_ATTRIBUTION_DAYS * DAY_MS)
    throw new ApiError(
      409,
      `Referral codes can only be applied within ${AFFILIATE_ATTRIBUTION_DAYS} days of signing up.`,
    );
  if (subscriptions > 0 || paidGrants > 0)
    throw new ApiError(409, "Referral codes cannot be applied after a purchase.");

  const hashes = hashSignals(signals);
  const sharedAddressWithAffiliate =
    Boolean(hashes.ipHash) &&
    affiliateSessions.some((session) => {
      const ip = normalizeIp(session.ipAddress);
      return Boolean(ip) && hashForAnalytics(ip as string) === hashes.ipHash;
    });

  try {
    await prisma.affiliateReferral.create({
      data: {
        affiliateId: affiliate.id,
        referredUserId: userId,
        code: code.toLowerCase(),
        ...hashes,
        sharedAddressWithAffiliate,
      },
    });
    await invalidateAffiliate(affiliate.id);
    // Only that it applied (V-323): the row carries the affiliate's user id, the signal hashes
    // and the shared-address flag, which would teach a self-referrer to switch networks.
    return { applied: true as const };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new ApiError(409, "This account already has a referral.");
    throw error;
  }
}
