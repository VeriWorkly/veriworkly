"use client";

import { useState } from "react";

import { Select } from "@veriworkly/ui";

import AdminActionDialog from "@/components/admin/AdminActionDialog";
import AdminShell from "@/components/admin/shell/AdminShell";
import AdminActionButtons from "@/app/admin/components/AdminActionButtons";
import { CommissionActions } from "@/app/admin/affiliates/AffiliateActions";
import { useServerDraft } from "@/features/admin/utils/use-server-draft";

const UNKNOWN_QUEUE = {
  pendingAmbassadorApplications: null,
  pendingWithdrawals: null,
  pendingCommissions: null,
  failedWebhooks: null,
  suspendedPortfolios: null,
  pendingPortfolioAssets: null,
};

/** A select staged from a "server" value, as the admin action components stage theirs. */
function DraftProbe({ server }: { server: string }) {
  const [value, setValue] = useServerDraft(server);

  return (
    <Select
      aria-label="Draft probe"
      value={value}
      onChange={(event) => setValue(event.target.value)}
    >
      <option value="ACTIVE">Active</option>
      <option value="PAST_DUE">Past due</option>
      <option value="CANCELED">Canceled</option>
    </Select>
  );
}

/** The admin chrome around the controls the browser test exercises. */
export function AdminShellHarness() {
  const [attemptKey, setAttemptKey] = useState("");
  // Stands in for the server prop a `router.refresh()` replaces.
  const [server, setServer] = useState("ACTIVE");

  return (
    <AdminShell adminEmail="ops@example.com" queue={UNKNOWN_QUEUE}>
      <div className="space-y-4">
        <AdminActionButtons />

        <AdminActionDialog
          trigger="Harness action"
          title="Harness action"
          confirmLabel="Run harness action"
          onConfirm={async (_reason, key) => {
            setAttemptKey(key);
          }}
        />

        <p data-testid="attempt-key">{attemptKey}</p>

        <CommissionActions
          id="c-eur"
          status="PENDING"
          amountCents={900}
          currency="EUR"
          rateBps={2000}
          referredUserId="u-referred"
          providerPaymentId="pay_eur"
          subscriptionId="sub_eur"
          affiliateActive
        />

        <DraftProbe server={server} />
        <button type="button" onClick={() => setServer("PAST_DUE")}>
          Server moves to past due
        </button>
      </div>
    </AdminShell>
  );
}
