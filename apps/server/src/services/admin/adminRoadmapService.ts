import { randomUUID } from "node:crypto";

import { prisma } from "#lib/prisma";
import { ApiError } from "#lib/errors";
import { cacheDelByPrefix } from "#lib/redis";

import { Prisma } from "@prisma/client";

import { RoadmapStatus } from "#services/roadmapService";

interface RoadmapAdminCreateInput {
  id?: string;
  title: string;
  description: string;
  status: RoadmapStatus;
  eta?: string;
  tags?: string[];
  fullDescription?: string | null;
  whyItMatters?: string | null;
  timeline?: string | null;
  createdAt?: Date;
  startedAt?: Date;
  updatedAt?: Date;
  completedAt?: Date;
  completedQuarter?: string;
  details?: unknown;
}

interface RoadmapAdminUpdateInput {
  title?: string;
  description?: string;
  status?: RoadmapStatus;
  eta?: string | undefined;
  tags?: string[];
  fullDescription?: string | null;
  whyItMatters?: string | null;
  timeline?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  completedQuarter?: string | null;
  details?: unknown | null;
}

function calculateQuarter(date: Date): string {
  const month = date.getMonth();
  const year = date.getFullYear();

  const quarter = Math.floor(month / 3) + 1;

  return `Q${quarter} ${year}`;
}

async function invalidateRoadmapCache(): Promise<void> {
  try {
    await cacheDelByPrefix("roadmap:");
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
      completedQuarter = calculateQuarter(completedAt);
      break;
  }

  return { startedAt, completedAt, completedQuarter };
}

export async function createRoadmapFeature(input: RoadmapAdminCreateInput) {
  const { startedAt, completedAt, completedQuarter } = resolveStatusTimestamps(
    input.status,
    input.startedAt,
    input.completedAt,
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
    select: { status: true, startedAt: true, completedAt: true },
  });

  if (!existing) {
    throw new ApiError(404, "Roadmap feature not found");
  }

  const targetStatus = input.status ?? existing.status;

  const { startedAt, completedAt, completedQuarter } = resolveStatusTimestamps(
    targetStatus as RoadmapStatus,
    input.startedAt !== undefined ? input.startedAt : existing.startedAt,
    input.completedAt !== undefined ? input.completedAt : existing.completedAt,
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
