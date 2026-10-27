import type { Prisma } from "@prisma/client";

import { prisma } from "#lib/prisma";
import { ApiError } from "#lib/errors";
import { AmbassadorService } from "#services/ambassadorService";

import type {
  AdminAmbassadorListQuery,
  adminAmbassadorRosterQuerySchema,
} from "#validators/admin/adminAmbassadorValidator";
import type { z } from "zod";
import { listPage } from "#utils/pagination";
import {
  getAuditHistory,
  writeAdminAudit,
  type AdminAuditInput,
} from "#services/admin/adminAuditService";

type RosterQuery = z.infer<typeof adminAmbassadorRosterQuerySchema>;

const APPLICANT_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  username: true,
  ambassadorStatus: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export async function getAmbassadorSummary() {
  const [byStatus, roster, recent] = await Promise.all([
    prisma.ambassadorApplication.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.user.count({ where: { role: "AMBASSADOR" } }),
    prisma.ambassadorApplication.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  const counts = Object.fromEntries(byStatus.map((row) => [row.status, row._count._all]));

  return {
    pending: counts.PENDING ?? 0,
    approved: counts.APPROVED ?? 0,
    rejected: counts.REJECTED ?? 0,
    total: Object.values(counts).reduce((sum, value) => sum + value, 0),
    activeAmbassadors: roster,
    applicationsLast7Days: recent,
  };
}

export async function listApplications(query: AdminAmbassadorListQuery) {
  const where: Prisma.AmbassadorApplicationWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.graduationYear ? { graduationYear: query.graduationYear } : {}),
    ...(query.query
      ? {
          OR: [
            { collegeName: { contains: query.query, mode: "insensitive" } },
            { socialHandle: { contains: query.query, mode: "insensitive" } },
            { user: { email: { contains: query.query, mode: "insensitive" } } },
            { user: { name: { contains: query.query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.ambassadorApplication.findMany({
      where,
      include: { user: { select: APPLICANT_SELECT } },
      orderBy: { createdAt: query.sort === "oldest" ? "asc" : "desc" },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.ambassadorApplication.count({ where }),
  ]);

  return listPage(items, total, query);
}

export async function getApplicationDetail(applicationId: string) {
  const application = await prisma.ambassadorApplication.findUnique({
    where: { id: applicationId },
    include: {
      user: {
        select: {
          ...APPLICANT_SELECT,
          affiliateCode: true,
          affiliateStatus: true,
          _count: { select: { resumes: true, affiliateReferrals: true } },
          portfolioPublication: { select: { subdomain: true, status: true } },
        },
      },
    },
  });

  if (!application) throw new ApiError(404, "Ambassador application not found.");

  const [reviewer, auditEntries] = await Promise.all([
    application.reviewedBy
      ? prisma.user.findUnique({
          where: { id: application.reviewedBy },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve(null),
    getAuditHistory("AmbassadorApplication", applicationId),
  ]);

  return { application, reviewer, auditEntries };
}

/**
 * Approved ambassadors, i.e. the people currently representing VeriWorkly on campus. This is
 * a different question from "approved applications" once someone is demoted, so it reads the
 * role off `User` rather than the application table.
 */
export async function listRoster(query: RosterQuery) {
  const where: Prisma.UserWhereInput = {
    role: "AMBASSADOR",
    ...(query.query
      ? {
          OR: [
            { email: { contains: query.query, mode: "insensitive" } },
            { name: { contains: query.query, mode: "insensitive" } },
            {
              ambassadorApplication: {
                collegeName: { contains: query.query, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        ...APPLICANT_SELECT,
        affiliateCode: true,
        affiliateStatus: true,
        ambassadorApplication: {
          select: {
            collegeName: true,
            graduationYear: true,
            socialHandle: true,
            reviewedAt: true,
          },
        },
        _count: { select: { affiliateReferrals: true } },
      },
      orderBy: { createdAt: "desc" },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.user.count({ where }),
  ]);

  return listPage(items, total, query);
}

export async function reviewApplication(
  applicationId: string,
  action: "APPROVE" | "REJECT",
  reviewerId: string,
  reviewNote: string | undefined,
  audit: AdminAuditInput,
) {
  // The audit entry commits with the decision and the role change (V-074).
  return AmbassadorService.reviewApplication(
    applicationId,
    action,
    reviewerId,
    reviewNote,
    (tx, application) =>
      writeAdminAudit(tx, {
        ...audit,
        targetId: application.id,
        metadata: { ...audit.metadata, userId: application.userId, status: application.status },
      }),
  );
}
