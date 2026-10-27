import { Prisma } from "@prisma/client";

import { prisma } from "#lib/prisma";
import { ApiError, handleValidationError } from "#lib/errors";

import { cacheGet, cacheSet } from "#lib/redis";
import { cacheNamespaces } from "#lib/cacheKeys";
import { bumpGeneration, resolveGenerationalKey } from "#lib/cacheGeneration";

/** Drops every cached copy of the user's master profile read (one INCR, V-244). */
function invalidateMasterProfile(userId: string) {
  return bumpGeneration(cacheNamespaces.masterProfile(userId));
}
import { masterProfileContentSchema } from "#validators/masterProfileValidator";

const MAX_PROFILE_PAYLOAD_BYTES = 1_000_000;

const CONFLICT_MESSAGE = "Master profile was updated from another session. Refresh and retry.";

export class ProfileService {
  /**
   * Validated at the service boundary, not only in the controller, so an import pipeline
   * cannot bypass the schema. The parsed value is what gets persisted: it stamps
   * schemaVersion and strips unknown keys. Failures are 400 with `[{ path, message }]`, the
   * same shape every other validation failure on this API has.
   */
  private static validateContent(profile: Prisma.InputJsonValue): Prisma.InputJsonValue {
    // Cheap size guard before the expensive schema parse.
    if (JSON.stringify(profile).length > MAX_PROFILE_PAYLOAD_BYTES) {
      throw new ApiError(413, "Master profile payload is too large");
    }

    const validated = masterProfileContentSchema.safeParse(profile);

    if (!validated.success) throw handleValidationError(validated.error);

    return validated.data as Prisma.InputJsonValue;
  }

  /**
   * Get the authenticated user's master profile and summary.
   * Results are cached for 1 hour. A user with no row is 404, never a fabricated empty record.
   * @param userId User ID
   */

  static async getMasterProfile(userId: string) {
    // The generation is read before the database, so a save that commits during this read moves
    // readers to a new key and this read's copy lands where nobody looks (V-244).
    const cacheKey = await resolveGenerationalKey(cacheNamespaces.masterProfile(userId));
    const cached = cacheKey ? await cacheGet(cacheKey) : null;

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

    const [profile, shareResumeCount] = await Promise.all([
      prisma.masterProfile.findUnique({
        where: { userId: user.id },
      }),

      // What the share list shows: links on documents that are not deleted (V-306).
      prisma.shareLink.count({
        where: { userId: user.id, document: { deletedAt: null } },
      }),
    ]);

    if (!profile) throw new ApiError(404, "Master profile not found");

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

    if (cacheKey) await cacheSet(cacheKey, responseData, 3600);

    return responseData;
  }

  /**
   * Update the authenticated user's master profile with optimistic concurrency.
   *
   * The check and the write are one statement: `updateMany` matches the row only when its
   * `updatedAt` still equals `expectedUpdatedAt`, so two saves carrying the same cursor cannot
   * both succeed. A row that exists but was not matched is a 409 carrying the current
   * `updatedAt`; that includes a save with no cursor at all, because an existing row may not
   * be overwritten blind. Only the first save (no row yet) creates.
   *
   * @param userId User ID
   * @param profile Profile content
   * @param expectedUpdatedAt The `updatedAt` the client last read, ISO 8601
   */

  static async updateMasterProfile(
    userId: string,
    profile: Prisma.InputJsonValue,
    expectedUpdatedAt?: string,
  ) {
    const content = this.validateContent(profile);
    const expected = expectedUpdatedAt ? new Date(expectedUpdatedAt) : null;

    if (expected && !Number.isNaN(expected.getTime())) {
      const [updated] = await prisma.masterProfile.updateManyAndReturn({
        where: { userId, updatedAt: expected },
        data: { content },
      });

      if (updated) {
        await invalidateMasterProfile(userId);
        return updated;
      }
    }

    const current = await prisma.masterProfile.findUnique({
      where: { userId },
      select: { updatedAt: true },
    });

    if (current) {
      throw new ApiError(
        409,
        expected
          ? CONFLICT_MESSAGE
          : "Master profile already exists. Send expectedUpdatedAt to update it.",
        { currentUpdatedAt: current.updatedAt },
      );
    }

    try {
      const created = await prisma.masterProfile.create({ data: { userId, content } });

      await invalidateMasterProfile(userId);

      return created;
    } catch (error) {
      // Two first saves at once: the loser sees the winner's row.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const winner = await prisma.masterProfile.findUnique({
          where: { userId },
          select: { updatedAt: true },
        });

        throw new ApiError(409, CONFLICT_MESSAGE, { currentUpdatedAt: winner?.updatedAt });
      }

      throw error;
    }
  }

  /**
   * Import-only replacement: the user explicitly asked for the stored profile to be replaced,
   * so there is no cursor to check. Runs on the caller's transaction client so the write
   * commits with the rest of the import; the caller clears `profile:{userId}` after commit.
   */

  static async replaceMasterProfile(
    userId: string,
    profile: Prisma.InputJsonValue,
    client: Prisma.TransactionClient = prisma,
  ) {
    const content = this.validateContent(profile);

    return client.masterProfile.upsert({
      where: { userId },
      create: { userId, content },
      update: { content },
    });
  }
}
