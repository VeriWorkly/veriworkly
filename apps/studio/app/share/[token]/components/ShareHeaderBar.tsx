import Link from "next/link";
import type { ReactNode } from "react";
import { Sparkles, CalendarDays, LayoutDashboard } from "lucide-react";

import { Button } from "@veriworkly/ui";

import { ThemeToggle } from "@/components/dashboard/ThemeToggle";

import { authClient } from "@/lib/auth-client";

interface ShareHeaderBarProps {
  title: string;
  expiresAt: string | null;
  actions?: ReactNode;
}

export const ShareHeaderBar = ({ title, expiresAt, actions }: ShareHeaderBarProps) => {
  const { data: session } = authClient.useSession();

  const expiryLabel = expiresAt
    ? `Expires ${new Date(expiresAt).toLocaleDateString()}`
    : "No Expiry";

  return (
    <header className="sticky top-0 z-50 mx-auto w-full max-w-7xl px-4 py-4 md:px-6 md:pt-6">
      <div className="border-border bg-card/80 relative overflow-visible rounded-2xl border px-5 py-4 shadow-sm backdrop-blur-md md:rounded-full md:px-8 lg:px-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-accent/10 text-accent inline-block rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                Public View
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px] font-medium tracking-tight uppercase">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {expiryLabel}
                </span>
              </div>

              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
            </div>

            <h1 className="text-foreground truncate text-xl font-bold tracking-tight md:text-2xl">
              {title || "Shared Document"}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            {actions}

            <div className="flex items-center gap-2">
              {session ? (
                <Button
                  asChild
                  size="sm"
                  className="bg-foreground text-background hover:bg-foreground/90 h-10 rounded-full px-5 text-[12px] font-bold tracking-wide"
                >
                  <Link href="/">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  size="sm"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 h-10 rounded-full px-5 text-[12px] font-bold tracking-wide shadow-sm"
                >
                  <Link href="/">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Build Yours
                  </Link>
                </Button>
              )}

              <ThemeToggle className="border-border hover:bg-foreground/5 h-10 w-10 rounded-full border px-0 dark:border-zinc-800" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
