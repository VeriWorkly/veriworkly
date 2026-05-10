export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  statusCode?: number;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface RoadmapFeatureResponse {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "done";
  eta?: string;
  tags?: string[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  completedQuarter?: string;
  updatedAt: string;
  fullDescription?: string;
  whyItMatters?: string;
  timeline?: string;
  details?: Record<string, unknown>;
}

export interface RoadmapStatsResponse {
  totalFeatures: number;
  todo: number;
  inProgress: number;
  done: number;
  completionRate: string;
}

export interface GitHubStatsResponse {
  projectName: string;
  projectUrl: string;
  stats: {
    totalItems: number;
    totalIssues: number;
    issues: number;
    pullRequests: number;
    todo: number;
    inProgress: number;
    done: number;
    completionRate: string;
  };
  syncedAt: string;
  nextSyncAt?: string | null;
  data?: Record<string, unknown>;
}

export interface PublicShareLink {
  id: string;
  token: string;
  passwordHash: string | null;
  expiresAt: any;
  snapshot: any;
  document: {
    title: string;
  };
}

