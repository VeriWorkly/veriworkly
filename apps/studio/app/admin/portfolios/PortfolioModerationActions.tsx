"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Select } from "@veriworkly/ui";

import AdminActionDialog from "@/components/admin/AdminActionDialog";
import {
  unpublishAdminPortfolio,
  updateAdminPortfolioStatus,
} from "@/features/admin/services/admin-actions";

import type { PublicationStatus } from "@/features/admin/types/admin-types";

interface PortfolioModerationActionsProps {
  publicationId: string;
  subdomain: string;
  status: PublicationStatus;
  /** Hides the hard-takedown control on the compact list rows. */
  compact?: boolean;
}

/**
 * Suspending a portfolio removes it from the public internet immediately — the server clears
 * the Redis copy, the public list and the portfolio app's ISR cache in the same request.
 * Unpublishing goes further and frees the subdomain, so it is only offered on the detail page.
 */
const PortfolioModerationActions = ({
  publicationId,
  subdomain,
  status,
  compact = false,
}: PortfolioModerationActionsProps) => {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState<PublicationStatus>(status);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Select
        aria-label="Publication status"
        className="h-8 w-32 text-xs"
        value={nextStatus}
        onChange={(event) => setNextStatus(event.target.value as PublicationStatus)}
      >
        <option value="LIVE">Live</option>
        <option value="GRACE">Grace</option>
        <option value="SUSPENDED">Suspended</option>
      </Select>

      <AdminActionDialog
        trigger="Apply"
        disabled={nextStatus === status}
        title={nextStatus === "SUSPENDED" ? "Suspend this portfolio" : "Change publication status"}
        description={
          nextStatus === "SUSPENDED"
            ? `${subdomain} will stop serving publicly right away. The reason below is shown to the owner.`
            : `${subdomain} moves from ${status} to ${nextStatus}.`
        }
        confirmLabel={nextStatus === "SUSPENDED" ? "Suspend portfolio" : "Update status"}
        confirmVariant={nextStatus === "SUSPENDED" ? "secondary" : "primary"}
        minReasonLength={nextStatus === "SUSPENDED" ? 10 : 3}
        reasonPlaceholder={
          nextStatus === "SUSPENDED"
            ? "At least 10 characters — shown to the owner and recorded in the audit log."
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
          description={`Deletes the publication for ${subdomain}, forces the source document private, and frees the subdomain for reuse. The owner cannot publish it again, and this console cannot lift that yet.`}
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
