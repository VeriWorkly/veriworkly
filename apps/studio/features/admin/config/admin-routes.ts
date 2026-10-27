/**
 * What the admin's single `error.tsx` and `loading.tsx` need to know about each route: the
 * operator's name for the surface ("Could not load the users list") and the skeleton that
 * matches the page's real layout, so nothing shifts when the data lands.
 */

export type AdminStatCount = 3 | 4 | 5;

export type AdminRouteSkeleton =
  | { kind: "dashboard" }
  /** `panel`: a full-width panel between the stat row and the filters. `aside`: a 20rem side form. */
  | { kind: "list"; stats?: AdminStatCount; panel?: boolean; aside?: boolean }
  /** `panelRow`: a row of three panels between the stat row and the main/side columns. */
  | { kind: "detail"; stats?: AdminStatCount; panelRow?: boolean }
  | { kind: "kanban" }
  | { kind: "form" };

export interface AdminRoute {
  /** `[id]` matches any one segment. Static siblings are listed before it and win. */
  path: string;
  surface: string;
  skeleton: AdminRouteSkeleton;
}

const ADMIN_ROUTES: AdminRoute[] = [
  { path: "/admin", surface: "the dashboard", skeleton: { kind: "dashboard" } },

  { path: "/admin/users", surface: "the users list", skeleton: { kind: "list" } },
  { path: "/admin/users/[id]", surface: "this user", skeleton: { kind: "detail", stats: 4 } },

  {
    path: "/admin/ambassadors",
    surface: "the ambassador applications",
    skeleton: { kind: "list", stats: 5 },
  },
  {
    path: "/admin/ambassadors/roster",
    surface: "the ambassador roster",
    skeleton: { kind: "list" },
  },
  { path: "/admin/ambassadors/[id]", surface: "this application", skeleton: { kind: "detail" } },

  {
    path: "/admin/affiliates",
    surface: "the affiliates list",
    skeleton: { kind: "list", stats: 4 },
  },
  {
    path: "/admin/affiliates/commissions",
    surface: "the commissions queue",
    skeleton: { kind: "list", aside: true },
  },
  {
    path: "/admin/affiliates/referrals",
    surface: "the referrals list",
    skeleton: { kind: "list" },
  },
  {
    path: "/admin/affiliates/withdrawals",
    surface: "the withdrawals queue",
    skeleton: { kind: "list" },
  },
  {
    path: "/admin/affiliates/[id]",
    surface: "this affiliate",
    skeleton: { kind: "detail", stats: 5 },
  },

  {
    path: "/admin/portfolios",
    surface: "the portfolios list",
    skeleton: { kind: "list", stats: 4 },
  },
  {
    path: "/admin/portfolios/[id]",
    surface: "this portfolio",
    skeleton: { kind: "detail", stats: 4 },
  },
  {
    path: "/admin/documents",
    surface: "the documents list",
    skeleton: { kind: "list", stats: 4 },
  },
  { path: "/admin/share-links", surface: "the share links", skeleton: { kind: "list" } },

  {
    path: "/admin/billing",
    surface: "the billing overview",
    skeleton: { kind: "list", stats: 4, panel: true },
  },
  {
    path: "/admin/billing/credits",
    surface: "the credit wallets",
    skeleton: { kind: "list", stats: 4, aside: true },
  },
  {
    path: "/admin/billing/entitlements",
    surface: "the entitlements list",
    skeleton: { kind: "list", aside: true },
  },
  {
    path: "/admin/billing/webhooks",
    surface: "the webhook events",
    skeleton: { kind: "list", stats: 3 },
  },
  {
    path: "/admin/billing/webhooks/[id]",
    surface: "this webhook event",
    skeleton: { kind: "detail" },
  },

  { path: "/admin/roadmap", surface: "the roadmap", skeleton: { kind: "kanban" } },
  { path: "/admin/roadmap/new", surface: "the roadmap editor", skeleton: { kind: "form" } },
  {
    path: "/admin/roadmap/[id]/edit",
    surface: "this roadmap item",
    skeleton: { kind: "form" },
  },

  {
    path: "/admin/api-keys",
    surface: "the API keys list",
    skeleton: { kind: "list", stats: 5 },
  },
  { path: "/admin/audit", surface: "the audit log", skeleton: { kind: "list" } },
  {
    path: "/admin/system",
    surface: "the system page",
    skeleton: { kind: "detail", stats: 4, panelRow: true },
  },
];

const FALLBACK_ROUTE: AdminRoute = {
  path: "",
  surface: "this page",
  skeleton: { kind: "list" },
};

function matches(pattern: string, pathname: string) {
  const expected = pattern.split("/");
  const actual = pathname.replace(/\/+$/, "").split("/");

  return (
    expected.length === actual.length &&
    expected.every((segment, index) => segment === "[id]" || segment === actual[index])
  );
}

/** Whether a pathname is an admin page; a breadcrumb links only to one. */
export function isAdminPage(pathname: string) {
  return ADMIN_ROUTES.some((route) => matches(route.path, pathname));
}

export function resolveAdminRoute(pathname: string | null): AdminRoute {
  if (!pathname) return FALLBACK_ROUTE;

  return ADMIN_ROUTES.find((route) => matches(route.path, pathname)) ?? FALLBACK_ROUTE;
}
