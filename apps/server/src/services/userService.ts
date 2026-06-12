import { Prisma } from "@prisma/client";

import { prisma } from "#utils/prisma";
import { ApiError } from "#utils/errors";

import { cacheGet, cacheSet } from "#utils/redis";
import { usernameInvalidReason } from "#utils/slugs";

const userProfileSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  emailVerified: true,
  autoSyncEnabled: true,
  portfolioPlan: true,
  portfolioCanPublish: true,
  portfolioAccessEndsAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      apiKeys: true,
      shareLinks: true,
      resumes: true,
    },
  },
} satisfies Prisma.UserSelect;

export class UserService {
  static async requireUsernameForUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    if (!user) throw new ApiError(404, "User not found");
    if (!user.username) throw new ApiError(400, "Username required before sharing");

    return user.username;
  }

  /**
   * Get a user by ID with related counts.
   * Results are cached for 30 minutes.
   * @param userId User ID
   */

  static async getUserById(userId: string) {
    const cacheKey = `user:profile:v2:${userId}`;
    const cached = await cacheGet(cacheKey);

    if (cached) return cached;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userProfileSelect,
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
      select: userProfileSelect,
    });

    await cacheSet(`user:profile:v2:${userId}`, updated, 1800);

    return updated;
  }

  static async getUsernameAvailability(username: string, currentUserId?: string) {
    const reason = usernameInvalidReason(username);

    if (reason) {
      return { available: false, normalizedUsername: username, reason };
    }

    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    const available = !existing || existing.id === currentUserId;

    return {
      available,
      normalizedUsername: username,
      reason: available ? undefined : "taken",
    };
  }

  static async updateUsername(userId: string, username: string) {
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });

    if (!current) throw new ApiError(404, "User not found");
    if (current.username === username) return this.getUserById(userId);
    if (current.username) throw new ApiError(409, "Username is locked and cannot be changed");

    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { username },
        select: userProfileSelect,
      });

      await cacheSet(`user:profile:v2:${userId}`, updated, 1800);
      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(409, "Username is already taken");
      }

      throw error;
    }
  }
}
