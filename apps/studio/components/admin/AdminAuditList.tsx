import Link from "next/link";

import Panel from "@/components/admin/Panel";

import type { AdminAuditEntry } from "@/features/admin/types/admin-types";
import { formatDateTime, humanizeKey, truncate } from "@/features/admin/utils/admin-format";

/** The audit log filtered to one record: every admin action taken on it. */
export function adminAuditHref(targetType: string, targetId: string) {
  const search = new URLSearchParams({ targetType, targetId });
  return `/admin/audit?${search.toString()}`;
}

/** Admin pages a target type has, by id. Types without one (a commission, a key) link nowhere. */
const TARGET_PAGES: Record<string, (id: string) => string> = {
  User: (id) => `/admin/users/${encodeURIComponent(id)}`,
  PortfolioPublication: (id) => `/admin/portfolios/${encodeURIComponent(id)}`,
  Document: (id) => `/admin/documents?query=${encodeURIComponent(id)}`,
  AmbassadorApplication: (id) => `/admin/ambassadors/${encodeURIComponent(id)}`,
  RoadmapFeature: (id) => `/admin/roadmap/${encodeURIComponent(id)}/edit`,
  BillingWebhookEvent: (id) => `/admin/billing/webhooks/${encodeURIComponent(id)}`,
};

/**
 * Where an entry's target can be opened, or `null`. A target the server reports gone links
 * nowhere: its page would 404. A document in the trash (`targetDeleted` on a row that exists)
 * opens in the documents list with deleted ones shown. When the server says where the target
 * stands (V-272), that wins over the action's name: a restored document or an unpublished
 * portfolio still has its page. Without it, an entry that deleted or unpublished its target
 * links nowhere.
 */
export function adminAuditTargetHref(
  entry: Pick<
    AdminAuditEntry,
    "action" | "targetType" | "targetId" | "targetExists" | "targetDeleted"
  >,
) {
  if (!entry.targetId || entry.targetExists === false) return null;

  const known = entry.targetExists === true && entry.targetDeleted !== undefined;

  if (known && entry.targetDeleted) {
    return entry.targetType === "Document"
      ? `/admin/documents?query=${encodeURIComponent(entry.targetId)}&includeDeleted=true`
      : null;
  }
  if (!known && /\.(delete|unpublish)$/.test(entry.action)) return null;

  return TARGET_PAGES[entry.targetType]?.(entry.targetId) ?? null;
}

/** What became of an entry's target, for the audit row: gone, in the trash, or nothing to say. */
export function adminAuditTargetState(
  entry: Pick<AdminAuditEntry, "targetExists" | "targetDeleted">,
) {
  if (entry.targetExists === false) return "Deleted";
  if (entry.targetExists === true && entry.targetDeleted) return "In the trash";

  return null;
}

/** An entry's metadata as `key: value` pairs, for a row with no room for a JSON viewer. */
export function formatAuditMetadata(metadata: AdminAuditEntry["metadata"]) {
  if (!metadata) return "";

  return Object.entries(metadata)
    .map(([key, value]) => {
      const text = typeof value === "string" ? value : JSON.stringify(value);
      return `${key}: ${truncate(text, 60)}`;
    })
    .join(" · ");
}

/** The admin actions taken against one record, as shown on its detail page. */
export default function AdminAuditList({
  title,
  description,
  emptyMessage,
  entries,
}: {
  title: string;
  description?: string;
  emptyMessage: string;
  entries: AdminAuditEntry[];
}) {
  return (
    <Panel className="space-y-3 rounded-xl p-4">
      <div>
        <h3 className="text-foreground font-semibold tracking-tight">{title}</h3>
        {description ? <p className="text-muted mt-1 text-xs leading-5">{description}</p> : null}
      </div>

      {entries.length === 0 ? (
        <p className="text-muted text-sm">{emptyMessage}</p>
      ) : (
        <div className="divide-border/50 divide-y">
          {entries.map((entry) => {
            const metadata = formatAuditMetadata(entry.metadata);

            return (
              <div key={entry.id} className="space-y-0.5 py-2.5 text-sm">
                <p className="text-foreground font-medium">{humanizeKey(entry.action)}</p>
                <p className="text-muted text-xs">
                  {entry.actor?.email ?? "system"} · {formatDateTime(entry.createdAt)}
                  {entry.reason ? ` · ${entry.reason}` : ""}
                </p>
                {metadata ? <p className="text-muted font-mono text-xs">{metadata}</p> : null}
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

/** A small "History" link to a record's audit trail, for rows on a detail page. */
export function AdminAuditLink({ targetType, targetId }: { targetType: string; targetId: string }) {
  return (
    <Link
      href={adminAuditHref(targetType, targetId)}
      className="text-accent text-xs font-medium hover:underline"
    >
      History
    </Link>
  );
}
