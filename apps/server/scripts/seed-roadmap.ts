import "dotenv/config";

import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { Prisma } from "@prisma/client";

import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";
import { closeRedis } from "#lib/redis";
import { invalidateRoadmapReadCaches } from "#services/roadmapService";
import { roadmapFeatureFieldsSchema } from "#validators/roadmapValidator";

import { assertSeedAllowed, invalidateReadCaches, parseAll, seedFlags } from "./seedSupport.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_FILE = path.join(__dirname, "seed-data", "roadmap-features.json");

function toDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

async function run() {
  assertSeedAllowed("seed:roadmap");

  const raw: unknown[] = JSON.parse(readFileSync(DATA_FILE, "utf8"));
  const items = parseAll(
    raw,
    (item, index) => String((item as { id?: unknown })?.id ?? `#${index}`),
    (item) => roadmapFeatureFieldsSchema.safeParse(item),
  );

  logger.info(`Loaded ${items.length} roadmap items from ${DATA_FILE}`);

  if (items.some((item) => !item.id)) {
    throw new Error("Every seeded roadmap item needs an id (it is the public slug).");
  }

  const { created, skipped } = await prisma.$transaction(async (tx) => {
    if (seedFlags.wipe) {
      const deleted = await tx.roadmapFeature.deleteMany({});
      logger.info(`Wiped ${deleted.count} existing roadmap feature rows (--wipe flag set)`);
    }

    const result = await tx.roadmapFeature.createMany({
      data: items.map((item) => ({
        id: item.id!,
        title: item.title,
        description: item.description,
        status: item.status,
        eta: item.eta ?? null,
        tags: item.tags ?? [],
        createdAt: toDate(item.createdAt) ?? new Date(),
        startedAt: toDate(item.startedAt),
        completedAt: toDate(item.completedAt),
        completedQuarter: item.completedQuarter ?? null,
        updatedAt: toDate(item.updatedAt) ?? new Date(),
        fullDescription: item.fullDescription ?? null,
        whyItMatters: item.whyItMatters ?? null,
        timeline: item.timeline ?? null,
        details: (item.details as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      })),
      // Existing rows keep whatever an admin wrote.
      skipDuplicates: true,
    });

    return { created: result.count, skipped: items.length - result.count };
  });

  logger.info(`Roadmap seed complete: ${created} created, ${skipped} already present (unchanged)`);

  if (created > 0 || seedFlags.wipe) {
    await invalidateReadCaches("seed:roadmap", invalidateRoadmapReadCaches);
  }
}

run()
  .catch((error) => {
    logger.error("Roadmap seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await closeRedis();
    } catch {
      // Redis was never connected — nothing to close.
    }
    await prisma.$disconnect();
    process.exit(process.exitCode ?? 0);
  });
