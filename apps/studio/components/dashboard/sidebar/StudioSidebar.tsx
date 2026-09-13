"use client";

import { Search } from "lucide-react";

import { StudioSidebarHeader } from "./StudioSidebarHeader";
import { mainNav, supportNav, bottomNav, NavGroup } from "./StudioNavigation";
import { NewDocumentButton } from "../modals/NewDocumentModal";
import { AccountMenu } from "../account-menu/AccountMenu";

interface StudioSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSearch: () => void;
  onOpenNewDocument: () => void;
  pathname: string;
  email: string;
  displayName: string;
  version: string;
}

export function StudioSidebar({
  collapsed,
  onToggleCollapse,
  onOpenSearch,
  onOpenNewDocument,
  pathname,
  email,
  displayName,
  version,
}: StudioSidebarProps) {
  return (
    <aside className="border-border/70 bg-background/95 sticky top-0 z-40 hidden h-dvh flex-col border-r lg:flex">
      <StudioSidebarHeader collapsed={collapsed} onToggleCollapse={onToggleCollapse} />

      <div className="px-2">
        <NewDocumentButton collapsed={collapsed} onClick={onOpenNewDocument} />
      </div>

      {!collapsed ? (
        <div className="px-2 pt-3">
          <button
            type="button"
            onClick={onOpenSearch}
            className="border-border bg-card/70 text-muted hover:bg-card hover:text-foreground flex h-9 w-full items-center gap-2 rounded-lg border px-3 text-sm transition"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">Search workspace</span>
            <span className="ml-auto text-[10px]">Ctrl K</span>
          </button>
        </div>
      ) : null}

      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4" aria-label="Studio navigation">
        <NavGroup items={mainNav} pathname={pathname} collapsed={collapsed} />
        <NavGroup label="Resources" items={supportNav} pathname={pathname} collapsed={collapsed} />
      </nav>

      <nav className="space-y-1 px-2 pb-3" aria-label="Studio utility navigation">
        <NavGroup items={bottomNav} pathname={pathname} collapsed={collapsed} />
      </nav>

      <div className="border-border/70 p-2">
        <AccountMenu
          email={email}
          collapsed={collapsed}
          version={version}
          displayName={displayName}
        />
      </div>
    </aside>
  );
}
