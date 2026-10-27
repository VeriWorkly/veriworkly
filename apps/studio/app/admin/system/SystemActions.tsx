"use client";

import { useState, useSyncExternalStore } from "react";

import { Select } from "@veriworkly/ui";

import AdminActionDialog from "@/components/admin/AdminActionDialog";
import {
  flushAdminCache,
  triggerAdminGithubSync,
  type AdminCachePrefix,
} from "@/features/admin/services/admin-actions";
import { useGithubSyncRunning } from "@/features/admin/utils/use-github-sync";

const subscribeNever = () => () => {};

/**
 * `targets` are the server's names for what each choice flushes (`FLUSH_TARGETS` in the admin
 * system service): `…:` entries are key prefixes that are deleted, the rest are cache
 * generations that are bumped so every key under them goes stale at once.
 */
const CACHE_PREFIXES: Array<{
  value: AdminCachePrefix;
  label: string;
  description: string;
  targets: string[];
}> = [
  {
    value: "portfolio:public",
    label: "Public portfolios",
    description: "Cached public portfolio sites and the public portfolio list.",
    targets: ["portfolio:public:list", "portfolio:public:site:"],
  },
  {
    value: "user:profile",
    label: "User profiles",
    description: "Per-user profile snapshots, including entitlement state.",
    targets: ["user:profile:"],
  },
  {
    value: "affiliate",
    label: "Affiliate dashboards",
    description: "Affiliate dashboard and leaderboard aggregates.",
    targets: ["affiliate:dashboard:", "affiliate:leaderboard:"],
  },
  {
    value: "credits",
    label: "Credit summaries",
    description: "Cached credit summaries and credit history pages.",
    targets: ["credits:summary:", "credits:history:"],
  },
  {
    value: "changelog",
    label: "Changelog",
    description: "Public changelog list, entries and stats.",
    targets: ["changelog:list", "changelog:entry", "changelog:stats"],
  },
  {
    value: "roadmap",
    label: "Roadmap",
    description: "Public roadmap list, items and stats.",
    targets: ["roadmap:list", "roadmap:feature", "roadmap:stats"],
  },
];

/**
 * Session records are deliberately not flushable from here — the server only accepts these
 * six names, so no combination of clicks on this page can sign every user out.
 */
export function CacheFlushControls() {
  const [prefix, setPrefix] = useState<AdminCachePrefix>("portfolio:public");

  const selected = CACHE_PREFIXES.find((entry) => entry.value === prefix);

  return (
    <div className="space-y-3">
      <Select
        aria-label="Cache prefix"
        className="h-9 text-xs"
        value={prefix}
        onChange={(event) => setPrefix(event.target.value as AdminCachePrefix)}
      >
        {CACHE_PREFIXES.map((entry) => (
          <option key={entry.value} value={entry.value}>
            {entry.label}
          </option>
        ))}
      </Select>

      <p className="text-muted text-xs leading-5">{selected?.description}</p>

      <AdminActionDialog
        trigger="Flush cache"
        title="Flush this cache"
        description={`Flushes ${selected?.targets.join(", ")}. The next request for each rebuilds from the database — expect a brief latency spike, not data loss.`}
        confirmLabel="Flush"
        onConfirm={async (reason) => {
          await flushAdminCache(prefix, reason);
        }}
      />
    </div>
  );
}

/**
 * A manual sync answers 202 and runs in the background for up to several minutes, so the
 * control polls the status endpoint while one is running and refreshes the page once it ends.
 */
export function GithubSyncControls({
  running: serverRunning,
  nextSyncAt,
}: {
  running: boolean;
  nextSyncAt: string | null;
}) {
  const [force, setForce] = useState(false);
  const { running, pollError, markStarted } = useGithubSyncRunning(serverRunning);

  return (
    <div className="space-y-3">
      <label className="text-muted flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={force}
          onChange={(event) => setForce(event.target.checked)}
        />
        Force a full sync (ignore the ETag and re-fetch everything)
      </label>

      {nextSyncAt ? (
        <p className="text-muted text-xs">
          The scheduled job next runs at <LocalDateTime iso={nextSyncAt} />.
        </p>
      ) : null}

      {running ? (
        <p role="status" className="text-accent text-xs">
          A sync is running. This panel updates when it finishes.
        </p>
      ) : null}

      {pollError ? (
        <p role="alert" className="text-destructive text-xs">
          {pollError}
        </p>
      ) : null}

      <AdminActionDialog
        trigger="Sync now"
        triggerVariant="primary"
        disabled={running}
        title="Trigger a GitHub sync"
        description={
          force
            ? "A full re-fetch of every issue and pull request. Slower, and it spends more of the GitHub API quota. It runs in the background."
            : "An incremental sync — only changes since the last run are fetched. It runs in the background."
        }
        confirmLabel="Run sync"
        onConfirm={async (reason) => {
          await triggerAdminGithubSync(reason, force);
          markStarted();
        }}
      />
    </div>
  );
}

/**
 * Locale and time zone exist only in the browser, so the server snapshot is the UTC instant
 * and React swaps in the local text after hydration instead of reporting a mismatch.
 */
function LocalDateTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    subscribeNever,
    () => new Date(iso).toLocaleString(),
    () => new Date(iso).toISOString().replace("T", " ").slice(0, 16) + " UTC",
  );

  return <time dateTime={iso}>{text}</time>;
}
