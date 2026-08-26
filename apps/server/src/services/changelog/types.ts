export type ChangelogType = "major" | "minor" | "patch";

export interface ChangelogQuery {
  type?: ChangelogType;
  tag?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export type ChangelogListResult = {
  items: Array<{
    id: string;
    version: string;
    title: string;
    summary: string | null;
    type: ChangelogType;
    publishedAt: Date;
    githubUrl: string | null;
    added: string[];
    improved: string[];
    fixed: string[];
    breaking: string[];
    security: string[];
    tags: string[];
    prRefs: unknown;
  }>;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  pagination: {
    mode: "offset";
    nextOffset: number | null;
    nextCursor: string | null;
  };
};

export interface ChangelogContributor {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
}

export interface ChangelogStatsResult {
  totalEntries: number;
  major: number;
  minor: number;
  patch: number;
  latest: {
    version: string;
    publishedAt: Date;
    title: string;
  } | null;
  contributorCount: number;
  topContributors: ChangelogContributor[];
}

export interface ChangelogAdminCreateInput {
  id?: string;
  version: string;
  title: string;
  summary?: string | null;
  type: ChangelogType;
  publishedAt?: Date;
  githubUrl?: string | null;
  added?: string[];
  improved?: string[];
  fixed?: string[];
  breaking?: string[];
  security?: string[];
  tags?: string[];
  prRefs?: unknown;
}

export interface ChangelogAdminUpdateInput {
  version?: string;
  title?: string;
  summary?: string | null;
  type?: ChangelogType;
  publishedAt?: Date;
  githubUrl?: string | null;
  added?: string[];
  improved?: string[];
  fixed?: string[];
  breaking?: string[];
  security?: string[];
  tags?: string[];
  prRefs?: unknown;
}
