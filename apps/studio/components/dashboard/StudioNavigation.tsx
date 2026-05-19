"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  FolderOpen,
  HelpCircle,
  Home,
  KeyRound,
  Newspaper,
  Settings,
} from "lucide-react";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export interface StudioNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
  match: (pathname: string) => boolean;
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
    href: `${siteConfig.links.main}/templates`,
    label: "Templates",
    icon: FileText,
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
    match: (pathname) => pathname.startsWith("/api-keys"),
  },

  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    match: (pathname) => pathname.startsWith("/settings"),
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
        <p className="text-muted px-2 pb-1 text-[10px] font-semibold tracking-[0.18em] uppercase">
          {label}
        </p>
      ) : null}

      {items.map((item) => (
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
    </Link>
  );
}
