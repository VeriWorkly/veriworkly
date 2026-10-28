"use client";

import { useRouter } from "next/navigation";

import { Select } from "@veriworkly/ui";

import AdminActionDialog from "@/components/admin/AdminActionDialog";
import {
  unpublishAdminPortfolio,
  updateAdminPortfolioStatus,
} from "@/features/admin/services/admin-actions";

import type { PublicationStatus } from "@/features/admin/types/admin-types";
import { useServerDraft } from "@/features/admin/utils/use-server-draft";

/**
 * The server's `PREMIUM_PORTFOLIO_TEMPLATE_IDS`. GRACE is the courtesy window after a premium
 * plan lapses; the server refuses it for a free template (Signal, Atelier), which has nothing
 * to lapse.
 */
const PREMIUM_PORTFOLIO_TEMPLATES = new Set(["nimbus", "cipher"]);

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
  const offersGrace = PREMIUM_PORTFOLIO_TEMPLATES.has(templateId) || status === "GRACE";

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
          await updateAdminPortfolioStatus(publicationId, nextStatus, reason);
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
          onConfirm={async (reason) => {
            await unpublishAdminPortfolio(publicationId, reason);
            router.push("/admin/portfolios");
          }}
        />
      )}
    </div>
  );
};

export default PortfolioModerationActions;
