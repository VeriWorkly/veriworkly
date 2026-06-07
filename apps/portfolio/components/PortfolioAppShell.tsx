"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Eye, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@veriworkly/ui";
import { portfolioPublicUrl } from "@/config/site";
import type { PortfolioWorkspaceBootstrap } from "@/store/portfolio-store";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { WorkspaceThemeControl } from "@/components/WorkspaceThemeControl";

export function PortfolioAppShell({
  children,
  user,
  draftSlug,
}: {
  children: React.ReactNode;
  user: PortfolioWorkspaceBootstrap["user"];
  draftSlug?: string;
}) {
  const initials = getInitials(user?.name || user?.email || "Portfolio user");
  const [collapsed, setCollapsed] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCollapsed(window.localStorage.getItem("portfolio-sidebar-collapsed") === "true");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const toggleSidebar = () => {
    setCollapsed((current) => {
      window.localStorage.setItem("portfolio-sidebar-collapsed", String(!current));
      return !current;
    });
  };

  return (
    <div
      className={`workspace-theme ${resolvedTheme === "dark" ? "dark" : ""} min-h-dvh bg-[var(--color-paper)] text-[var(--color-ink)] lg:grid ${collapsed ? "lg:grid-cols-[4.75rem_minmax(0,1fr)]" : "lg:grid-cols-[16rem_minmax(0,1fr)]"}`}
    >
      <aside className="hidden border-r border-[var(--color-line)] bg-[var(--color-panel)] lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div
          className={`flex min-h-[68px] items-center border-b border-[var(--color-line)] ${collapsed ? "justify-center px-2" : "gap-3 px-4"}`}
        >
          <Link
            className="flex min-w-0 items-center gap-3"
            href="/dashboard"
            title="Portfolio dashboard"
          >
            <Image src="/veriworkly-logo.png" width={30} height={30} alt="VeriWorkly" priority />
            {!collapsed ? (
              <span>
                <span className="block text-sm font-black tracking-[-.03em]">Portfolio</span>
                <span className="block text-[10px] font-bold text-[var(--color-muted)]">
                  by VeriWorkly
                </span>
              </span>
            ) : null}
          </Link>
          {!collapsed ? (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto size-8 rounded-lg p-0 text-[var(--color-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={15} />
            </Button>
          ) : null}
        </div>
        {collapsed ? (
          <Button
            variant="ghost"
            size="sm"
            className="mx-auto mt-3 size-9 rounded-[var(--radius-sm)] p-0 text-[var(--color-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-accent)]"
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen size={16} />
          </Button>
        ) : null}
        <WorkspaceNavigation variant="desktop" collapsed={collapsed} />
        <div className="space-y-1 border-t border-[var(--color-line)] p-3">
          <WorkspaceThemeControl collapsed={collapsed} />
          <Link
            className={`flex items-center rounded-[var(--radius-sm)] transition hover:bg-[var(--color-paper)] ${collapsed ? "justify-center p-1" : "gap-3 p-2.5"}`}
            href="/profile"
            title={user?.name || "Your profile"}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-accent)] text-xs font-black text-[var(--color-accent-ink)]">
              {initials}
            </span>
            {!collapsed ? (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-extrabold">
                  {user?.name || "Your profile"}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-[var(--color-muted)]">
                  {user?.email || "Portfolio identity"}
                </span>
              </span>
            ) : null}
          </Link>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex min-h-[68px] items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-paper-glass)] px-4 backdrop-blur-xl sm:px-6">
          <WorkspaceNavigation variant="mobile" />
          <p className="hidden flex-1 text-xs font-bold text-[var(--color-muted)] md:block">
            Portfolio workspace
          </p>
          <div className="ml-auto flex items-center gap-2">
            {draftSlug ? (
              <a
                className="hidden min-h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-xs font-extrabold text-[var(--color-ink)] sm:inline-flex"
                href={portfolioPublicUrl(draftSlug)}
                target="_blank"
                rel="noreferrer"
              >
                <Eye size={13} /> View site <ExternalLink size={11} />
              </a>
            ) : null}
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 text-xs font-extrabold text-[var(--color-accent-ink)]"
              href="/editor"
            >
              <Plus size={14} /> Edit portfolio
            </Link>
          </div>
        </header>
        <div className="min-h-[calc(100dvh-4.25rem)]">{children}</div>
      </div>
    </div>
  );
}

function getInitials(value: string) {
  return (
    value
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "VW"
  );
}
