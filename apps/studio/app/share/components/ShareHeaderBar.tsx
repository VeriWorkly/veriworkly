import { Sparkles, CalendarDays } from "lucide-react";

import type { ReactNode } from "react";

import { Button } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

import { ThemeToggle } from "@/components/dashboard/ThemeToggle";

import { LocalDate } from "@/components/LocalDate";

interface ShareHeaderBarProps {
  title?: string;
  expiresAt: string | null;
  actions?: ReactNode;
}

/**
 * The reader is a recruiter, not a VeriWorkly user, so the bar asks for no session. On phones it
 * scrolls away with the page and stays compact; from `md` it sticks.
 */
export const ShareHeaderBar = ({ title, expiresAt, actions }: ShareHeaderBarProps) => {
  return (
    <header className="z-50 mx-auto w-full max-w-7xl px-3 pt-3 md:sticky md:top-0 md:px-6 md:pt-6 md:pb-4">
      <div className="border-border bg-card/80 relative overflow-visible rounded-2xl border px-4 py-3 shadow-sm backdrop-blur-md md:rounded-full md:px-8 md:py-4 lg:px-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-5">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-foreground truncate text-lg font-bold tracking-tight md:text-2xl">
              {title || "Shared Document"}
            </h1>

            {expiresAt ? (
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium">
                <CalendarDays className="h-3.5 w-3.5" />
                Available until <LocalDate value={expiresAt} />
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 md:justify-end md:gap-3">
            {actions}

            <div className="flex items-center gap-2">
              <Button
                asChild
                size="sm"
                variant="secondary"
                className="h-10 rounded-full px-5 text-[12px] font-bold tracking-wide"
              >
                <a href={siteConfig.links.main}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Build Yours
                </a>
              </Button>

              <ThemeToggle className="border-border hover:bg-foreground/5 h-10 w-10 rounded-full border px-0 dark:border-zinc-800" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
