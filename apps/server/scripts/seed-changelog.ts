import "dotenv/config";

import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { Prisma } from "@prisma/client";

import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";
import { closeRedis } from "#lib/redis";
import { invalidateChangelogReadCaches } from "#services/changelog/cache";
import { changelogEntryFieldsSchema } from "#validators/changelogValidator";

import { assertSeedAllowed, invalidateReadCaches, parseAll, seedFlags } from "./seedSupport.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_FILE = path.join(__dirname, "seed-data", "changelog-entries.json");

async function run() {
  assertSeedAllowed("seed:changelog");

  const raw: unknown[] = JSON.parse(readFileSync(DATA_FILE, "utf8"));
  const items = parseAll(
    raw,
    (item, index) => String((item as { version?: unknown })?.version ?? `#${index}`),
    (item) => changelogEntryFieldsSchema.safeParse(item),
  );

  logger.info(`Loaded ${items.length} changelog entries from ${DATA_FILE}`);

  if (items.some((item) => !item.id || !item.publishedAt)) {
    throw new Error("Every seeded changelog entry needs an id and a publishedAt.");
  }

  const { created, skipped } = await prisma.$transaction(async (tx) => {
    if (seedFlags.wipe) {
      const deleted = await tx.changelogEntry.deleteMany({});
      logger.info(`Wiped ${deleted.count} existing changelog entry rows (--wipe flag set)`);
    }

    const result = await tx.changelogEntry.createMany({
      data: items.map((item) => ({
        id: item.id!,
        version: item.version,
        title: item.title,
        summary: item.summary ?? null,
        type: item.type,
        publishedAt: new Date(item.publishedAt!),
        githubUrl: item.githubUrl ?? null,
        added: item.added,
        improved: item.improved,
        fixed: item.fixed,
        breaking: item.breaking,
        security: item.security,
        tags: item.tags,
        prRefs: (item.prRefs as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      })),
      // Existing rows keep whatever an admin or the release sync wrote.
      skipDuplicates: true,
    });

    return { created: result.count, skipped: items.length - result.count };
  });

  logger.info(
    `Changelog seed complete: ${created} created, ${skipped} already present (unchanged)`,
  );

  if (created > 0 || seedFlags.wipe) {
    await invalidateReadCaches("seed:changelog", invalidateChangelogReadCaches);
  }
}

run()
  .catch((error) => {
    logger.error("Changelog seed failed", error);
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
