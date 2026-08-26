import { siteConfig } from "@/config/site";

import {
  type ChangelogEntry,
  type ChangelogIndexItem,
} from "@/features/changelog/services/changelog-backend";

import ReleaseTags from "./ReleaseTags";
import ChangelogRichText from "./ChangelogRichText";
import ReleaseActionLinks from "./ReleaseActionLinks";
import ReleaseContributors from "./ReleaseContributors";
import ReleasePullRequests from "./ReleasePullRequests";
import ReleaseCategorySections from "./ReleaseCategorySections";

import { formatChangelogDate, TYPE_META } from "@/features/changelog/utils/changelog-utils";

function getReleaseContributors(entry: ChangelogEntry) {
  const seen = new Map<string, { login: string; avatarUrl: string; htmlUrl: string }>();

  if (entry.prRefs)
    for (const pr of entry.prRefs) {
      if (pr.author?.login)
        seen.set(pr.author.login.toLowerCase(), {
          login: pr.author.login,
          avatarUrl: pr.author.avatarUrl,
          htmlUrl: pr.author.htmlUrl,
        });
    }

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

        if (!seen.has(lower))
          seen.set(lower, {
            login: username,
            avatarUrl: `https://github.com/${username}.png`,
            htmlUrl: `https://github.com/${username}`,
          });
      }
    }
  }

  return Array.from(seen.values());
}

interface ChangelogEntryDetailProps {
  entry: ChangelogEntry;
  older: ChangelogIndexItem | null;
  isLatest: boolean;
}

const ChangelogEntryDetail = ({ entry, older, isLatest }: ChangelogEntryDetailProps) => {
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

        <ReleaseContributors contributors={contributors} />

        <ReleaseActionLinks
          compareUrl={compareUrl}
          olderVersion={older?.version}
          githubUrl={entry.githubUrl}
        />
      </header>

      <ReleaseCategorySections entry={entry} />

      <ReleaseTags tags={entry.tags} />

      <ReleasePullRequests prRefs={prRefs} />
    </article>
  );
};

export default ChangelogEntryDetail;
