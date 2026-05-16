import { Prisma } from "@prisma/client";

import { prisma } from "#utils/prisma";
import { ApiError } from "#utils/errors";

import { cacheGet, cacheSet, cacheDel } from "#utils/redis";

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
   * Results are cached for 1 hour.
   * @param userId User ID
   */

  static async getMasterProfile(userId: string) {
    const cacheKey = `profile:${userId}`;
    const cached = await cacheGet(cacheKey);

    if (cached) return cached;

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

    if (!user) throw new ApiError(404, "User not found");

    const [existingProfile, shareResumeCount] = await prisma.$transaction([
      prisma.masterProfile.findUnique({
        where: { userId: user.id },
      }),
      prisma.shareLink.count({
        where: { userId: user.id },
      }),
    ]);

    const profile =
      existingProfile ??
      (await prisma.masterProfile.create({
        data: {
          userId: user.id,
          content: {},
        },
      }));

    const responseData = {
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

    await cacheSet(cacheKey, responseData, 3600);

    return responseData;
  }

  /**
   * Update the authenticated user's master profile.
   * Invalidates cache upon success.
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

    if (this.hasConflict(existing?.updatedAt ?? null, expectedUpdatedAt))
      throw new ApiError(
        409,
        "Master profile was updated from another session. Refresh and retry.",
      );

    if (JSON.stringify(profile).length > 1_000_000)
      throw new ApiError(413, "Master profile payload is too large");

    const updated = await prisma.masterProfile.upsert({
      where: { userId },
      create: {
        userId,
        content: profile,
      },
      update: {
        content: profile,
      },
    });

    await cacheDel(`profile:${userId}`);

    return updated;
  }
}
