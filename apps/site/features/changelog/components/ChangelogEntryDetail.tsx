import Link from "next/link";
import Image from "next/image";
import { ExternalLink, GitCompareArrows, GitPullRequest } from "lucide-react";

import { siteConfig } from "@/config/site";

import {
  type ChangelogEntry,
  type ChangelogIndexItem,
} from "@/features/changelog/services/changelog-backend";

import ChangelogRichText from "./ChangelogRichText";
import { categoriesFor, formatChangelogDate, TYPE_META } from "./changelog-utils";

const linkClass =
  "border-border/40 text-muted hover:text-foreground hover:border-border/60 hover:bg-muted/5 group inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-sans text-xs font-semibold whitespace-nowrap transition-colors";

function getReleaseContributors(entry: ChangelogEntry) {
  const seen = new Map<string, { login: string; avatarUrl: string; htmlUrl: string }>();

  // 1. From PR references
  if (entry.prRefs) {
    for (const pr of entry.prRefs) {
      if (pr.author?.login) {
        seen.set(pr.author.login.toLowerCase(), {
          login: pr.author.login,
          avatarUrl: pr.author.avatarUrl,
          htmlUrl: pr.author.htmlUrl,
        });
      }
    }
  }

  // 2. From @mentions in all release content
  const allText = [
    entry.summary ?? "",
    ...(entry.added ?? []),
    ...(entry.improved ?? []),
    ...(entry.fixed ?? []),
    ...(entry.breaking ?? []),
    ...(entry.security ?? []),
  ].join(" ");

  const mentions = allText.match(/(?:^|\s)@([a-zA-Z0-9_-]+)(?=[\s,.:;!?)\]]|$)/g);
  if (mentions) {
    for (const m of mentions) {
      const username = m.trim().replace(/^@/, "");
      if (
        username &&
        username.length >= 2 &&
        username.toLowerCase() !== "veriworkly" &&
        username.toLowerCase() !== "veriworkl" &&
        !username.includes("npm")
      ) {
        const lower = username.toLowerCase();
        if (!seen.has(lower)) {
          seen.set(lower, {
            login: username,
            avatarUrl: `https://github.com/${username}.png`,
            htmlUrl: `https://github.com/${username}`,
          });
        }
      }
    }
  }

  return Array.from(seen.values());
}

const ChangelogEntryDetail = ({
  entry,
  older,
  isLatest,
}: {
  entry: ChangelogEntry;
  older: ChangelogIndexItem | null;
  isLatest: boolean;
}) => {
  const categories = categoriesFor(entry);
  const typeMeta = TYPE_META[entry.type];
  const prRefs = entry.prRefs ?? [];
  const contributors = getReleaseContributors(entry);

  const compareUrl = older
    ? `${siteConfig.links.github}/compare/Release-v${older.version}...Release-v${entry.version}`
    : null;

  return (
    <article className="space-y-10">
      <header className="border-border/40 space-y-5 border-b pb-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-foreground font-mono text-2xl font-bold tracking-tight">
            v{entry.version}
          </span>

          <span
            className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wide uppercase ${typeMeta.className}`}
          >
            {typeMeta.label}
          </span>

          {isLatest && (
            <span className="bg-accent text-accent-foreground rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wide uppercase">
              Latest
            </span>
          )}

          <time
            dateTime={entry.publishedAt}
            className="text-muted font-mono text-[11px] tracking-wide"
          >
            {formatChangelogDate(entry.publishedAt)}
          </time>
        </div>

        <h1 className="text-foreground font-sans text-3xl font-bold tracking-tight sm:text-4xl">
          {entry.title}
        </h1>

        {entry.summary && (
          <ChangelogRichText
            multiline
            content={entry.summary}
            className="text-muted max-w-3xl text-base leading-relaxed"
          />
        )}

        {contributors.length > 0 && (
          <div className="bg-card/40 border-border/40 flex flex-wrap items-center gap-3 rounded-2xl border p-3">
            <span className="text-muted/80 font-mono text-[11px] font-bold tracking-wider uppercase">
              Contributors:
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {contributors.map((c) => (
                <Link
                  key={c.login}
                  href={c.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`@${c.login} on GitHub`}
                  className="border-border/40 bg-background/80 hover:border-accent/50 hover:bg-muted/10 group inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-1 transition-all"
                >
                  <Image
                    src={c.avatarUrl}
                    alt={c.login}
                    width={20}
                    height={20}
                    className="ring-border/40 rounded-full ring-1 bg-muted/20"
                  />
                  <span className="font-mono text-[11px] font-medium text-muted group-hover:text-foreground">
                    @{c.login}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {(compareUrl || entry.githubUrl) && (
          <div className="flex flex-wrap items-center gap-2">
            {compareUrl && (
              <Link
                target="_blank"
                href={compareUrl}
                className={linkClass}
                rel="noopener noreferrer"
              >
                <GitCompareArrows className="h-3 w-3" aria-hidden="true" />
                Compare with v{older?.version}
              </Link>
            )}

            {entry.githubUrl && (
              <Link
                target="_blank"
                className={linkClass}
                href={entry.githubUrl}
                rel="noopener noreferrer"
              >
                View on GitHub
                <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            )}
          </div>
        )}
      </header>

      {categories.length > 0 ? (
        <div className="space-y-8">
          {categories.map(({ category, items, label, icon: Icon, text, border }) => (
            <section key={category} className={`space-y-3 border-l-2 pl-5 ${border}`}>
              <h2
                className={`flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-widest uppercase ${text}`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
                <span className="text-muted/70">({items.length})</span>
              </h2>

              <ul className="space-y-2.5">
                {items.map((item, index) => (
                  <li
                    key={index}
                    className="text-muted flex items-start gap-2.5 text-sm leading-relaxed"
                  >
                    <span
                      className="bg-muted/40 mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                      aria-hidden="true"
                    />

                    <div className="min-w-0 flex-1">
                      <ChangelogRichText content={item} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="text-muted text-sm leading-relaxed">
          No itemised changes were recorded for this release. The linked GitHub release and pull
          requests carry the full detail.
        </p>
      )}

      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="bg-muted/10 text-muted border-border/30 rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-wide"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {prRefs.length > 0 && (
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
      )}
    </article>
  );
};

export default ChangelogEntryDetail;
