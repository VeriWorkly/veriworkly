import { randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";

import { ApiError } from "#lib/errors";
import { prisma } from "#lib/prisma";

import { invalidateAffiliate } from "#services/affiliate/cache";
import { getDashboard } from "#services/affiliate/dashboard";

function createAffiliateCode() {
  return randomBytes(5).toString("hex");
}

export async function enroll(userId: string) {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { affiliateStatus: true, affiliateCode: true },
  });
  if (!current) throw new ApiError(404, "User not found.");
  if (current.affiliateStatus === "ACTIVE" || current.affiliateStatus === "PENDING")
    return getDashboard(userId);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            affiliateStatus: "ACTIVE",
            affiliateCode: current.affiliateCode || createAffiliateCode(),
            affiliateEnrolledAt: new Date(),
          },
        }),
        prisma.affiliateWallet.upsert({ where: { userId }, create: { userId }, update: {} }),
      ]);
      await invalidateAffiliate(userId);
      return getDashboard(userId);
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"))
        throw error;
    }
  }
  throw new ApiError(503, "Could not create a unique affiliate code.");
}

export async function trackClick(code: string, referrerHost?: string) {
  const affiliate = await prisma.user.findUnique({
    where: { affiliateCode: code.toLowerCase() },
    select: { id: true, affiliateStatus: true },
  });
  if (!affiliate || affiliate.affiliateStatus !== "ACTIVE")
    throw new ApiError(404, "Affiliate link not found.");

  await prisma.affiliateClick.create({
    data: { affiliateId: affiliate.id, code: code.toLowerCase(), referrerHost },
  });
  await invalidateAffiliate(affiliate.id);
  return { tracked: true };
}

export async function applyReferral(userId: string, code: string) {
  const affiliate = await prisma.user.findUnique({
    where: { affiliateCode: code.toLowerCase() },
    select: { id: true, affiliateStatus: true },
  });
  if (!affiliate || affiliate.affiliateStatus !== "ACTIVE")
    throw new ApiError(404, "Affiliate code not found.");
  if (affiliate.id === userId) throw new ApiError(400, "Self-referrals are not allowed.");

  try {
    const referral = await prisma.affiliateReferral.create({
      data: { affiliateId: affiliate.id, referredUserId: userId, code: code.toLowerCase() },
    });
    await invalidateAffiliate(affiliate.id);
    return referral;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new ApiError(409, "This account already has a referral.");
    throw error;
  }
}
