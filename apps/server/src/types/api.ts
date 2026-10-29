import { Prisma } from "@prisma/client";

/** `GET /github/stats`, as `getGitHubStats` returns it (dates serialise to ISO strings). */
export interface GitHubStatsResponse {
  projectName: string;
  projectUrl: string;
  stats: {
    totalItems: number;
    /** Same as `totalItems`. Kept: the site reads `total` (owner decision 2026-10-25). */
    total: number;
    issues: number;
    pullRequests: number;
    todo: number;
    inProgress: number;
    done: number;
    completionRate: string;
  };
  syncedAt: Date | string;
  nextSyncAt: Date | string | null;
}

export interface PublicShareLink {
  id: string;
  /** The owner, so their own visit is not counted as a view (S-397). */
  userId?: string;
  slug: string;
  passwordHash: string | null;
  expiresAt: string | Date | null;
  /** Optional only for a public read cached before the column existed: missing means true. */
  allowDownload?: boolean;
  snapshot: Prisma.JsonValue;
  document: {
    title: string;
    slug?: string;
  };
}
