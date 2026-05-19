import Link from "next/link";
import { BookOpen, FolderOpen, HelpCircle, ArrowRight } from "lucide-react";

import { siteConfig } from "@/config/site";

const referenceCards = [
  {
    href: `${siteConfig.links.docs}/docs`,
    title: "Studio docs",
    text: "Export, sharing, sync, and editor basics.",
    icon: BookOpen,
  },

  {
    href: "/documents",
    title: "Resume library",
    text: "Open saved resumes with sync, sharing, and list view.",
    icon: FolderOpen,
  },

  {
    href: `${siteConfig.links.main}/faq`,
    title: "FAQ",
    text: "Fast answers for account and document workflow.",
    icon: HelpCircle,
  },
];

const OverviewReferenceCard = () => {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {referenceCards.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            key={item.title}
            href={item.href}
            target={item.href.startsWith("http") ? "_blank" : undefined}
            rel={item.href.startsWith("http") ? "noreferrer" : undefined}
            className="group border-border bg-card hover:border-accent/50 min-h-40 overflow-hidden rounded-2xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="bg-accent/10 text-accent flex h-11 w-11 items-center justify-center rounded-xl">
                <Icon className="h-5 w-5" />
              </span>

              <ArrowRight className="text-muted group-hover:text-accent h-5 w-5 transition group-hover:translate-x-1" />
            </div>

            <h2 className="mt-7 text-xl font-black tracking-tight">{item.title}</h2>

            <p className="text-muted mt-2 max-w-xs text-sm leading-6">{item.text}</p>
          </Link>
        );
      })}
    </div>
  );
};

export default OverviewReferenceCard;
