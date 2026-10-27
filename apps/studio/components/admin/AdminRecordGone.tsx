import Link from "next/link";

import Panel from "@/components/admin/Panel";
import { adminAuditHref } from "@/components/admin/AdminAuditList";

/**
 * A detail page whose record the API no longer has (a deleted account, an unpublished
 * portfolio, a deleted roadmap item). Audit entries written before the deletion still link here,
 * so the page says what happened and offers the record's history instead of a bare 404.
 */
export default function AdminRecordGone({
  noun,
  targetType,
  targetId,
  backHref,
  backLabel,
}: {
  noun: string;
  targetType: string;
  targetId: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <Panel className="mx-auto mt-10 max-w-lg space-y-3 rounded-xl p-6 text-center">
      <h1 className="text-foreground text-base font-semibold">This record no longer exists</h1>

      <p className="text-muted text-sm leading-6">
        No {noun} has the id <span className="font-mono text-xs break-all">{targetId}</span>. It may
        have been deleted; what admins did to it is still in the audit log.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
        <Link
          href={adminAuditHref(targetType, targetId)}
          className="text-accent font-semibold hover:underline"
        >
          View its audit history
        </Link>
        <Link href={backHref} className="text-muted hover:text-foreground">
          {backLabel}
        </Link>
      </div>
    </Panel>
  );
}
