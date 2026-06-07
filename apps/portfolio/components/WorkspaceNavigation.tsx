"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CreditCard,
  ExternalLink,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  Menu,
  Settings,
  X,
} from "lucide-react";
import { veriworklyProductLinks } from "@/config/site";
import { Tooltip } from "@veriworkly/ui";
import { WorkspaceThemeControl } from "@/components/WorkspaceThemeControl";

const portfolioNav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/editor", label: "Portfolio editor", icon: LayoutTemplate },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

const productNav = [
  { href: veriworklyProductLinks.studio, label: "Document builder", icon: BriefcaseBusiness },
  { href: veriworklyProductLinks.blog, label: "Blog", icon: BookOpen },
  { href: veriworklyProductLinks.docs, label: "Docs", icon: FileText },
  { href: `${veriworklyProductLinks.studio}/billing`, label: "Billing", icon: CreditCard },
];

export function WorkspaceNavigation({
  variant,
  collapsed = false,
}: {
  variant: "desktop" | "mobile";
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const navigation = (
    <NavigationContent
      pathname={pathname}
      onNavigate={() => setOpen(false)}
      collapsed={collapsed}
    />
  );

  if (variant === "desktop")
    return <div className="min-h-0 flex-1 overflow-y-auto p-3">{navigation}</div>;

  return (
    <>
      <button
        className="grid size-9 place-items-center rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open workspace navigation"
      >
        <Menu size={16} />
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 bg-[var(--color-ink)]/45 lg:hidden"
          onMouseDown={() => setOpen(false)}
        >
          <aside
            className="flex h-full w-[min(19rem,88vw)] flex-col bg-[var(--color-panel)] text-[var(--color-ink)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex min-h-[68px] items-center justify-between border-b border-[var(--color-line)] px-4">
              <p className="text-sm font-black">Portfolio workspace</p>
              <button
                className="grid size-9 place-items-center rounded-[var(--radius-sm)] hover:bg-[var(--color-paper)]"
                onClick={() => setOpen(false)}
                aria-label="Close workspace navigation"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
              {navigation}
              <div className="mt-auto border-t border-[var(--color-line)] pt-3">
                <WorkspaceThemeControl />
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function NavigationContent({
  pathname,
  onNavigate,
  collapsed = false,
}: {
  pathname: string;
  onNavigate: () => void;
  collapsed?: boolean;
}) {
  return (
    <nav aria-label="Portfolio workspace" className={collapsed ? "space-y-4" : "space-y-7"}>
      <NavGroup
        label="Portfolio"
        items={portfolioNav}
        pathname={pathname}
        onNavigate={onNavigate}
        collapsed={collapsed}
      />
      <NavGroup
        label="VeriWorkly products"
        items={productNav}
        pathname={pathname}
        onNavigate={onNavigate}
        external
        collapsed={collapsed}
      />
    </nav>
  );
}

function NavGroup({
  label,
  items,
  pathname,
  onNavigate,
  external,
  collapsed,
}: {
  label: string;
  items: typeof portfolioNav;
  pathname: string;
  onNavigate: () => void;
  external?: boolean;
  collapsed?: boolean;
}) {
  return (
    <div>
      {!collapsed ? (
        <p className="px-2 text-[10px] font-extrabold tracking-[.12em] text-[var(--color-muted)] uppercase">
          {label}
        </p>
      ) : null}
      <div className="mt-2 space-y-1">
        {items.map(({ href, label: itemLabel, icon: Icon }) => {
          const active = !external && pathname === href;
          const className = `flex min-h-10 items-center rounded-xl text-xs font-extrabold transition ${collapsed ? "justify-center px-2" : "gap-3 px-2.5"} ${
            active
              ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
              : "text-[var(--color-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
          }`;
          const item = external ? (
            <a
              className={className}
              href={href}
              key={href}
              onClick={onNavigate}
              title={collapsed ? itemLabel : undefined}
            >
              <Icon size={16} />
              {!collapsed ? (
                <>
                  <span className="flex-1">{itemLabel}</span>
                  <ExternalLink size={11} className="opacity-45" />
                </>
              ) : null}
            </a>
          ) : (
            <Link
              aria-current={active ? "page" : undefined}
              className={className}
              href={href}
              key={href}
              onClick={onNavigate}
              title={collapsed ? itemLabel : undefined}
            >
              <Icon size={16} />
              {!collapsed ? <span>{itemLabel}</span> : null}
            </Link>
          );
          return collapsed ? (
            <Tooltip key={href} content={itemLabel} side="right">
              {item}
            </Tooltip>
          ) : (
            item
          );
        })}
      </div>
    </div>
  );
}
