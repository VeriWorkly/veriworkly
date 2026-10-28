"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ExternalLink } from "lucide-react";

import { cn } from "@veriworkly/ui";

import { ADMIN_NAV_GROUPS, isNavItemActive } from "@/features/admin/config/admin-nav";
import type { AdminActionQueue, AdminActionQueueKey } from "@/features/admin/types/admin-types";
import type { AdminNavItem } from "@/features/admin/config/admin-nav";

interface AdminSidebarProps {
  queue: AdminActionQueue;
  /** Closes the mobile drawer after a navigation. No-op on desktop. */
  onNavigate?: () => void;
}

/**
 * Badge counts are affordances, not data — a queue at zero shows nothing rather than "0". A
 * count that could not be read (`null`) shows "—", so an unknown queue never looks empty.
 */
function QueueBadge({ count, critical }: { count: number | null; critical?: boolean }) {
  if (count !== null && count <= 0) return null;

  return (
    <span
      title={count === null ? "Count unavailable" : undefined}
      className={cn(
        "admin-numeric ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums",
        count === null
          ? "bg-admin-inset text-muted"
          : critical
            ? "bg-destructive/12 text-destructive"
            : "bg-warning/12 text-warning",
      )}
    >
      {count === null ? "—" : count > 99 ? "99+" : count}
    </span>
  );
}

/**
 * What a collapsed parent should show on its badge: its own queue plus every queue nested
 * under it.
 *
 * Sub-routes are only revealed while their section is active, so a parent that rendered just
 * its own badge would be silent about work one level down (Affiliates holds the withdrawal and
 * commission queues). Summing the subtree makes the rail's counts trustworthy at a glance.
 *
 * Once the section is expanded the children carry their own badges, so the parent drops back
 * to its own count rather than double-reporting the same items.
 */
function resolveBadge(item: AdminNavItem, queue: AdminActionQueue, expanded: boolean) {
  const keys: AdminActionQueueKey[] = [
    ...(item.badge ? [item.badge] : []),
    ...(expanded
      ? []
      : (item.children ?? []).flatMap((child) => (child.badge ? [child.badge] : []))),
  ];

  const counts = keys.map((key) => queue[key]);

  return {
    count: counts.includes(null)
      ? null
      : counts.reduce<number>((sum, count) => sum + (count ?? 0), 0),
    critical: keys.includes("failedWebhooks"),
  };
}

/**
 * The persistent left rail.
 *
 * A vertical rail because the admin has 20 routes, which would wrap a top nav onto a second
 * row on a laptop. It also has room for the icon and the live queue count that tell an operator
 * where the work is before they click anything.
 */
const AdminSidebar = ({ queue, onNavigate }: AdminSidebarProps) => {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="focus-visible:ring-accent flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:outline-none"
        >
          <span className="bg-accent text-accent-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
            V
          </span>

          <span className="min-w-0">
            <span className="text-foreground block truncate text-sm leading-tight font-semibold">
              VeriWorkly
            </span>
            <span className="text-muted block text-xs leading-tight">Admin console</span>
          </span>
        </Link>
      </div>

      <nav aria-label="Admin sections" className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            <p className="admin-label text-muted px-2.5 pb-1.5">{group.label}</p>

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                const Icon = item.icon;
                const badge = resolveBadge(item, queue, active);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        // The `before:` rule is the active marker: a 3px bar bled into the rail's
                        // left padding. A tinted pill alone had to carry both "this is the
                        // section you're in" and "this is hoverable", and at 10% accent it was
                        // hard to tell from the hover fill — the bar makes position unambiguous
                        // without deepening the tint until the label loses contrast.
                        "group/nav focus-visible:ring-accent relative flex items-center gap-2.5 rounded-lg py-2 pr-2 pl-2.5 text-sm font-medium transition focus-visible:ring-2 focus-visible:outline-none",
                        "before:absolute before:top-1/2 before:-left-2.5 before:h-4.5 before:w-0.75 before:-translate-y-1/2 before:rounded-r-full before:transition",
                        active
                          ? "bg-accent/10 text-accent before:bg-accent"
                          : "text-muted hover:bg-admin-inset hover:text-foreground before:bg-transparent",
                      )}
                    >
                      <Icon
                        className={cn("h-4 w-4 shrink-0", !active && "opacity-80")}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>

                      <QueueBadge count={badge.count} critical={badge.critical} />

                      {/* Marks a section with sub-routes, so it does not look like a leaf. */}
                      {item.children?.length ? (
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 transition-transform",
                            active ? "rotate-0 opacity-70" : "-rotate-90 opacity-40",
                          )}
                          aria-hidden="true"
                        />
                      ) : null}
                    </Link>

                    {/*
                      Sub-routes are revealed only while their section is active. Showing all 20
                      routes at once would make the rail scroll on a laptop; hiding them entirely
                      would leave pages like /admin/billing/entitlements reachable only by URL.
                    */}
                    {/* ml-4.5 puts the guide rule under the centre of the parent's icon, so the
                        sub-list reads as hanging off that item rather than floating loose. */}
                    {item.children && active ? (
                      <ul className="border-border mt-0.5 ml-4.5 space-y-0.5 border-l pl-2">
                        {item.children.map((child) => {
                          const childActive = isNavItemActive(pathname, child.href);

                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={onNavigate}
                                aria-current={childActive ? "page" : undefined}
                                className={cn(
                                  "focus-visible:ring-accent flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] transition focus-visible:ring-2 focus-visible:outline-none",
                                  childActive
                                    ? "bg-accent/10 text-accent font-medium"
                                    : "text-muted hover:bg-admin-inset hover:text-foreground",
                                )}
                              >
                                <span className="min-w-0 flex-1 truncate">{child.label}</span>

                                {child.badge ? (
                                  <QueueBadge
                                    count={queue[child.badge]}
                                    critical={child.badge === "failedWebhooks"}
                                  />
                                ) : null}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-border shrink-0 border-t p-2.5">
        <Link
          href="/"
          className="text-muted hover:bg-admin-inset hover:text-foreground focus-visible:ring-accent flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:outline-none"
        >
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
          Exit to app
        </Link>
      </div>
    </div>
  );
};

export default AdminSidebar;
