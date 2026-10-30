import type { PortfolioContent } from "@/lib/portfolio";

export type PortfolioPublicationStatus = "LIVE" | "GRACE" | "SUSPENDED";

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
    {
      id: "seo",
      label: "Search metadata",
      complete: Boolean(content?.seo.title && content?.seo.description),
      href: "/settings",
    },
    {
      id: "publishing",
      label: "Public publishing",
      complete: isPortfolioPubliclyVisible(publicationStatus),
      href: "/settings",
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

/** Where a locked control sends the user, telling pricing what they wanted. */
export function upgradeHref(from: string) {
  return `/pricing?from=${encodeURIComponent(from)}`;
}
