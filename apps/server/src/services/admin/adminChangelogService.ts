import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { config } from "#config";
import { prisma } from "#lib/prisma";
import { ApiError } from "#lib/errors";
import { logger } from "#lib/logger";

import {
  type ChangelogAdminCreateInput,
  type ChangelogAdminUpdateInput,
  invalidateChangelogReadCaches,
} from "#services/changelog/index";
import { fetchPullRequestSummary } from "#services/github/index";
import { slugifyVersion } from "#utils/changelogVersion";

interface ChangelogPrRefInput {
  number: number;
  title: string;
  url?: string;
  author?: { login: string; avatarUrl: string; htmlUrl: string } | null;
}

/**
 * Best-effort enrichment of changelog PR references with real GitHub
 * author/title/url data. Never throws — a failed lookup (rate limit,
 * deleted PR, missing token) just leaves the original ref untouched.
 */
async function enrichPrRefs(prRefs: unknown): Promise<unknown> {
  if (!Array.isArray(prRefs)) return prRefs;

  const { owner, repo, token } = config.github;
  if (!owner || !repo || !token) return prRefs;

  return Promise.all(
    prRefs.map(async (ref) => {
      const item = ref as ChangelogPrRefInput;
      if (item.author) return item;

      try {
        const summary = await fetchPullRequestSummary(owner, repo, item.number, token);

        return {
          number: item.number,
          title: item.title || summary.title,
          url: item.url ?? summary.url,
          author: summary.author,
        };
      } catch (err) {
        logger.error(`Failed to enrich changelog PR #${item.number} with GitHub author data`, err);
        return item;
      }
    }),
  );
}

export async function createChangelogEntry(input: ChangelogAdminCreateInput) {
  const enrichedPrRefs = await enrichPrRefs(input.prRefs);
  const id = input.id || slugifyVersion(input.version) || randomUUID();

  // Writing an entry by hand under a deleted release's id withdraws that delete (V-289).
  const [, entry] = await prisma.$transaction([
    prisma.changelogReleaseTombstone.deleteMany({ where: { id } }),
    prisma.changelogEntry.create({
      data: {
        id,
        version: input.version,
        title: input.title,
        summary: input.summary,
        type: input.type,
        publishedAt: input.publishedAt || new Date(),
        githubUrl: input.githubUrl,
        added: input.added ?? [],
        improved: input.improved ?? [],
        fixed: input.fixed ?? [],
        breaking: input.breaking ?? [],
        security: input.security ?? [],
        tags: input.tags ?? [],
        prRefs: (enrichedPrRefs as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        // Admin-written text: the release sync never re-parses it (V-066).
        editedAt: new Date(),
      },
    }),
  ]);

  await invalidateChangelogReadCaches();
  return entry;
}

export async function updateChangelogEntry(id: string, input: ChangelogAdminUpdateInput) {
  const existing = await prisma.changelogEntry.findUnique({ where: { id }, select: { id: true } });

  if (!existing) {
    throw new ApiError(404, "Changelog entry not found");
  }

  const enrichedPrRefs = input.prRefs === null ? null : await enrichPrRefs(input.prRefs);

  const entry = await prisma.changelogEntry.update({
    where: { id },
    data: {
      version: input.version,
      title: input.title,
      summary: input.summary,
      type: input.type,
      publishedAt: input.publishedAt,
      githubUrl: input.githubUrl,
      added: input.added,
      improved: input.improved,
      fixed: input.fixed,
      breaking: input.breaking,
      security: input.security,
      tags: input.tags,
      prRefs:
        enrichedPrRefs === null
          ? Prisma.JsonNull
          : (enrichedPrRefs as Prisma.InputJsonValue | undefined),
      // From now on the release sync leaves this entry's text alone (V-066).
      editedAt: new Date(),
    },
  });

  await invalidateChangelogReadCaches();
  return entry;
}

/**
 * An entry the release sync made, or one pointing at a GitHub release page: the sync would create
 * it again from the release, so its delete leaves a tombstone. A hand-made entry leaves none, or
 * a release later tagged with the same version would never sync.
 */
function cameFromRelease(entry: { tags: string[]; githubUrl: string | null }) {
  return entry.tags.includes("auto-synced") || Boolean(entry.githubUrl?.includes("/releases/"));
}

export async function deleteChangelogEntry(id: string) {
  const existing = await prisma.changelogEntry.findUnique({
    where: { id },
    select: { id: true, version: true, tags: true, githubUrl: true },
  });

  if (!existing) {
    throw new ApiError(404, "Changelog entry not found");
  }

  // The delete and its tombstone commit together (V-289): the next sync skips this release.
  await prisma.$transaction(async (tx) => {
    await tx.changelogEntry.delete({ where: { id } });
    if (cameFromRelease(existing))
      await tx.changelogReleaseTombstone.upsert({
        where: { id },
        create: { id, version: existing.version },
        update: { version: existing.version, deletedAt: new Date() },
      });
  });
  await invalidateChangelogReadCaches();

  return { id };
}
