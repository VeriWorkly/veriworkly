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

  const entry = await prisma.changelogEntry.create({
    data: {
      id: input.id || slugifyVersion(input.version) || randomUUID(),
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
    },
  });

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
    },
  });

  await invalidateChangelogReadCaches();
  return entry;
}

export async function deleteChangelogEntry(id: string) {
  const existing = await prisma.changelogEntry.findUnique({ where: { id }, select: { id: true } });

  if (!existing) {
    throw new ApiError(404, "Changelog entry not found");
  }

  await prisma.changelogEntry.delete({ where: { id } });
  await invalidateChangelogReadCaches();

  return { id };
}
