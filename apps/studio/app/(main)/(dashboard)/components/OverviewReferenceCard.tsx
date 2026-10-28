import Link from "next/link";
import { BookOpen, FolderOpen, HelpCircle, ArrowRight } from "lucide-react";

import { cn } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

const referenceCards = [
  {
    href: `${siteConfig.links.docs}/docs`,
    title: "Studio docs",
    text: "Export, sharing, backup, and editor basics.",
    icon: BookOpen,
  },

  {
    href: "/documents",
    title: "Documents",
    text: "Open, share and back up your resumes and cover letters.",
    icon: FolderOpen,
  },

  {
    href: `${siteConfig.links.main}/faq`,
    title: "FAQ",
    text: "Quick answers about your account and documents.",
    icon: HelpCircle,
  },
];

/**
 * Help links. On phones they shrink to one-line rows so the user's documents are not pushed
 * below the fold; from `lg` they are the full cards.
 */
const OverviewReferenceCard = ({ className }: { className?: string }) => {
  return (
    <div className={cn("grid gap-2 lg:grid-cols-3 lg:gap-4", className)}>
      {referenceCards.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            key={item.title}
            href={item.href}
            target={item.href.startsWith("http") ? "_blank" : undefined}
            rel={item.href.startsWith("http") ? "noreferrer" : undefined}
            className="group border-border bg-card hover:border-accent/50 flex items-center gap-3 overflow-hidden rounded-2xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md lg:block lg:min-h-40 lg:p-5"
          >
            <div className="contents lg:flex lg:items-start lg:justify-between lg:gap-4">
              <span className="bg-accent/10 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl lg:h-11 lg:w-11">
                <Icon className="h-5 w-5" />
              </span>

              <ArrowRight className="text-muted group-hover:text-accent order-last h-5 w-5 shrink-0 transition group-hover:translate-x-1 lg:order-none" />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-base font-black tracking-tight lg:mt-7 lg:text-xl">
                {item.title}
              </h2>

              <p className="text-muted mt-2 hidden max-w-xs text-sm leading-6 lg:block">
                {item.text}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default OverviewReferenceCard;
