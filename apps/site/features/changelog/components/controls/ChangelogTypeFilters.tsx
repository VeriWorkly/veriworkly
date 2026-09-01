import Link from "next/link";

import { cn } from "@veriworkly/ui";

import { buildChangelogHref } from "@/features/changelog/utils/changelog-utils";
import { type ChangelogType } from "@/features/changelog/services/changelog-backend";

const ChangelogTypeFilters = ({
  activeType,
  search,
  basePath = "/changelog",
}: {
  activeType: ChangelogType | "all";
  search?: string;
  basePath?: string;
}) => {
  const types: Array<{ label: string; value: ChangelogType | "all" }> = [
    { label: "All Releases", value: "all" },
    { label: "Major", value: "major" },
    { label: "Minor", value: "minor" },
    { label: "Patch", value: "patch" },
  ];

  return (
    <div className="bg-muted/10 border-border/20 flex flex-wrap gap-0.5 rounded-2xl border p-0.5 sm:rounded-full">
      {types.map(({ label, value }) => {
        const isActive = activeType === value;

        return (
          <Link
            key={value}
            href={buildChangelogHref(basePath, {
              type: value === "all" ? undefined : value,
              search,
            })}
            className={cn(
              "rounded-full px-3.5 py-1.5 font-sans text-xs font-bold whitespace-nowrap transition-all duration-200 select-none",
              isActive
                ? "bg-card text-foreground border-border/30 border shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.05)]"
                : "text-muted hover:text-foreground hover:bg-muted/5 border border-transparent",
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
};

export default ChangelogTypeFilters;
