"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Select } from "@veriworkly/ui";

import AdminActionDialog from "@/components/admin/AdminActionDialog";
import {
  unpublishAdminPortfolio,
  updateAdminPortfolioStatus,
} from "@/features/admin/services/admin-actions";

import type { AdminPortfolioRow, PublicationStatus } from "@/features/admin/types/admin-types";
import { useServerDraft } from "@/features/admin/utils/use-server-draft";

/**
 * The server's `PREMIUM_PORTFOLIO_TEMPLATE_IDS`. GRACE is the courtesy window after a premium
 * plan lapses; the server refuses it for a free template (Signal, Atelier), which has nothing
 * to lapse.
 */
const PREMIUM_PORTFOLIO_TEMPLATES = new Set(["nimbus", "cipher"]);

/** The server's `USER_UNPUBLISHED_REASON` and `BILLING_SUSPENSION_REASONS`. */
const OWNER_UNPUBLISHED_REASON = "user_unpublished";
const BILLING_SUSPENSION_REASONS = new Set([
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
  "INACTIVE",
  "grace_expired",
]);

/**
 * What a lift actually did, when it is not what was asked (V-285). A takedown over the owner's
 * own unpublish or a billing suspension lifts back to that state: the server answers 200 with
 * `status: "SUSPENDED"` and the restored reason, and the site stays offline.
 */
export function liftOutcomeNotice(
  requested: PublicationStatus,
  result: Pick<AdminPortfolioRow, "status" | "suspensionReason">,
) {
  if (requested === "SUSPENDED" || result.status !== "SUSPENDED") return null;

  if (result.suspensionReason === OWNER_UNPUBLISHED_REASON) {
    return "Takedown lifted, but the owner had unpublished this portfolio before it, so it stays offline until they publish it again.";
  }
  if (result.suspensionReason && BILLING_SUSPENSION_REASONS.has(result.suspensionReason)) {
    return "Takedown lifted, but billing had suspended this portfolio before it, so it stays offline for now. It moves to the free tier and comes back online on its own within the hour.";
  }

  return "Takedown lifted, but the portfolio is still suspended for the reason it had before the takedown.";
}

interface PortfolioModerationActionsProps {
  publicationId: string;
  subdomain: string;
  status: PublicationStatus;
  templateId: string;
  /** Hides the hard-takedown control on the compact list rows. */
  compact?: boolean;
}

/**
 * Suspending a portfolio removes it from the public internet immediately — the server clears
 * the Redis copy, the public list and the portfolio app's ISR cache in the same request.
 * Unpublishing goes further: it also forces the source document private under the moderator's
 * lock, so it is only offered on the detail page. The row and the subdomain stay the owner's.
 */
const PortfolioModerationActions = ({
  publicationId,
  subdomain,
  status,
  templateId,
  compact = false,
}: PortfolioModerationActionsProps) => {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useServerDraft<PublicationStatus>(status);
  const [notice, setNotice] = useState<string | null>(null);
  // A notice is about the lift that produced it: once the row's status moves on, it is stale.
  const [noticeStatus, setNoticeStatus] = useState(status);
  if (noticeStatus !== status) {
    setNoticeStatus(status);
    setNotice(null);
  }
  const offersGrace = PREMIUM_PORTFOLIO_TEMPLATES.has(templateId) || status === "GRACE";
  const lifting = status === "SUSPENDED" && nextStatus !== "SUSPENDED";

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Select
        aria-label="Publication status"
        className="h-8 w-32 text-xs"
        value={nextStatus}
        onChange={(event) => setNextStatus(event.target.value as PublicationStatus)}
      >
        <option value="LIVE">Live</option>
        {offersGrace ? <option value="GRACE">Grace</option> : null}
        <option value="SUSPENDED">Suspended</option>
      </Select>

      <AdminActionDialog
        trigger="Apply"
        disabled={nextStatus === status}
        title={nextStatus === "SUSPENDED" ? "Suspend this portfolio" : "Change publication status"}
        description={
          nextStatus === "SUSPENDED"
            ? `${subdomain} will stop serving publicly right away. The owner sees that it was suspended, not the reason.`
            : lifting
              ? `Lifts the takedown on ${subdomain}. Only a moderator's takedown can be lifted here. If the owner had unpublished it, or billing had suspended it, before the takedown, it goes back to that and stays offline; a suspension that is not a takedown is refused.`
              : `${subdomain} moves from ${status} to ${nextStatus}.`
        }
        confirmLabel={nextStatus === "SUSPENDED" ? "Suspend portfolio" : "Update status"}
        confirmVariant={nextStatus === "SUSPENDED" ? "secondary" : "primary"}
        minReasonLength={nextStatus === "SUSPENDED" ? 10 : 3}
        reasonPlaceholder={
          nextStatus === "SUSPENDED"
            ? "At least 10 characters — recorded in the admin audit log, not shown to the owner."
            : "Recorded in the admin audit log."
        }
        onConfirm={async (reason) => {
          setNotice(null);
          const result = await updateAdminPortfolioStatus(publicationId, nextStatus, reason);
          setNotice(liftOutcomeNotice(nextStatus, result));
        }}
      />

      {compact ? null : (
        <AdminActionDialog
          trigger="Unpublish"
          triggerClassName="text-destructive"
          title="Take this portfolio down permanently"
          description={`Takes ${subdomain} offline and forces the source document private. The publication, its view history and the subdomain stay the owner's. The owner cannot publish it again until a moderator lifts the takedown on its document (Documents, Lift takedown).`}
          confirmLabel="Unpublish"
          confirmPhrase={subdomain}
          confirmPhraseLabel={`Type ${subdomain} to confirm`}
          onConfirm={async (reason, _attemptKey, confirmation) => {
            await unpublishAdminPortfolio(publicationId, reason, confirmation);
            router.push("/admin/portfolios");
          }}
        />
      )}

      {notice ? (
        <p role="status" className="text-warning w-full text-right text-xs">
          {notice}
        </p>
      ) : null}
    </div>
  );
};

export default PortfolioModerationActions;
