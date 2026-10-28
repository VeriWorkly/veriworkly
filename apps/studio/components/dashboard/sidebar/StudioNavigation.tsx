import type { LucideIcon } from "lucide-react";

import {
  Home,
  BookOpen,
  FileText,
  KeyRound,
  Newspaper,
  FolderOpen,
  UserRound,
  HelpCircle,
  PanelsTopLeft,
  ScanSearch,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@veriworkly/ui";
import { siteConfig } from "@/config/site";
import { useSessionUser } from "@/store/session-user";

export interface StudioNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
  /** Pages the proxy sends a guest to sign in for, or that hold nothing without an account. */
  signedInOnly?: boolean;
  match: (pathname: string) => boolean;
}

/** A guest is not offered pages that would only bounce them to the sign-in page. */
export function visibleNavItems(items: StudioNavItem[], signedIn: boolean) {
  return signedIn ? items : items.filter((item) => !item.signedInOnly);
}

export function useVisibleNavItems(items: StudioNavItem[]) {
  return visibleNavItems(items, Boolean(useSessionUser()?.email));
}

export const mainNav: StudioNavItem[] = [
  {
    href: "/",
    label: "Overview",
    icon: Home,
    match: (pathname) => pathname === "/",
  },

  {
    href: "/documents",
    label: "Documents",
    icon: FolderOpen,
    match: (pathname) => pathname.startsWith("/documents"),
  },

  {
    href: "/profile/master",
    label: "Master Profile",
    icon: UserRound,
    signedInOnly: true,
    match: (pathname) => pathname.startsWith("/profile/master"),
  },

  {
    href: "/ats",
    label: "ATS checker",
    icon: ScanSearch,
    match: (pathname) => pathname.startsWith("/ats"),
  },

  {
    href: "/templates",
    label: "Templates",
    icon: FileText,
    match: (pathname) => pathname.startsWith("/templates"),
  },

  {
    href: `${siteConfig.links.portfolio}/editor`,
    label: "Portfolio",
    icon: PanelsTopLeft,
    external: true,
    match: () => false,
  },
];

export const supportNav: StudioNavItem[] = [
  {
    href: siteConfig.links.docs,
    label: "Docs",
    icon: BookOpen,
    external: true,
    match: () => false,
  },

  {
    href: siteConfig.links.blog,
    label: "Blog",
    icon: Newspaper,
    external: true,
    match: () => false,
  },
];

export const bottomNav: StudioNavItem[] = [
  {
    href: `${siteConfig.links.main}/faq`,
    label: "FAQ",
    icon: HelpCircle,
    external: true,
    match: () => false,
  },

  {
    href: "/api-keys",
    label: "API keys",
    icon: KeyRound,
    signedInOnly: true,
    match: (pathname) => pathname.startsWith("/api-keys"),
  },
];

export function NavGroup({
  items,
  pathname,
  collapsed,
  label,
}: {
  items: StudioNavItem[];
  pathname: string;
  collapsed: boolean;
  label?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && !collapsed ? (
        <p className="text-muted px-2 pb-1 text-xs font-semibold tracking-[0.18em] uppercase">
          {label}
        </p>
      ) : null}

      {useVisibleNavItems(items).map((item) => (
        <StudioNavLink
          item={item}
          key={item.href}
          collapsed={collapsed}
          active={item.match(pathname)}
        />
      ))}
    </div>
  );
}

export function StudioNavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: StudioNavItem;
  active: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      target={item.external ? "_blank" : undefined}
      rel={item.external ? "noreferrer" : undefined}
      className={cn(
        "flex h-8 items-center gap-2 rounded-lg px-2 text-sm font-medium transition",
        collapsed && "justify-center px-0",
        active
          ? "bg-accent text-accent-foreground"
          : "text-foreground/78 hover:bg-card hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
      {item.external && !collapsed ? (
        <ExternalLink className="text-muted ml-auto h-3 w-3 shrink-0" aria-hidden="true" />
      ) : null}
      {item.external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </Link>
  );
}
