import { prisma } from "#utils/prisma";
import { ApiError } from "#utils/errors";

import { cacheGet, cacheSet } from "#utils/redis";

export class UserService {
  /**
   * Get a user by ID with related counts.
   * Results are cached for 30 minutes.
   * @param userId User ID
   */

  static async getUserById(userId: string) {
    const cacheKey = `user:profile:${userId}`;
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
        updatedAt: true,
        _count: {
          select: {
            shareLinks: true,
            resumes: true,
          },
        },
      },
    });

    if (!user) throw new ApiError(404, "User not found");

    await cacheSet(cacheKey, user, 1800);

    return user;
  }

  /**
   * Update a user's name.
   * Invalidates cache upon success.
   * @param userId User ID
   * @param name New name
   */

  static async updateUserName(userId: string, name: string) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        autoSyncEnabled: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            shareLinks: true,
            resumes: true,
          },
        },
      },
    });

    await cacheSet(`user:profile:${userId}`, updated, 1800);

    return updated;
  }
}
