import { config } from "#config";
import { prisma } from "#lib/prisma";
import { fetchGitHubContributors } from "#services/github/index";
import type { ChangelogContributor } from "./types.js";

const MAX_TOP_CONTRIBUTORS = 30;

// Known repository core contributors as base fallback
const KNOWN_CORE_CONTRIBUTORS: ChangelogContributor[] = [
  {
    login: "Gautam25Raj",
    avatarUrl: "https://avatars.githubusercontent.com/u/63155224?v=4",
    htmlUrl: "https://github.com/Gautam25Raj",
  },
  {
    login: "Atharv-Shandilya",
    avatarUrl: "https://avatars.githubusercontent.com/u/135959630?v=4",
    htmlUrl: "https://github.com/Atharv-Shandilya",
  },
  {
    login: "aaditya-rathore",
    avatarUrl: "https://avatars.githubusercontent.com/u/123990694?v=4",
    htmlUrl: "https://github.com/aaditya-rathore",
  },
  {
    login: "HirenGajjar",
    avatarUrl: "https://avatars.githubusercontent.com/u/40492198?v=4",
    htmlUrl: "https://github.com/HirenGajjar",
  },
  {
    login: "Akshay7057017063",
    avatarUrl: "https://avatars.githubusercontent.com/u/114216378?v=4",
    htmlUrl: "https://github.com/Akshay7057017063",
  },
  {
    login: "subhan-f",
    avatarUrl: "https://avatars.githubusercontent.com/u/67074140?v=4",
    htmlUrl: "https://github.com/subhan-f",
  },
  {
    login: "dicnunz",
    avatarUrl: "https://avatars.githubusercontent.com/u/139033898?v=4",
    htmlUrl: "https://github.com/dicnunz",
  },
];

/**
 * Aggregates all contributors from:
 * 1. Known core repository contributors
 * 2. Live GitHub contributors API
 * 3. DB prRefs authors
 * 4. In-text @username mentions
 */
export async function computeContributorStats(): Promise<{
  contributorCount: number;
  topContributors: ChangelogContributor[];
}> {
  const seen = new Map<string, ChangelogContributor>();

  // 1. Seed known contributors
  for (const c of KNOWN_CORE_CONTRIBUTORS) {
    seen.set(c.login.toLowerCase(), c);
  }

  // 2. Fetch live contributors from GitHub if configured
  const { owner, repo, token } = config.github;
  if (owner && repo) {
    try {
      const apiContributors = await fetchGitHubContributors(owner, repo, token);
      for (const c of apiContributors) {
        seen.set(c.login.toLowerCase(), {
          login: c.login,
          avatarUrl: c.avatarUrl,
          htmlUrl: c.htmlUrl,
        });
      }
    } catch {
      // Non-fatal, fallback to DB and known contributors
    }
  }

  // 3. Scan changelog DB entries for prRefs authors and @mentions
  const rows = await prisma.changelogEntry.findMany({
    select: {
      prRefs: true,
      added: true,
      improved: true,
      fixed: true,
      breaking: true,
      security: true,
    },
  });

  for (const row of rows) {
    // Scan PR refs
    if (Array.isArray(row.prRefs)) {
      for (const ref of row.prRefs as unknown[]) {
        if (!ref || typeof ref !== "object") continue;

        const author = (ref as Record<string, unknown>).author;
        if (!author || typeof author !== "object") continue;

        const { login, avatarUrl, htmlUrl } = author as Record<string, unknown>;
        if (
          typeof login === "string" &&
          typeof avatarUrl === "string" &&
          typeof htmlUrl === "string"
        ) {
          seen.set(login.toLowerCase(), { login, avatarUrl, htmlUrl });
        }
      }
    }

    // Scan text items for @user mentions
    const allItems = [
      ...row.added,
      ...row.improved,
      ...row.fixed,
      ...row.breaking,
      ...row.security,
    ];
    for (const item of allItems) {
      const mentions = item.match(/(?:^|\s)@([a-zA-Z0-9_-]+)(?=[\s,.:;!?)\]]|$)/g);
      if (mentions) {
        for (const m of mentions) {
          const username = m.trim().replace(/^@/, "");
          if (
            username &&
            username.length >= 2 &&
            username.toLowerCase() !== "veriworkly" &&
            username.toLowerCase() !== "veriworkl" &&
            !username.includes("npm")
          ) {
            const lower = username.toLowerCase();
            if (!seen.has(lower)) {
              seen.set(lower, {
                login: username,
                avatarUrl: `https://github.com/${username}.png`,
                htmlUrl: `https://github.com/${username}`,
              });
            }
          }
        }
      }
    }
  }

  const all = Array.from(seen.values());

  return {
    contributorCount: all.length,
    topContributors: all.slice(0, MAX_TOP_CONTRIBUTORS),
  };
}
