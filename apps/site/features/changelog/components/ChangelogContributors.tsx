import Image from "next/image";
import Link from "next/link";

import { type ChangelogStats } from "@/features/changelog/services/changelog-backend";

const MAX_VISIBLE_AVATARS = 15;

const ChangelogContributors = ({ stats }: { stats: ChangelogStats | null }) => {
  const contributors = stats?.topContributors ?? [];

  if (contributors.length === 0) return null;

  const visible = contributors.slice(0, MAX_VISIBLE_AVATARS);
  const totalCount = stats?.contributorCount && stats.contributorCount > 0 ? stats.contributorCount : contributors.length;
  const remaining = Math.max(0, totalCount - visible.length);

  return (
    <div className="mb-8 flex flex-wrap items-center gap-3">
      <div className="flex -space-x-2">
        {visible.map((author) => (
          <Link
            key={author.login}
            href={author.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`@${author.login} on GitHub`}
            className="border-background hover:border-accent/80 relative rounded-full border-2 transition-transform hover:z-10 hover:-translate-y-0.5"
          >
            <Image
              src={author.avatarUrl}
              alt={author.login}
              width={30}
              height={30}
              className="rounded-full bg-muted/20"
            />
          </Link>
        ))}
      </div>

      <p className="text-muted font-mono text-[11px] tracking-wide">
        Shipped by <span className="text-foreground font-semibold">{totalCount}</span>{" "}
        open source contributor{totalCount === 1 ? "" : "s"}
        {remaining > 0 ? ` (+${remaining} more)` : ""}
      </p>
    </div>
  );
};

export default ChangelogContributors;
