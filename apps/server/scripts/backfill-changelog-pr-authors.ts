import "dotenv/config";

import { Prisma } from "@prisma/client";

import { config } from "#config";
import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";
import { fetchPullRequestSummary, type GitHubPullRequestSummary } from "#services/github/index";

interface ChangelogPrRef {
  number: number;
  title: string;
  url?: string;
  author?: { login: string; avatarUrl: string; htmlUrl: string } | null;
}

/**
 * One-off backfill: enriches every PR reference already stored in the
 * ChangelogEntry.prRefs column with its real GitHub author (login/avatar/
 * profile), by calling the GitHub pulls API. Updates only the `prRefs`
 * column of each affected row — never touches any other field, so it can't
 * clobber entries that have drifted from the checked-in seed JSON. Safe to
 * re-run; refs that already carry an `author` are left untouched.
 */

async function run() {
  const { owner, repo, token } = config.github;

  if (!owner || !repo || !token) {
    throw new Error(
      "GITHUB_OWNER, GITHUB_REPO, and GITHUB_TOKEN must be set to backfill changelog PR authors.",
    );
  }

  const entries = await prisma.changelogEntry.findMany({
    select: { id: true, version: true, prRefs: true },
  });

  const summaryCache = new Map<number, GitHubPullRequestSummary | null>();
  let entriesUpdated = 0;
  let refsEnriched = 0;
  let refsSkipped = 0;
  let refsFailed = 0;

  for (const entry of entries) {
    const prRefs = entry.prRefs;
    if (!Array.isArray(prRefs) || prRefs.length === 0) continue;

    let changed = false;
    const nextRefs: ChangelogPrRef[] = [];

    for (const raw of prRefs) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const ref = raw as unknown as ChangelogPrRef;

      if (ref.author) {
        refsSkipped++;
        nextRefs.push(ref);
        continue;
      }

      if (!summaryCache.has(ref.number)) {
        try {
          summaryCache.set(
            ref.number,
            await fetchPullRequestSummary(owner, repo, ref.number, token),
          );
        } catch (error) {
          logger.error(`Failed to fetch PR #${ref.number} from GitHub`, error);
          summaryCache.set(ref.number, null);
        }
      }

      const summary = summaryCache.get(ref.number);

      if (!summary) {
        refsFailed++;
        nextRefs.push(ref);
        continue;
      }

      nextRefs.push({
        number: ref.number,
        title: ref.title || summary.title,
        url: ref.url ?? summary.url,
        author: summary.author,
      });
      refsEnriched++;
      changed = true;
    }

    if (changed) {
      await prisma.changelogEntry.update({
        where: { id: entry.id },
        data: { prRefs: nextRefs as unknown as Prisma.InputJsonValue },
      });
      entriesUpdated++;
      logger.info(`Enriched prRefs for changelog entry ${entry.id} (v${entry.version})`);
    }
  }

  logger.info(
    `Changelog PR author backfill complete: ${entriesUpdated} entries updated, ` +
      `${refsEnriched} refs enriched, ${refsSkipped} already had an author, ${refsFailed} failed`,
  );
}

run()
  .catch((error) => {
    logger.error("Changelog PR author backfill failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(process.exitCode ?? 0);
  });
