/**
 * Response shapes for the `/api/v1/admin/*` API.
 *
 * These mirror the server's admin service return types. They are hand-written rather than
 * generated because the admin API is internal and not part of the published OpenAPI surface —
 * if a field here drifts from the server, the page that reads it is the one that breaks, and
 * that is the file to fix.
 */

export interface AdminPaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export type Role = "USER" | "AMBASSADOR" | "ADMIN";
export type AffiliateStatus = "NOT_ENROLLED" | "PENDING" | "ACTIVE" | "SUSPENDED";
export type AffiliateTier = "TIER_1" | "TIER_2" | "TIER_3";
export type SubscriptionStatus = "INACTIVE" | "ACTIVE" | "PAST_DUE" | "CANCELED";
export type PublicationStatus = "LIVE" | "GRACE" | "SUSPENDED";
export type DocumentType = "RESUME" | "COVER_LETTER" | "PORTFOLIO" | "LINK_IN_BIO";
export type Visibility = "PRIVATE" | "UNLISTED" | "PUBLIC";
export type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";
export type CommissionStatus = "PENDING" | "AVAILABLE" | "REVERSED" | "PAID";
export type WithdrawalStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "PAID";
export type WebhookStatus = "PROCESSING" | "PROCESSED" | "FAILED";

export interface AdminUserRef {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  username?: string | null;
}

export interface AdminAuditEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: AdminUserRef | null;
}

export interface AdminOverview {
  generatedAt: string;
  windowDays: number;

  users: {
    total: number;
    newInWindow: number;
    previousWindow: number;
    growthPercent: number | null;
    byRole: Partial<Record<Role, number>>;
    verified: number;
    activeSessions: number;
  };

  billing: {
    subscriptions: {
      byStatus: Partial<Record<SubscriptionStatus, number>>;
      paying: number;
      byProduct: Record<string, number>;
      newLast30Days: number;
      cancelingAtPeriodEnd: number;
    };
    credits: {
      balance: number;
      reserved: number;
      lifetimeCredited: number;
      lifetimeDebited: number;
      grantedLast30Days: number;
      spentLast30Days: number;
    };
    webhooks: { byStatus: Partial<Record<WebhookStatus, number>>; failed: number };
    activeEntitlements: number;
  };

  portfolios: {
    live: number;
    grace: number;
    suspended: number;
    total: number;
    publishedLast30Days: number;
    views: { total: number; last30Days: number; last7Days: number };
    topTemplates: Array<{ templateId: string; count: number }>;
  };

  documents: {
    byType: Partial<Record<DocumentType, number>>;
    byVisibility: Partial<Record<Visibility, number>>;
    active: number;
    softDeleted: number;
    createdLast30Days: number;
    shareLinks: number;
    shareViews: number;
  };

  affiliates: AdminAffiliateSummary;
  ambassadors: AdminAmbassadorSummary;
  apiKeys: AdminApiKeySummary;
  jobs: AdminJobStatus;
  health: AdminSystemHealth;
  recentActivity: AdminAuditEntry[];

  actionQueue: AdminActionQueue;
}

/**
 * The six queues an operator drains. Served both inside `AdminOverview` and standalone from
 * `/admin/overview/queue`, which the shell uses for its nav badges — the two must stay
 * identical, so `AdminOverview["actionQueue"]` is defined as this type rather than repeating it.
 */
export interface AdminActionQueue {
  pendingAmbassadorApplications: number;
  pendingWithdrawals: number;
  pendingCommissions: number;
  failedWebhooks: number;
  suspendedPortfolios: number;
  pendingPortfolioAssets: number;
}

export type AdminActionQueueKey = keyof AdminActionQueue;

/** Daily buckets for the dashboard charts. Every array is aligned to `buckets` by index. */
export interface AdminTimeSeries {
  generatedAt: string;
  days: number;
  /** `YYYY-MM-DD`, oldest first, one entry per day with no gaps. */
  buckets: string[];
  series: {
    signups: number[];
    subscriptions: number[];
    publications: number[];
    documents: number[];
    portfolioViews: number[];
    creditsSpent: number[];
    commissionCents: number[];
  };
}

export interface AdminRecentActivity {
  signups: Array<AdminUserRef & { createdAt: string }>;
  publications: Array<{
    id: string;
    subdomain: string;
    status: PublicationStatus;
    publishedAt: string;
    user: AdminUserRef;
  }>;
  subscriptions: Array<{
    id: string;
    productKey: string;
    status: SubscriptionStatus;
    interval: string | null;
    createdAt: string;
    user: AdminUserRef;
  }>;
  applications: Array<{
    id: string;
    collegeName: string;
    createdAt: string;
    user: AdminUserRef;
  }>;
}

export interface AdminUserRow extends AdminUserRef {
  role: Role;
  emailVerified: boolean;
  ambassadorStatus: string;
  affiliateStatus: AffiliateStatus;
  affiliateTier: AffiliateTier;
  affiliateCode: string | null;
  createdAt: string;
  updatedAt: string;
  creditBalance: number;
  subscription: {
    productKey: string;
    status: SubscriptionStatus;
    currentPeriodEnd: string | null;
  } | null;
  portfolioPublication: { subdomain: string; status: PublicationStatus } | null;
  _count: { resumes: number; apiKeys: number; sessions: number };
}

export interface AdminUserDetail {
  user: AdminUserRow & {
    autoSyncEnabled: boolean;
    affiliateEnrolledAt: string | null;
    lastGithubImportAt: string | null;
    lastLinkedinImportAt: string | null;
    _count: {
      resumes: number;
      shareLinks: number;
      apiKeys: number;
      sessions: number;
      affiliateReferrals: number;
      portfolioAssets: number;
    };
  };
  subscriptions: Array<{
    id: string;
    productKey: string;
    status: SubscriptionStatus;
    interval: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    provider: string;
    createdAt: string;
    updatedAt: string;
  }>;
  entitlements: Array<{
    id: string;
    key: string;
    source: string;
    startsAt: string;
    endsAt: string | null;
    revokedAt: string | null;
  }>;
  credits: {
    wallet: {
      balance: number;
      reserved: number;
      lifetimeCredited: number;
      lifetimeDebited: number;
    } | null;
    transactions: Array<{
      id: string;
      type: string;
      amount: number;
      balanceAfter: number;
      action: string | null;
      reason: string | null;
      createdAt: string;
    }>;
  };
  documents: Array<{
    id: string;
    title: string;
    type: DocumentType;
    slug: string;
    visibility: Visibility;
    updatedAt: string;
    deletedAt: string | null;
  }>;
  publication: {
    id: string;
    subdomain: string;
    status: PublicationStatus;
    templateId: string;
    publishedAt: string;
    updatedAt: string;
    suspensionReason: string | null;
    suspendedAt: string | null;
  } | null;
  ambassadorApplication: {
    id: string;
    collegeName: string;
    graduationYear: string;
    status: ApplicationStatus;
    reviewNote: string | null;
    reviewedAt: string | null;
    createdAt: string;
  } | null;
  affiliate: {
    wallet: { pendingCents: number; availableCents: number; paidCents: number } | null;
    withdrawals: Array<{
      id: string;
      amountCents: number;
      status: WithdrawalStatus;
      createdAt: string;
      payoutNote: string | null;
    }>;
  };
  apiKeys: Array<{
    id: string;
    name: string;
    keyPrefix: string;
    keySuffix: string;
    scopes: string[];
    isActive: boolean;
    rateLimit: number;
    expiresAt: string | null;
    revokedAt: string | null;
    lastUsed: string | null;
    createdAt: string;
  }>;
  sessions: Array<{
    id: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    expiresAt: string;
  }>;
  auditEntries: AdminAuditEntry[];
}

export interface AdminAffiliateSummary {
  affiliatesByStatus: Partial<Record<AffiliateStatus, number>>;
  commissionsByStatus: Partial<Record<CommissionStatus, { count: number; amountCents: number }>>;
  wallets: { pendingCents: number; availableCents: number; paidCents: number };
  pendingWithdrawals: { count: number; amountCents: number };
  referralsByStatus: Record<string, number>;
  totalClicks: number;
}

export interface AdminAffiliateRow extends AdminUserRef {
  affiliateCode: string | null;
  affiliateStatus: AffiliateStatus;
  affiliateTier: AffiliateTier;
  affiliateEnrolledAt: string | null;
  createdAt: string;
  affiliateWallet: { pendingCents: number; availableCents: number; paidCents: number } | null;
  _count: { affiliateReferrals: number; affiliateClicks: number };
}

export interface AdminCommissionRow {
  id: string;
  amountCents: number;
  rateBps: number;
  status: CommissionStatus;
  reason: string | null;
  createdAt: string;
  affiliate: AdminUserRef & { affiliateCode: string | null };
  referral: { id: string; referredUser: { id: string; email: string } } | null;
}

export interface AdminWithdrawalRow {
  id: string;
  amountCents: number;
  status: WithdrawalStatus;
  payoutNote: string | null;
  reviewedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  user: AdminUserRef & {
    affiliateCode: string | null;
    affiliateWallet: { availableCents: number; paidCents: number } | null;
  };
}

export interface AdminReferralRow {
  id: string;
  code: string;
  status: string;
  convertedAt: string | null;
  createdAt: string;
  affiliate: AdminUserRef & { affiliateCode: string | null };
  referredUser: AdminUserRef & { createdAt: string };
}

export interface AdminAmbassadorSummary {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
  activeAmbassadors: number;
  applicationsLast7Days: number;
}

export interface AdminAmbassadorRow {
  id: string;
  collegeName: string;
  graduationYear: string;
  whyJoin: string;
  superpower: string;
  funFact: string;
  vibeCheck: string | null;
  socialHandle: string | null;
  status: ApplicationStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: AdminUserRef & { role: Role };
}

export interface AdminAmbassadorRosterRow extends AdminUserRef {
  role: Role;
  affiliateCode: string | null;
  affiliateStatus: AffiliateStatus;
  createdAt: string;
  ambassadorApplication: {
    collegeName: string;
    graduationYear: string;
    socialHandle: string | null;
    reviewedAt: string | null;
  } | null;
  _count: { affiliateReferrals: number };
}

export interface AdminPortfolioRow {
  id: string;
  subdomain: string;
  status: PublicationStatus;
  templateId: string;
  publishedRevision: number;
  suspensionReason: string | null;
  suspendedAt: string | null;
  publishedAt: string;
  updatedAt: string;
  totalViews: number;
  user: AdminUserRef;
  document: { id: string; title: string; slug: string; visibility: Visibility; revision: number };
  _count: { views: number };
}

export interface AdminPortfolioDetail {
  publication: Omit<AdminPortfolioRow, "totalViews" | "_count"> & {
    user: AdminUserRef & { role: Role; createdAt: string };
  };
  totalViews: number;
  dailyViews: Array<{ date: string; count: number }>;
  topReferrers: Array<{ host: string; count: number }>;
  auditEntries: AdminAuditEntry[];
}

export interface AdminDocumentRow {
  id: string;
  title: string;
  type: DocumentType;
  slug: string;
  tags: string[];
  templateId: string;
  visibility: Visibility;
  revision: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  user: AdminUserRef;
  _count: { shareLinks: number };
}

export interface AdminShareLinkRow {
  id: string;
  slug: string;
  viewCount: number;
  lastViewedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  passwordProtected: boolean;
  user: AdminUserRef;
  document: { id: string; title: string; type: DocumentType; visibility: Visibility };
  _count: { views: number };
}

export interface AdminSubscriptionRow {
  id: string;
  provider: string;
  providerCustomerId: string | null;
  providerSubId: string | null;
  productKey: string;
  status: SubscriptionStatus;
  interval: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  graceEndsAt: string | null;
  lastWebhookAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: AdminUserRef;
}

export interface AdminCreditWalletRow {
  id: string;
  balance: number;
  reserved: number;
  lifetimeCredited: number;
  lifetimeDebited: number;
  updatedAt: string;
  user: AdminUserRef;
}

export interface AdminEntitlementRow {
  id: string;
  key: string;
  source: string;
  sourceId: string;
  startsAt: string;
  endsAt: string | null;
  revokedAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: AdminUserRef;
}

export interface AdminWebhookRow {
  id: string;
  providerEventId: string;
  type: string;
  status: WebhookStatus;
  error: string | null;
  retryCount: number;
  lastAttemptAt: string | null;
  processedAt: string | null;
  createdAt: string;
  user: AdminUserRef | null;
}

export interface AdminApiKeySummary {
  total: number;
  active: number;
  revoked: number;
  expired: number;
  usedLast7Days: number;
}

export interface AdminApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  keySuffix: string;
  scopes: string[];
  isActive: boolean;
  rateLimit: number;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsed: string | null;
  createdAt: string;
  updatedAt: string;
  user: AdminUserRef;
}

export interface AdminSystemHealth {
  status: "ok" | "degraded";
  checks: Array<{
    name: string;
    status: "ok" | "down";
    latencyMs: number;
    error: string | null;
  }>;
  uptimeSeconds: number;
  nodeVersion: string;
  memory: { rssBytes: number; heapUsedBytes: number };
  timestamp: string;
}

export interface AdminJobStatus {
  lastUsageMetricFlush: { id: string; date: string; createdAt: string } | null;
  lastViewFlush: { id: string; kind: string; createdAt: string } | null;
  unresolvedWebhookEvents: number;
  pendingPortfolioAssets: number;
}

export interface AdminUsageMetrics {
  days: number;
  events: string[];
  series: Array<{ date: string; event: string; count: number }>;
  totals: Record<string, number>;
}

export interface AdminGithubStatus {
  stats: unknown;
  latestSync: {
    id: string;
    projectName: string;
    projectUrl: string;
    lastSyncStatus: string | null;
    lastError: string | null;
    nextSyncAt: string | null;
    syncedAt: string;
    issueCount: number;
    prCount: number;
    todoCount: number;
    inProgressCount: number;
    doneCount: number;
  } | null;
  itemsByStatus: Record<string, number>;
}

export interface AdminRequestLogRow {
  id: string;
  method: string;
  path: string;
  status: number;
  ip: string | null;
  userAgent: string | null;
  error: string | null;
  createdAt: string;
}

export interface AdminAuditFilters {
  actions: string[];
  targetTypes: string[];
  actors: AdminUserRef[];
}
