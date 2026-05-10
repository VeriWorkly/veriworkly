import { prisma } from "#utils/prisma";
import { ApiError } from "#utils/errors";

export class UserService {
  /**
   * Get a user by ID with related counts
   * @param userId User ID
   */

  static async getUserById(userId: string) {
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

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return user;
  }

  /**
   * Update a user's name
   * @param userId User ID
   * @param name New name
   */

  static async updateUserName(userId: string, name: string) {
    return prisma.user.update({
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
  }
}
