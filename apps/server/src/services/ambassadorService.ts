import type { Prisma } from "@prisma/client";

import { ApiError } from "#lib/errors";
import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";
import { sendAmbassadorDecisionEmail } from "#services/mail/ambassadorMail";
import type { AmbassadorApplicationInput } from "#validators/ambassadorValidator";

type Role = "USER" | "AMBASSADOR" | "ADMIN";

/**
 * Reviewing an application must never change a role it does not own. Approval promotes
 * only a plain USER; rejection demotes only someone who is currently an AMBASSADOR.
 * Every other role — ADMIN above all — is left exactly as it was.
 */
function nextRoleAfterReview(currentRole: Role, action: "APPROVE" | "REJECT"): Role {
  if (action === "APPROVE") return currentRole === "USER" ? "AMBASSADOR" : currentRole;
  return currentRole === "AMBASSADOR" ? "USER" : currentRole;
}

export class AmbassadorService {
  static async apply(userId: string, input: AmbassadorApplicationInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        ambassadorStatus: true,
        ambassadorApplication: { select: { status: true } },
      },
    });

    if (!user) throw new ApiError(404, "User not found.");
    if (user.role === "AMBASSADOR") throw new ApiError(409, "You are already a campus ambassador.");
    if (user.ambassadorApplication?.status === "PENDING")
      throw new ApiError(409, "Your ambassador application is already pending review.");

    const [application] = await prisma.$transaction([
      prisma.ambassadorApplication.upsert({
        where: { userId },
        create: { userId, ...input },
        update: {
          ...input,
          status: "PENDING",
          reviewedBy: null,
          reviewedAt: null,
          reviewNote: null,
        },
      }),
      prisma.user.update({ where: { id: userId }, data: { ambassadorStatus: "PENDING" } }),
    ]);

    return {
      success: true,
      ambassadorStatus: application.status,
      collegeName: application.collegeName,
      graduationYear: application.graduationYear,
    };
  }

  static async getStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        role: true,
        ambassadorStatus: true,
        ambassadorApplication: {
          select: {
            collegeName: true,
            graduationYear: true,
            whyJoin: true,
            superpower: true,
            funFact: true,
            vibeCheck: true,
            socialHandle: true,
            status: true,
            reviewNote: true,
            reviewedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!user) throw new ApiError(404, "User not found.");

    const application = user.ambassadorApplication;

    return {
      // Identity, so the apply form can greet the user and prefill instead of asking
      // for details the account already knows.
      name: user.name ?? null,
      email: user.email ?? null,
      role: user.role,
      ambassadorStatus: user.ambassadorStatus,
      // Flattened for the two callers that only ever needed the school line.
      collegeName: application?.collegeName ?? null,
      graduationYear: application?.graduationYear ?? null,
      // The previous answers. A rejected applicant can re-apply, and retyping seven
      // questions from scratch is the fastest way to lose them.
      application: application
        ? {
            collegeName: application.collegeName,
            graduationYear: application.graduationYear,
            whyJoin: application.whyJoin,
            superpower: application.superpower,
            funFact: application.funFact,
            vibeCheck: application.vibeCheck,
            socialHandle: application.socialHandle,
            status: application.status,
            reviewNote: application.reviewNote,
            reviewedAt: application.reviewedAt,
            submittedAt: application.createdAt,
            updatedAt: application.updatedAt,
          }
        : null,
    };
  }

  static async reviewApplication(
    applicationId: string,
    action: "APPROVE" | "REJECT",
    reviewerId: string,
    reviewNote?: string,
    /**
     * Runs inside the decision's transaction (V-074): the admin path writes its audit entry here,
     * so the role change and its audit commit together or not at all.
     */
    onDecided?: (
      tx: Prisma.TransactionClient,
      application: { id: string; userId: string; status: string },
    ) => Promise<unknown>,
  ) {
    const application = await prisma.ambassadorApplication.findUnique({
      where: { id: applicationId },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!application) throw new ApiError(404, "Ambassador application not found.");
    if (application.status !== "PENDING")
      throw new ApiError(409, "This application has already been reviewed.");

    const status = action === "APPROVE" ? "APPROVED" : "REJECTED";

    const updatedApplication = await prisma.$transaction(async (tx) => {
      // The decision is a compare-and-set on PENDING, so two reviewers racing each other decide
      // (and mail) once; the loser gets the same 409 as a late second review.
      const decided = await tx.ambassadorApplication.updateMany({
        where: { id: applicationId, status: "PENDING" },
        data: { status, reviewedBy: reviewerId, reviewedAt: new Date(), reviewNote },
      });
      if (decided.count !== 1)
        throw new ApiError(409, "This application has already been reviewed.");

      // The role is read under a row lock inside the transaction, not before it: an admin role
      // change committed meanwhile is not overwritten with the stale value.
      const [current] = await tx.$queryRaw<
        Array<{ role: Parameters<typeof nextRoleAfterReview>[0] }>
      >`
        SELECT role FROM "User" WHERE id = ${application.userId} FOR UPDATE`;
      if (!current) throw new ApiError(404, "Ambassador application not found.");

      await tx.user.update({
        where: { id: application.userId },
        data: {
          ambassadorStatus: status,
          // Only ever move a plain USER up, or an AMBASSADOR back down. Writing the role
          // unconditionally meant reviewing an ADMIN's own application silently stripped
          // their admin access — on approval *and* on rejection.
          role: nextRoleAfterReview(current.role, action),
        },
      });

      const decidedApplication = await tx.ambassadorApplication.findUniqueOrThrow({
        where: { id: applicationId },
      });
      if (onDecided) await onDecided(tx, decidedApplication);
      return decidedApplication;
    });

    // One mail per decision (V-181): only the review that won the transition sends it. Sent off
    // the request path; a failed send is logged and never undoes the decision.
    const email = application.user.email;
    if (email)
      void sendAmbassadorDecisionEmail(email, {
        decision: status,
        firstName: application.user.name?.trim().split(/\s+/)[0] ?? "",
        reviewNote: reviewNote?.trim() || null,
      }).catch((error: unknown) => {
        logger.warn("Failed to send the ambassador decision email", {
          applicationId,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return updatedApplication;
  }
}
