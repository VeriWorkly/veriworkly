import type { PortfolioContent } from "@/lib/portfolio";

/**
 * Whether the public site actually resolves right now.
 *
 * `GRACE` counts: the server keeps serving those publications (only `SUSPENDED`
 * is pulled — see `PortfolioService.getPublicPortfolio`), so treating grace as
 * "not live" would hide the working public link from users whose subscription
 * has lapsed but whose site is still up.
 */
export function isPortfolioPubliclyVisible(status?: string | null) {
  return status === "LIVE" || status === "GRACE";
}

export type PortfolioReadinessCheckId = "identity" | "sections" | "seo" | "publishing";

export interface PortfolioReadinessCheck {
  id: PortfolioReadinessCheckId;
  label: string;
  complete: boolean;
  /** Where the user goes to complete this step. */
  href: string;
}

export interface PortfolioReadiness {
  checks: PortfolioReadinessCheck[];
  completedIdentity: number;
  visibleSections: number;
  projectCount: number;
  /** Share of `checks` that are complete — the checklist is the definition. */
  percent: number;
}

const IDENTITY_FIELDS = ["name", "headline", "bio", "email"] as const;

/**
 * Single source of truth for the dashboard's readiness score.
 *
 * The percentage and the health checklist used to be computed independently —
 * the score from identity fields plus visible sections, the checklist from four
 * unrelated conditions — so a portfolio could show "100%" next to a list that
 * was visibly two-of-four done. Both now derive from `checks`.
 */
export function getPortfolioReadiness(
  content: PortfolioContent | null,
  publicationStatus?: string | null,
  /** SEO controls are a paid feature; a free user's checklist must be completable (P-035). */
  hasAccess = false,
): PortfolioReadiness {
  const completedIdentity = content
    ? IDENTITY_FIELDS.filter((field) => content.identity[field]?.trim()).length
    : 0;

  const visibleSections = content?.sections.filter((section) => section.visible).length ?? 0;

  const projectCount =
    content?.sections.find((section) => section.type === "projects")?.items.length ?? 0;

  const checks: PortfolioReadinessCheck[] = [
    {
      id: "identity",
      label: "Profile details",
      complete: completedIdentity === IDENTITY_FIELDS.length,
      href: "/editor",
    },
    {
      id: "sections",
      label: "Portfolio sections",
      complete: visibleSections >= 2,
      href: "/editor",
    },
    // Only users who can edit the meta description in Settings are asked to fill it.
    ...(hasAccess
      ? [
          {
            id: "seo" as const,
            label: "Search metadata",
            complete: Boolean(content?.seo.title && content?.seo.description),
            href: "/settings",
          },
        ]
      : []),
    {
      id: "publishing",
      label: "Public publishing",
      complete: isPortfolioPubliclyVisible(publicationStatus),
      // Publish lives on the site status card; Settings has no publish control.
      href: "/dashboard#site-status",
    },
  ];

  const completed = checks.filter((check) => check.complete).length;

  return {
    checks,
    completedIdentity,
    visibleSections,
    projectCount,
    percent: Math.round((completed / checks.length) * 100),
  };
}

type BillingLike = {
  canPublish?: boolean;
  plan?: string;
  access?: { tier: string; isPaying: boolean };
} | null;

/**
 * The one rule for paid portfolio features in the workspace (P-010): premium templates, badge
 * removal, extra pages, SEO controls and analytics. `canPublish` is the server's
 * portfolio_publish grant: Creator Pro, the Bundle or an active pass. An AI Credits plan or a
 * credit pack buys AI credits only, so those accounts get the free rules.
 */
export function hasPortfolioAccess(billing: BillingLike | undefined) {
  return Boolean(billing?.canPublish);
}

/**
 * Publishing in GRACE applies the plan in effect now: the server computes the badge, SEO and
 * pages from the live entitlement, so a republish drops the paid features the grace period was
 * keeping. The owner is asked first (`GracePublishDialog`).
 */
export function publishEndsGrace(publication: { status: string } | null | undefined) {
  return publication?.status === "GRACE";
}

/** Where a locked control sends the user, telling pricing what they wanted. */
export function upgradeHref(from: string) {
  return `/pricing?from=${encodeURIComponent(from)}`;
}

const TIER_LABELS: Record<string, string> = {
  bundle: "Job Hunter Bundle",
  portfolio_pro: "Creator Pro",
  ai_credits: "AI Credits",
  pass: "Job Hunter pass",
  credits: "Credits customer",
};

const PLAN_LABELS: Record<string, string> = {
  BUNDLE: "Job Hunter Bundle",
  PORTFOLIO_PRO: "Creator Pro",
  AI_CREDITS: "AI Credits",
};

/**
 * The user's plan in a few words, the same names Studio's billing page uses. `access.tier` tells
 * a pass and a credit pack apart from a subscription; `plan` covers a summary without it. Anyone
 * who has paid for anything is never shown "Free" (owner rule).
 */
export function planLabel(billing: BillingLike | undefined) {
  const tier = billing?.access?.tier;
  if (tier && TIER_LABELS[tier]) return TIER_LABELS[tier];
  if (billing?.plan && PLAN_LABELS[billing.plan]) return PLAN_LABELS[billing.plan];

  return billing?.access?.isPaying ? "Credits customer" : "Free";
}

export type PublicationNotice = {
  tone: "live" | "warning" | "offline" | "draft";
  label: string;
  detail: string;
  /** The button the status card offers. Never "republish" for a moderation takedown: it would 403. */
  action: "publish" | "republish" | "renew" | "support" | null;
  /** A cancelled plan that has not ended yet. */
  planEnds: string | null;
};

/**
 * What the dashboard and Settings say about the site (P-014, P-033), from the publication, the
 * server's `offlineReason` and the billing dates. `formatDate` turns an ISO date into the
 * user's own format.
 */
export function publicationNotice(
  publication:
    | { status: string; offlineReason?: "moderation" | "owner" | "billing" | null }
    | null
    | undefined,
  billing:
    | {
        graceEndsAt?: string | null;
        cancelAtPeriodEnd?: boolean;
        accessEndsAt?: string | null;
        currentPeriodEnd?: string | null;
      }
    | null
    | undefined,
  formatDate: (iso: string) => string,
): PublicationNotice {
  const endsOn = billing?.accessEndsAt ?? billing?.currentPeriodEnd;
  const planEnds =
    billing?.cancelAtPeriodEnd && endsOn && publication?.status !== "GRACE"
      ? `Your plan ends on ${formatDate(endsOn)}.`
      : null;
  const notice = (rest: Omit<PublicationNotice, "planEnds">) => ({ ...rest, planEnds });

  if (!publication) {
    return notice({
      tone: "draft",
      label: "Not published yet",
      detail: "Publish your portfolio to put it online at your own address.",
      action: "publish",
    });
  }
  if (publication.status === "LIVE") {
    return notice({ tone: "live", label: "Live", detail: "Your site is online.", action: null });
  }
  if (publication.status === "GRACE") {
    const until = billing?.graceEndsAt ? `until ${formatDate(billing.graceEndsAt)}` : "for now";
    return notice({
      tone: "warning",
      label: "Plan ended",
      detail: `Your plan ended. Your site keeps its paid features ${until}, then moves to the free tier (Signal or Atelier with the badge). Renew to keep them.`,
      action: "renew",
    });
  }
  if (publication.offlineReason === "moderation") {
    return notice({
      tone: "offline",
      label: "Taken down",
      detail: "Taken down by a moderator. Contact support.",
      action: "support",
    });
  }
  if (publication.offlineReason === "owner") {
    return notice({
      tone: "offline",
      label: "Offline",
      detail: "Offline. You unpublished it.",
      action: "republish",
    });
  }
  if (publication.offlineReason === "billing") {
    return notice({
      tone: "offline",
      label: "Offline",
      detail:
        "Offline after a billing change. Republish to bring it back on the free tier. Nimbus and Cipher need an active plan.",
      action: "republish",
    });
  }
  return notice({
    tone: "offline",
    label: "Offline",
    detail: "Your site is offline.",
    action: "republish",
  });
}

/**
 * The 30 calendar days ending on `asOf` (a UTC "YYYY-MM-DD"), oldest first, with a zero for each
 * day without views. The server sends the last 30 days that HAD views, which can reach back
 * months, so summing it was not "last 30 days" (P-044). Without `asOf` the newest day is used.
 */
export function lastCalendarDays(
  daily: Array<{ date: string; count: number }>,
  asOf?: string,
  days = 30,
) {
  const counts = new Map<string, number>();
  for (const item of daily) {
    const day = String(item.date).slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + item.count);
  }
  const end = asOf ?? [...counts.keys()].sort().at(-1);
  if (!end) return [];
  const endMs = Date.parse(`${end}T00:00:00.000Z`);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(endMs - (days - 1 - index) * 86_400_000).toISOString().slice(0, 10);
    return { date, count: counts.get(date) ?? 0 };
  });
}
