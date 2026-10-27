import { randomUUID } from "node:crypto";

import { prisma } from "#lib/prisma";
import { ApiError } from "#lib/errors";

import { Prisma } from "@prisma/client";

import { RoadmapStatus, invalidateRoadmapReadCaches } from "#services/roadmapService";

interface RoadmapAdminCreateInput {
  id?: string;
  title: string;
  description: string;
  status: RoadmapStatus;
  eta?: string | null;
  tags?: string[];
  fullDescription?: string | null;
  whyItMatters?: string | null;
  timeline?: string | null;
  createdAt?: Date;
  startedAt?: Date | null;
  updatedAt?: Date;
  completedAt?: Date | null;
  /** Kept for a done item when non-empty; otherwise derived (done) or cleared (not done). */
  completedQuarter?: string | null;
  details?: unknown;
}

interface RoadmapAdminUpdateInput {
  title?: string;
  description?: string;
  status?: RoadmapStatus;
  /** null clears the ETA; undefined leaves it alone. */
  eta?: string | null;
  tags?: string[];
  fullDescription?: string | null;
  whyItMatters?: string | null;
  timeline?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  completedQuarter?: string | null;
  details?: unknown | null;
}

// UTC, so a completion late on the last day of a quarter is not filed by the server's time zone.
function calculateQuarter(date: Date): string {
  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();

  const quarter = Math.floor(month / 3) + 1;

  return `Q${quarter} ${year}`;
}

async function invalidateRoadmapCache(): Promise<void> {
  try {
    await invalidateRoadmapReadCaches();
  } catch {
    // Cache invalidation is best-effort and should not fail write operations.
  }
}

/**
 * Shared logic to normalize timestamps based on feature status
 */
function resolveStatusTimestamps(
  status: RoadmapStatus,
  currentStartedAt?: Date | null,
  currentCompletedAt?: Date | null,
  requestedQuarter?: string | null,
) {
  let startedAt = currentStartedAt;
  let completedAt = currentCompletedAt;
  let completedQuarter: string | null = null;

  switch (status) {
    case "todo":
      startedAt = null;
      completedAt = null;
      break;
    case "in-progress":
      startedAt = startedAt || new Date();
      completedAt = null;
      break;
    case "done":
      startedAt = startedAt || new Date();
      completedAt = completedAt || new Date();
      // The studio's quarter field is the admin's call (V-083). It always sends the field, as
      // null when blank, so only a non-empty quarter overrides the one derived from completedAt.
      completedQuarter = requestedQuarter?.trim() || calculateQuarter(completedAt);
      break;
  }

  return { startedAt, completedAt, completedQuarter };
}

export async function createRoadmapFeature(input: RoadmapAdminCreateInput) {
  const { startedAt, completedAt, completedQuarter } = resolveStatusTimestamps(
    input.status,
    input.startedAt,
    input.completedAt,
    input.completedQuarter,
  );

  const feature = await prisma.roadmapFeature.create({
    data: {
      id: input.id || randomUUID(),
      title: input.title,
      description: input.description,
      status: input.status,
      eta: input.eta,
      tags: input.tags ?? [],
      fullDescription: input.fullDescription,
      whyItMatters: input.whyItMatters,
      timeline: input.timeline,
      createdAt: input.createdAt || new Date(),
      updatedAt: input.updatedAt || new Date(),
      startedAt,
      completedAt,
      completedQuarter,
      details: (input.details as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  });

  await invalidateRoadmapCache();
  return feature;
}

export async function updateRoadmapFeature(id: string, input: RoadmapAdminUpdateInput) {
  const existing = await prisma.roadmapFeature.findUnique({
    where: { id },
    select: { status: true, startedAt: true, completedAt: true, completedQuarter: true },
  });

  if (!existing) {
    throw new ApiError(404, "Roadmap feature not found");
  }

  const targetStatus = input.status ?? existing.status;

  // A partial update that leaves the quarter and the completion date alone keeps the stored
  // quarter of an item that stays done (V-341); left out, it used to be re-derived from
  // completedAt, replacing a hand-set one. The studio always sends the field, so it is unaffected.
  const keepsQuarter =
    input.completedQuarter === undefined &&
    input.completedAt === undefined &&
    existing.status === "done" &&
    targetStatus === "done";

  const { startedAt, completedAt, completedQuarter } = resolveStatusTimestamps(
    targetStatus as RoadmapStatus,
    input.startedAt !== undefined ? input.startedAt : existing.startedAt,
    input.completedAt !== undefined ? input.completedAt : existing.completedAt,
    keepsQuarter ? existing.completedQuarter : input.completedQuarter,
  );

  const feature = await prisma.roadmapFeature.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description,
      status: input.status,
      eta: input.eta,
      tags: input.tags,
      fullDescription: input.fullDescription,
      whyItMatters: input.whyItMatters,
      timeline: input.timeline,
      startedAt,
      completedAt,
      completedQuarter,
      details: input.details === null ? Prisma.JsonNull : (input.details as Prisma.InputJsonValue),
    },
  });

  await invalidateRoadmapCache();
  return feature;
}

export async function deleteRoadmapFeature(id: string) {
  const existing = await prisma.roadmapFeature.findUnique({ where: { id }, select: { id: true } });

  if (!existing) {
    throw new ApiError(404, "Roadmap feature not found");
  }

  await prisma.roadmapFeature.delete({ where: { id } });
  await invalidateRoadmapCache();

  return { id };
}
