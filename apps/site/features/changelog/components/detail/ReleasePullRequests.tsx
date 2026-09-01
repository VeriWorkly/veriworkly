import Link from "next/link";
import Image from "next/image";
import { GitPullRequest } from "lucide-react";

import { siteConfig } from "@/config/site";

import { type ChangelogPrRef } from "@/features/changelog/services/changelog-backend";

interface ReleasePullRequestsProps {
  prRefs: ChangelogPrRef[];
}

export const ReleasePullRequests = ({ prRefs }: ReleasePullRequestsProps) => {
  if (prRefs.length === 0) return null;

  return (
    <section className="border-border/30 space-y-3 border-t pt-6">
      <h2 className="text-muted/70 font-mono text-[10px] font-bold tracking-widest uppercase">
        Shipped in {prRefs.length} pull request{prRefs.length === 1 ? "" : "s"}
      </h2>

      <ul className="space-y-2">
        {prRefs.map((pr) => (
          <li key={pr.number} className="text-muted flex items-center gap-2 text-sm">
            {pr.author ? (
              <Image
                width={18}
                height={18}
                alt={pr.author.login}
                title={pr.author.login}
                src={pr.author.avatarUrl}
                className="ring-border/40 shrink-0 rounded-full ring-1"
              />
            ) : (
              <GitPullRequest className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}

            <Link
              target="_blank"
              rel="noopener noreferrer"
              href={pr.url ?? `${siteConfig.links.github}/pull/${pr.number}`}
              className="hover:text-foreground flex min-w-0 items-center gap-2 transition-colors"
            >
              <span className="font-mono text-xs">#{pr.number}</span>
              <span className="truncate">{pr.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ReleasePullRequests;
