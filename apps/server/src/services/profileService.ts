import { Prisma } from "@prisma/client";

import { prisma } from "#utils/prisma";
import { ApiError } from "#utils/errors";

export class ProfileService {
  /**
   * Check for optimistic concurrency conflict using updatedAt.
   */

  static hasConflict(existingUpdatedAt: Date | null, expectedUpdatedAt: string | undefined) {
    if (!existingUpdatedAt || !expectedUpdatedAt) {
      return false;
    }

    const expectedMs = Date.parse(expectedUpdatedAt);
    if (Number.isNaN(expectedMs)) {
      return false;
    }

    return existingUpdatedAt.getTime() !== expectedMs;
  }

  /**
   * Get the authenticated user's master profile and summary.
   * @param userId User ID
   */

  static async getMasterProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        autoSyncEnabled: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const [profile, shareResumeCount] = await prisma.$transaction([
      prisma.masterProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          content: {},
        },
        update: {},
      }),
      prisma.shareLink.count({
        where: { userId: user.id },
      }),
    ]);

    return {
      profile,
      summary: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        emailVerified: user.emailVerified,
        autoSyncEnabled: user.autoSyncEnabled,
        shareResumeCount,
      },
    };
  }

  /**
   * Update the authenticated user's master profile.
   * @param userId User ID
   * @param profile Profile content
   * @param expectedUpdatedAt Expected updatedAt for optimistic concurrency
   */
  static async updateMasterProfile(
    userId: string,
    profile: Prisma.InputJsonValue,
    expectedUpdatedAt?: string,
  ) {
    const existing = await prisma.masterProfile.findUnique({
      where: { userId },
      select: { updatedAt: true },
    });

    if (this.hasConflict(existing?.updatedAt ?? null, expectedUpdatedAt)) {
      throw new ApiError(
        409,
        "Master profile was updated from another session. Refresh and retry.",
      );
    }

    if (JSON.stringify(profile).length > 1_000_000) {
      throw new ApiError(413, "Master profile payload is too large");
    }

    return prisma.masterProfile.upsert({
      where: { userId },
      create: {
        userId,
        content: profile,
      },
      update: {
        content: profile,
      },
    });
  }
}
