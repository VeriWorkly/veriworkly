"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import type { PortfolioWorkspaceBootstrap } from "@/store/portfolio-store";

import { Button } from "@veriworkly/ui";

import { Header } from "./Header";
import { ProfileControl } from "./ProfileControl";
import { WorkspaceNavigation } from "./WorkspaceNavigation";
import { WorkspaceThemeControl } from "./WorkspaceThemeControl";

export function PortfolioAppShell({
  children,
  user,
  draftSlug,
}: {
  children: React.ReactNode;
  user: PortfolioWorkspaceBootstrap["user"];
  draftSlug?: string;
}) {
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem("portfolio-sidebar-collapsed") === "true",
  );

  const toggleSidebar = () => {
    setCollapsed((current) => {
      window.localStorage.setItem("portfolio-sidebar-collapsed", String(!current));
      return !current;
    });
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
                <span className="block text-sm font-black tracking-[-.03em]">Portfolio</span>
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
        </div>
      </aside>

      <div className="min-w-0">
        <Header draftSlug={draftSlug} />
        <div className="min-h-[calc(100dvh-4.25rem)]">{children}</div>
      </div>
    </div>
  );
}
