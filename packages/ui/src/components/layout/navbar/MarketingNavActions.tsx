"use client";

import Link from "next/link";

import { Button } from "../../ui/Button";

import { ThemeToggle } from "../theme/ThemeToggle";
import { GithubIcon } from "../social/SocialIcons";

interface MarketingNavActionsProps {
  githubHref: string;
  appHref: string;
  ctaLabel?: string;
}

export const MarketingNavActions = ({
  githubHref,
  appHref,
  ctaLabel = "Start Building",
}: MarketingNavActionsProps) => {
  return (
    <div className="hidden items-center gap-4 lg:flex">
      <Link
        target="_blank"
        href={githubHref}
        rel="noopener noreferrer"
        className="text-muted hover:text-foreground hover:bg-accent/5 flex h-10 w-10 items-center justify-center rounded-full transition-colors"
      >
        <GithubIcon className="h-5 w-5" />
      </Link>

      <ThemeToggle />

      <Button
        asChild
        variant="primary"
        className="shadow-accent/10 hover:shadow-accent/20 rounded-full px-7 font-bold shadow-lg transition-all active:scale-95"
      >
        <Link href={appHref}>{ctaLabel}</Link>
      </Button>
    </div>
  );
};
