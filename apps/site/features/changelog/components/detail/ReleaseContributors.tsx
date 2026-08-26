import Link from "next/link";
import Image from "next/image";

import { type ChangelogPrAuthor } from "@/features/changelog/services/changelog-backend";

interface ReleaseContributorsProps {
  contributors: ChangelogPrAuthor[];
}

export const ReleaseContributors = ({ contributors }: ReleaseContributorsProps) => {
  if (contributors.length === 0) return null;

  return (
    <div className="bg-card/40 border-border/40 flex flex-wrap items-center gap-3 rounded-2xl border p-3">
      <span className="text-muted/80 font-mono text-[11px] font-bold tracking-wider uppercase">
        Contributors:
      </span>

      <div className="flex flex-wrap items-center gap-2">
        {contributors.map((c) => (
          <Link
            key={c.login}
            target="_blank"
            href={c.htmlUrl}
            rel="noopener noreferrer"
            title={`@${c.login} on GitHub`}
            className="border-border/40 bg-background/80 hover:border-accent/50 hover:bg-muted/10 group inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-1 transition-all"
          >
            <Image
              width={20}
              height={20}
              alt={c.login}
              src={c.avatarUrl}
              className="ring-border/40 bg-muted/20 rounded-full ring-1"
            />
            <span className="text-muted group-hover:text-foreground font-mono text-[11px] font-medium">
              @{c.login}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ReleaseContributors;
