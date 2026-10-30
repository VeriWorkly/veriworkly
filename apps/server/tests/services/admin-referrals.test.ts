import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  affiliateReferral: { findMany: vi.fn(), count: vi.fn() },
}));

vi.mock("#lib/prisma", () => ({ prisma, default: prisma }));
vi.mock("#services/affiliate/cache", () => ({ invalidateAffiliate: vi.fn() }));
vi.mock("#services/admin/adminAuditService", () => ({ writeAdminAudit: vi.fn() }));
vi.mock("#services/affiliate/commissions", () => ({
  createCommission: vi.fn(),
  updateCommission: vi.fn(),
}));
vi.mock("#services/affiliate/wallet", () => ({ updateWithdrawal: vi.fn() }));

const { listReferrals } = await import("#services/admin/adminAffiliateService");

describe("admin referral list", () => {
  beforeEach(() => {
    prisma.affiliateReferral.findMany.mockResolvedValue([]);
    prisma.affiliateReferral.count.mockResolvedValue(0);
  });

  it("S-414 names the affiliate's status, which decides whether a manual commission can be made", async () => {
    await listReferrals({ limit: 20, offset: 0 } as never);

    expect(prisma.affiliateReferral.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          affiliate: { select: expect.objectContaining({ affiliateStatus: true }) },
        }),
      }),
    );
  });
});
