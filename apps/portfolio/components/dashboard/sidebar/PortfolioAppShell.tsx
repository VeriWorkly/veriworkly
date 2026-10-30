"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@veriworkly/ui";

import type { CloudPortfolioDraft } from "@/lib/portfolio";

import { portfolioWorkspaceUrl, siteConfig } from "@/config/site";
import { backendApiUrl } from "@/lib/backend";
import { isPortfolioPubliclyVisible } from "@/lib/portfolio-status";
import { useWorkspace } from "@/components/WorkspaceProvider";

import { Header } from "./Header";
import { ProfileControl } from "./ProfileControl";
import { WorkspaceNavigation } from "./WorkspaceNavigation";
import { WorkspaceThemeControl } from "./WorkspaceThemeControl";

const SIDEBAR_KEY = "portfolio-sidebar-collapsed";

const noopSubscribe = () => () => {};

function readCollapsed() {
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === "true";
  } catch {
    return false;
  }
}

export function PortfolioAppShell({ children }: { children: React.ReactNode }) {
  const { user, workspace } = useWorkspace();
  // From the store rather than the server render, so "View site" goes away the moment the
  // user unpublishes. Only offered while the public site actually resolves.
  const slug = (workspace?.draft as CloudPortfolioDraft | null | undefined)?.slug;
  const publicUrl =
    slug && isPortfolioPubliclyVisible(workspace?.publication?.status)
      ? portfolioWorkspaceUrl(slug).href
      : undefined;

  // Expanded in the server render and while hydrating, then the saved choice. Reading
  // localStorage in a useState initialiser made those two renders differ (P-038).
  const stored = useSyncExternalStore(noopSubscribe, readCollapsed, () => false);
  const [choice, setChoice] = useState<boolean | null>(null);
  const collapsed = choice ?? stored;

  const toggleSidebar = () => {
    try {
      window.localStorage.setItem(SIDEBAR_KEY, String(!collapsed));
    } catch {
      // Storage blocked: the choice lasts for this page only.
    }
    setChoice(!collapsed);
  };

  const [signingOut, setSigningOut] = useState(false);
  const signOut = async () => {
    setSigningOut(true);
    try {
      await fetch(backendApiUrl("/auth/sign-out"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } finally {
      // The platform home is another origin. The local cache holds only a guest draft, so
      // nothing of this account stays behind for the next person on the browser.
      window.location.href = siteConfig.links.main;
    }
  };

  return (
    <div
      className={`bg-paper text-ink min-h-dvh transition-all duration-300 lg:grid ${
        collapsed ? "lg:grid-cols-[4.75rem_minmax(0,1fr)]" : "lg:grid-cols-[16rem_minmax(0,1fr)]"
      }`}
    >
      <aside className="border-line bg-panel hidden border-r lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div
          className={`border-line flex min-h-17 items-center border-b ${
            collapsed ? "justify-center px-2" : "gap-3 px-4"
          }`}
        >
          <Link
            href="/dashboard"
            title="Portfolio dashboard"
            className="flex min-w-0 items-center gap-3"
          >
            <Image src="/veriworkly-logo.png" width={30} height={30} alt="VeriWorkly" priority />

            {!collapsed ? (
              <span>
                <span className="block text-sm font-bold tracking-[-.03em]">Portfolio</span>
                <span className="text-muted block text-[10px] font-bold">by VeriWorkly</span>
              </span>
            ) : null}
          </Link>

          {!collapsed ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
              className="text-muted hover:bg-paper hover:text-ink ml-auto size-8 rounded-xl p-0"
            >
              <PanelLeftClose size={15} />
            </Button>
          ) : null}
        </div>

        {collapsed ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
            className="text-muted hover:bg-paper hover:text-accent mx-auto mt-3 size-9 rounded-xl p-0"
          >
            <PanelLeftOpen size={16} />
          </Button>
        ) : null}

        <WorkspaceNavigation variant="desktop" collapsed={collapsed} />

        <div className="border-line space-y-1 border-t p-3">
          <WorkspaceThemeControl collapsed={collapsed} />
          <ProfileControl user={user} collapsed={collapsed} />
          {user ? (
            <button
              className={`text-muted hover:bg-paper hover:text-ink flex w-full items-center rounded-xl text-xs font-extrabold transition disabled:opacity-60 ${
                collapsed ? "justify-center p-2.5" : "gap-3 p-2.5"
              }`}
              disabled={signingOut}
              onClick={() => void signOut()}
              title="Sign out"
              aria-label={collapsed ? "Sign out" : undefined}
              type="button"
            >
              <LogOut size={15} aria-hidden="true" />
              {!collapsed ? (signingOut ? "Signing out..." : "Sign out") : null}
            </button>
          ) : null}
        </div>
      </aside>

      <div className="min-w-0">
        <Header publicUrl={publicUrl} />
        <div className="min-h-[calc(100dvh-4.25rem)]">{children}</div>
      </div>
    </div>
  );
}
