import { ApiError } from "#lib/errors";
import { prisma } from "#lib/prisma";
import { cacheDel } from "#lib/redis";

function ambassadorStatusCacheKey(userId: string) {
  return `ambassador:status:${userId}`;
}

export class AmbassadorService {
  static async apply(userId: string, collegeName: string, graduationYear: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, ambassadorStatus: true },
    });

    if (!user) throw new ApiError(404, "User not found.");
    if (user.role === "AMBASSADOR")
      throw new ApiError(400, "You are already a campus ambassador.");
    if (user.ambassadorStatus === "PENDING")
      throw new ApiError(400, "Your ambassador application is already pending review.");

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ambassadorStatus: "PENDING",
        collegeName,
        graduationYear,
      },
      select: { ambassadorStatus: true, collegeName: true, graduationYear: true },
    });

    await cacheDel(ambassadorStatusCacheKey(userId));

    return {
      success: true,
      ambassadorStatus: updated.ambassadorStatus,
      collegeName: updated.collegeName,
      graduationYear: updated.graduationYear,
    };
  }

  static async getStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        ambassadorStatus: true,
        collegeName: true,
        graduationYear: true,
      },
    });
    if (!user) throw new ApiError(404, "User not found.");
    return user;
  }
}
