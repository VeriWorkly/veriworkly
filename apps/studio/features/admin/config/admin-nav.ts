import {
  Activity,
  BadgeDollarSign,
  Coins,
  FileText,
  Gauge,
  Globe,
  GraduationCap,
  Handshake,
  KeyRound,
  Link2,
  Map as MapIcon,
  ScrollText,
  Server,
  ShieldCheck,
  Users,
  Wallet,
  Webhook,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { AdminActionQueueKey } from "@/features/admin/types/admin-types";
import { isAdminPage } from "@/features/admin/config/admin-routes";

/**
 * The one description of the admin's information architecture.
 *
 * The sidebar, the breadcrumb trail and the command palette all read this file, so a route
 * added here appears in all three at once.
 *
 * Order is by how often an operator needs each surface — moderation and money queues first,
 * read-only platform pages last — not alphabetically.
 */

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** One-line purpose, shown in the command palette. */
  description: string;
  /** Renders a live count from the action queue when non-zero. */
  badge?: AdminActionQueueKey;
  /** Revealed in the sidebar while this section is active; always in the command palette. */
  children?: Array<Omit<AdminNavItem, "icon" | "children">>;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: Gauge,
        description: "Platform metrics, trends and the operator action queue",
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        href: "/admin/users",
        label: "Users",
        icon: Users,
        description: "Search accounts, change roles, revoke sessions, delete users",
      },
      {
        href: "/admin/ambassadors",
        label: "Ambassadors",
        icon: GraduationCap,
        description: "Review ambassador applications",
        badge: "pendingAmbassadorApplications",
        children: [
          {
            href: "/admin/ambassadors/roster",
            label: "Roster",
            description: "Every approved ambassador and their campus",
          },
        ],
      },
      {
        href: "/admin/affiliates",
        label: "Affiliates",
        icon: Handshake,
        description: "Affiliate accounts, tiers and wallet balances",
        children: [
          {
            href: "/admin/affiliates/withdrawals",
            label: "Withdrawals",
            description: "Approve, reject or mark affiliate payouts as paid",
            badge: "pendingWithdrawals",
          },
          {
            href: "/admin/affiliates/commissions",
            label: "Commissions",
            description: "Release or reverse earned commission",
            badge: "pendingCommissions",
          },
          {
            href: "/admin/affiliates/referrals",
            label: "Referrals",
            description: "Referral attribution and conversion state",
          },
        ],
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        href: "/admin/portfolios",
        label: "Portfolios",
        icon: Globe,
        description: "Published portfolios, traffic and suspension controls",
        badge: "suspendedPortfolios",
      },
      {
        href: "/admin/documents",
        label: "Documents",
        icon: FileText,
        description: "Resumes and cover letters, visibility and moderation",
      },
      {
        href: "/admin/share-links",
        label: "Share links",
        icon: Link2,
        description: "Public share links and their view counts",
      },
    ],
  },
  {
    label: "Revenue",
    items: [
      {
        href: "/admin/billing",
        label: "Billing",
        icon: BadgeDollarSign,
        description: "Subscriptions, plan mix and lifecycle state",
        children: [
          {
            href: "/admin/billing/credits",
            label: "Credits",
            description: "Credit wallets and manual balance adjustments",
          },
          {
            href: "/admin/billing/entitlements",
            label: "Entitlements",
            description: "Grant or revoke feature entitlements",
          },
          {
            href: "/admin/billing/webhooks",
            label: "Webhooks",
            description: "Provider webhook events and replay",
            badge: "failedWebhooks",
          },
        ],
      },
    ],
  },
  {
    label: "Platform",
    items: [
      {
        href: "/admin/roadmap",
        label: "Roadmap",
        icon: MapIcon,
        description: "Public roadmap features and their status",
      },
      {
        href: "/admin/api-keys",
        label: "API keys",
        icon: KeyRound,
        description: "Issued API keys, rate limits and revocation",
      },
      {
        href: "/admin/audit",
        label: "Audit log",
        icon: ScrollText,
        description: "Every admin action, who took it and why",
      },
      {
        href: "/admin/system",
        label: "System",
        icon: Server,
        description: "Health checks, background jobs, cache and request logs",
        badge: "pendingPortfolioAssets",
      },
    ],
  },
];

/** Every route in the IA, parents and children, flattened for search and breadcrumbs. */
export const ADMIN_NAV_ROUTES = ADMIN_NAV_GROUPS.flatMap((group) =>
  group.items.flatMap((item) => [
    { href: item.href, label: item.label, description: item.description, group: group.label },
    ...(item.children ?? []).map((child) => ({
      href: child.href,
      label: `${item.label} · ${child.label}`,
      description: child.description,
      group: group.label,
    })),
  ]),
);

/**
 * `/admin` matches only exactly — every other route is a prefix match so a detail page like
 * `/admin/users/abc123` still highlights Users. Without the exact-match carve-out, `/admin`
 * would be "active" on literally every admin page.
 */
export function isNavItemActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** A record id in a path (a cuid, or a roadmap item's UUID), not a page name. */
const RECORD_ID =
  /^(c[a-z0-9]{20,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export interface AdminBreadcrumb {
  path: string;
  /** `null` for a path that is no page (a roadmap item has only its `/edit` page). */
  href: string | null;
  label: string;
}

/**
 * Breadcrumb trail for a pathname, resolved against the IA above.
 *
 * Falls back to title-casing an unrecognised segment (a nested `new`/`edit` route) rather than
 * dropping it, so a detail page still shows where it sits; a record id reads "Detail". A crumb
 * links only where a page exists.
 */
export function buildAdminBreadcrumbs(pathname: string): AdminBreadcrumb[] {
  const segments = pathname.split("/").filter(Boolean).slice(1);
  const crumbs: AdminBreadcrumb[] = [{ path: "/admin", href: "/admin", label: "Admin" }];

  let accumulated = "/admin";

  for (const segment of segments) {
    accumulated += `/${segment}`;

    const known = ADMIN_NAV_ROUTES.find((route) => route.href === accumulated);

    crumbs.push({
      path: accumulated,
      href: known || isAdminPage(accumulated) ? accumulated : null,
      label:
        known?.label.split(" · ").pop() ??
        (RECORD_ID.test(segment)
          ? "Detail"
          : segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")),
    });
  }

  return crumbs;
}

/** Non-navigation actions offered by the command palette. */
export const ADMIN_QUICK_LINKS = [
  {
    href: "/admin/users?sort=newest",
    label: "Newest signups",
    description: "Users list sorted by join date",
    icon: Users,
  },
  {
    href: "/admin/affiliates/withdrawals?status=REQUESTED",
    label: "Pending withdrawals",
    description: "Payouts waiting on a decision",
    icon: Wallet,
  },
  {
    href: "/admin/billing/webhooks?status=FAILED",
    label: "Failed webhooks",
    description: "Billing events that need a replay",
    icon: Webhook,
  },
  {
    href: "/admin/ambassadors?status=PENDING",
    label: "Pending applications",
    description: "Ambassador applications awaiting review",
    icon: GraduationCap,
  },
  {
    href: "/admin/portfolios?status=SUSPENDED",
    label: "Suspended portfolios",
    description: "Publications currently taken down",
    icon: ShieldCheck,
  },
  {
    href: "/admin/billing/credits",
    label: "Adjust credits",
    description: "Credit wallets and manual adjustments",
    icon: Coins,
  },
  {
    href: "/admin/audit",
    label: "Audit log",
    description: "Recent admin actions",
    icon: Activity,
  },
] as const;
