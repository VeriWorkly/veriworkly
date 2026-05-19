"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsLeft, ChevronsRight, Menu as MenuIcon, Search, X } from "lucide-react";

import {
  mainNav,
  NavGroup,
  bottomNav,
  supportNav,
  StudioNavLink,
} from "@/components/dashboard/StudioNavigation";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { AccountMenu } from "@/components/dashboard/AccountMenu";
import { NewDocumentButton } from "@/components/dashboard/NewDocumentModal";
import { WorkspaceSearchModal } from "@/components/dashboard/WorkspaceSearchModal";

import { createResume } from "@/features/resume/services/resume-service";
import { signOutCurrentUser } from "@/features/auth/services/current-user";

import { cn } from "@/lib/utils";

import { useUserStore } from "@/store/useUserStore";

interface StudioShellProps {
  children: ReactNode;
  mainClassName?: string;
}

const STUDIO_VERSION = "v3.4.0";

const StudioShell = ({ children, mainClassName }: StudioShellProps) => {
  const router = useRouter();
  const pathname = usePathname();

  const { user, logout } = useUserStore();

  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const email = user?.email || "No account connected";
  const displayName = user?.name || user?.email?.split("@")[0] || "Local builder";

  const createNewResume = () => {
    const resume = createResume();
    router.push(`/editor/resume/${resume.id}`);
  };

  const handleLogout = async () => {
    await signOutCurrentUser();

    logout();

    router.push("/login");
    router.refresh();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className={cn(
        "bg-background text-foreground min-h-dvh lg:grid",
        collapsed ? "lg:grid-cols-[4rem_minmax(0,1fr)]" : "lg:grid-cols-[16.5rem_minmax(0,1fr)]",
      )}
    >
      <aside className="border-border/70 bg-background/95 sticky top-0 z-40 hidden h-dvh flex-col border-r lg:flex">
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-4",
            collapsed && "flex-col justify-center px-2",
          )}
        >
          <Link href="/" className="shrink-0" aria-label="Go to VeriWorkly dashboard">
            <Image
              priority
              width={36}
              height={36}
              aria-hidden="true"
              alt="VeriWorkly Logo"
              src="/veriworkly-logo.png"
              className="h-9 w-9 rounded-xl object-contain"
            />
          </Link>

          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold tracking-tight">VeriWorkly</p>
              <p className="text-muted truncate text-xs">Document Studio</p>
            </div>
          ) : null}

          <button
            type="button"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "text-muted hover:bg-card hover:text-foreground hidden h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition lg:flex",
              collapsed && "order-first",
            )}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="px-2">
          <NewDocumentButton collapsed={collapsed} onClick={createNewResume} />
        </div>

        {!collapsed ? (
          <div className="px-2 pt-3">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
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
          <NavGroup
            label="Resources"
            items={supportNav}
            pathname={pathname}
            collapsed={collapsed}
          />
        </nav>

        <nav className="space-y-1 px-2 pb-3" aria-label="Studio utility navigation">
          <NavGroup items={bottomNav} pathname={pathname} collapsed={collapsed} />
        </nav>

        <div className="border-border/70 p-2">
          <AccountMenu
            email={email}
            collapsed={collapsed}
            onLogout={handleLogout}
            version={STUDIO_VERSION}
            displayName={displayName}
            onProfile={() => router.push("/profile")}
            onSettings={() => router.push("/settings")}
          />
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <header className="border-border/70 bg-background/90 sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/" className="flex items-center gap-3" aria-label="VeriWorkly dashboard">
            <Image
              priority
              width={36}
              height={36}
              alt="VeriWorkly"
              src="/veriworkly-logo.png"
              className="h-9 w-9 rounded-xl object-contain"
            />

            <span className="font-extrabold">VeriWorkly</span>
          </Link>

          <div className="flex items-center gap-2">
            <NewDocumentButton compact onClick={createNewResume} />

            <button
              type="button"
              aria-expanded={mobileNavOpen}
              aria-label="Toggle navigation"
              onClick={() => setMobileNavOpen((open) => !open)}
              className="border-border bg-card text-foreground flex h-10 w-10 items-center justify-center rounded-xl border"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {mobileNavOpen ? (
          <div className="border-border/70 bg-background/95 space-y-4 border-b p-4 backdrop-blur lg:hidden">
            <nav className="grid gap-1" aria-label="Mobile studio navigation">
              {[...mainNav, ...supportNav].map((item) => (
                <StudioNavLink
                  item={item}
                  key={item.href}
                  active={item.match(pathname)}
                  onNavigate={() => setMobileNavOpen(false)}
                />
              ))}
            </nav>

            <div className="border-border bg-card flex items-center justify-between rounded-2xl border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{displayName}</p>
                <p className="text-muted truncate text-xs">{email}</p>
              </div>

              <ThemeToggle className="h-9 w-9 rounded-xl px-0" />
            </div>
          </div>
        ) : null}

        <WorkspaceSearchModal
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          onOpenDocument={(id) => router.push(`/editor/resume/${id}`)}
        />

        <div
          className={cn(
            "relative min-w-0 flex-1 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--accent)_13%,transparent),transparent_28rem),linear-gradient(180deg,color-mix(in_oklab,var(--card)_62%,var(--background)),var(--background)_18rem)] p-4 sm:p-6 xl:p-8",
            mainClassName,
          )}
        >
          <div className="mx-auto h-full w-full max-w-7xl">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default StudioShell;
