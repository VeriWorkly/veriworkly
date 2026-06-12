"use client";

import {
  X,
  Menu,
  Settings,
  FileText,
  BookOpen,
  BarChart3,
  CreditCard,
  ExternalLink,
  LayoutTemplate,
  LayoutDashboard,
  BriefcaseBusiness,
} from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

import { Tooltip } from "@veriworkly/ui";

import { veriworklyProductLinks } from "@/config/site";

import { WorkspaceThemeControl } from "./WorkspaceThemeControl";

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
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const navigation = (
    <NavigationContent
      pathname={pathname}
      collapsed={collapsed}
      onNavigate={() => setOpen(false)}
    />
  );

  if (variant === "desktop")
    return <div className="min-h-0 flex-1 overflow-y-auto p-3">{navigation}</div>;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open workspace navigation"
        className="border-line bg-panel grid size-9 place-items-center rounded-xl border lg:hidden"
      >
        <Menu size={16} />
      </button>

      {open && mounted
        ? createPortal(
            <div
              onMouseDown={() => setOpen(false)}
              className="bg-ink/45 fixed inset-0 z-50 lg:hidden"
            >
              <aside
                className="bg-panel text-ink flex h-full w-[min(19rem,88vw)] flex-col"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="border-line flex min-h-17 items-center justify-between border-b px-4">
                  <p className="text-sm font-black">Portfolio workspace</p>

                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close workspace navigation"
                    className="hover:bg-paper grid size-9 place-items-center rounded-xl"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
                  {navigation}

                  <div className="border-line mt-auto border-t pt-3">
                    <WorkspaceThemeControl collapsed={false} />
                  </div>
                </div>
              </aside>
            </div>,
            document.body,
          )
        : null}
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
        pathname={pathname}
        items={portfolioNav}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />

      <NavGroup
        external
        items={productNav}
        pathname={pathname}
        collapsed={collapsed}
        onNavigate={onNavigate}
        label="VeriWorkly products"
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
        <p className="text-muted px-2 text-[10px] font-extrabold tracking-[.12em] uppercase">
          {label}
        </p>
      ) : null}

      <div className="mt-2 space-y-1">
        {items.map(({ href, label: itemLabel, icon: Icon }) => {
          const active = !external && pathname === href;
          const className = `flex items-center rounded-sm py-2 text-xs font-extrabold transition ${collapsed ? "justify-center px-2" : "gap-3 px-2.5"} ${
            active ? "bg-accent text-accent-ink!" : "text-muted hover:bg-paper hover:text-ink"
          }`;

          const item = external ? (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={className}
              title={collapsed ? itemLabel : undefined}
            >
              <Icon size={16} />

              {!collapsed ? (
                <>
                  <span className="flex-1">{itemLabel}</span>
                  <ExternalLink size={11} className="opacity-45" />
                </>
              ) : null}
            </Link>
          ) : (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={className}
              title={collapsed ? itemLabel : undefined}
              aria-current={active ? "page" : undefined}
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
