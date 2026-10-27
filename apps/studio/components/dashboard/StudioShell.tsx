"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";

import { StudioSidebar } from "./sidebar/StudioSidebar";
import { MobileHeader } from "./header/MobileHeader";
import { MobileNavDrawer } from "./header/MobileNavDrawer";
import { DashboardModalsHost } from "./modals/DashboardModalsHost";
import { GuestBackupBanner } from "./guest-backup/GuestBackupBanner";
import { useCreateDocument } from "./hooks/useCreateDocument";
import { useStudioShortcuts } from "./hooks/useStudioShortcuts";

import { cn } from "@veriworkly/ui";
import { useSessionUser } from "@/store/session-user";

interface StudioShellProps {
  children: ReactNode;
  mainClassName?: string;
}

const STUDIO_VERSION = `v${process.env.STUDIO_VERSION}`;

function StudioShell({ children, mainClassName }: StudioShellProps) {
  const pathname = usePathname();
  const user = useSessionUser();

  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Open for the path it was opened on: any navigation (a nav link or an account menu item)
  // closes the drawer without an effect.
  const [mobileNavPath, setMobileNavPath] = useState<string | null>(null);
  const mobileNavOpen = mobileNavPath === pathname;
  const [newDocumentOpen, setNewDocumentOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importProvider, setImportProvider] = useState<"linkedin" | "github">("linkedin");

  const email = user?.email || "No account connected";
  const displayName = user?.name || user?.email?.split("@")[0] || "Local builder";

  const { createNewDocument } = useCreateDocument();

  const handleOpenImport = (provider: "linkedin" | "github" = "linkedin") => {
    setImportProvider(provider);
    setImportModalOpen(true);
  };

  useStudioShortcuts({
    onOpenSearch: () => setSearchOpen(true),
    onOpenImport: handleOpenImport,
  });

  return (
    <div
      className={cn(
        "bg-background text-foreground min-h-dvh lg:grid",
        collapsed ? "lg:grid-cols-[4rem_minmax(0,1fr)]" : "lg:grid-cols-[16.5rem_minmax(0,1fr)]",
      )}
    >
      <a
        href="#studio-content"
        className="bg-background text-foreground ring-accent sr-only z-50 rounded-lg px-4 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:ring-2"
      >
        Skip to content
      </a>

      <StudioSidebar
        email={email}
        pathname={pathname}
        collapsed={collapsed}
        version={STUDIO_VERSION}
        displayName={displayName}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenNewDocument={() => setNewDocumentOpen(true)}
        onToggleCollapse={() => setCollapsed((value) => !value)}
      />

      <div className="flex min-h-dvh min-w-0 flex-col">
        <MobileHeader
          mobileNavOpen={mobileNavOpen}
          onOpenNewDocument={() => setNewDocumentOpen(true)}
          onToggleMobileNav={() => setMobileNavPath(mobileNavOpen ? null : pathname)}
        />

        {mobileNavOpen ? (
          <MobileNavDrawer
            email={email}
            pathname={pathname}
            version={STUDIO_VERSION}
            displayName={displayName}
            onClose={() => setMobileNavPath(null)}
          />
        ) : null}

        <DashboardModalsHost
          searchOpen={searchOpen}
          importProvider={importProvider}
          newDocumentOpen={newDocumentOpen}
          importModalOpen={importModalOpen}
          onOpenImport={handleOpenImport}
          onCreateNewDocument={createNewDocument}
          onCloseSearch={() => setSearchOpen(false)}
          onCloseImportModal={() => setImportModalOpen(false)}
          onCloseNewDocument={() => setNewDocumentOpen(false)}
        />

        <div
          className={cn(
            "relative min-w-0 flex-1 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--accent)_13%,transparent),transparent_28rem),linear-gradient(180deg,color-mix(in_oklab,var(--card)_62%,var(--background)),var(--background)_18rem)] p-4 sm:p-6 xl:p-8",
            mainClassName,
          )}
        >
          <div
            id="studio-content"
            tabIndex={-1}
            className="mx-auto h-full w-full max-w-7xl outline-none"
          >
            {children}
            {/* Inside the page, so the room it keeps below the content is the page's own. */}
            <GuestBackupBanner />
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudioShell;
