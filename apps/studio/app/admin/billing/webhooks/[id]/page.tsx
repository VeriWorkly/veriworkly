import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminAuditLink } from "@/components/admin/AdminAuditList";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminUserLink from "@/components/admin/AdminUserLink";
import Panel from "@/components/admin/Panel";
import { WebhookReplayAction } from "@/app/admin/billing/BillingActions";

import { fetchAdminWebhookDetail, loadAdminDetail } from "@/features/admin/services/admin-server";
import { formatDateTime } from "@/features/admin/utils/admin-format";

export const metadata: Metadata = {
  title: "Admin · Webhook event",
  robots: { index: false, follow: false },
};

/** One provider event: what Dodo sent, what happened to it, and a replay where one can help. */
export default async function AdminWebhookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const event = await loadAdminDetail(fetchAdminWebhookDetail(id));
  if (!event) notFound();

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Webhook event"
        title={event.type}
        description={`Provider event ${event.providerEventId} · received ${formatDateTime(event.createdAt)}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <AdminStatusBadge status={event.status} />
            <WebhookReplayAction id={event.id} status={event.status} />
            <Link href="/admin/billing/webhooks" className="text-accent text-sm font-semibold">
              ← Webhooks
            </Link>
          </div>
        }
      />

      <div className="grid gap-3 lg:grid-cols-[1fr_20rem]">
        <Panel className="min-w-0 space-y-3 rounded-xl p-4">
          <h3 className="text-foreground font-semibold tracking-tight">Payload</h3>

          <pre className="border-border bg-background text-foreground max-h-[32rem] overflow-auto rounded-lg border p-3 font-mono text-xs leading-relaxed">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        </Panel>

        <Panel className="h-fit space-y-3 rounded-xl p-4">
          <h3 className="text-foreground font-semibold tracking-tight">Delivery</h3>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Account</dt>
              <dd className="min-w-0 text-right">
                <AdminUserLink user={event.user} emptyLabel="Deleted or unmatched account" />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Retries</dt>
              <dd className="text-foreground">{event.retryCount}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Last attempt</dt>
              <dd className="text-foreground">{formatDateTime(event.lastAttemptAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Processed</dt>
              <dd className="text-foreground">{formatDateTime(event.processedAt)}</dd>
            </div>
          </dl>

          {event.error ? (
            <p className="border-destructive/25 bg-destructive/5 text-destructive rounded-lg border px-3 py-2 text-xs break-words">
              {event.error}
            </p>
          ) : null}

          <AdminAuditLink targetType="BillingWebhookEvent" targetId={event.id} />
        </Panel>
      </div>
    </div>
  );
}
