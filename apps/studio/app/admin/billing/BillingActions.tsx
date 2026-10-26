"use client";

import { useState } from "react";
import Link from "next/link";

import { Select } from "@veriworkly/ui";

import AdminActionDialog from "@/components/admin/AdminActionDialog";
import { ADMIN_INPUT_CLASS } from "@/components/admin/admin-input-class";
import {
  ADMIN_ENTITLEMENT_KEYS,
  adjustAdminCredits,
  grantAdminEntitlement,
  replayAdminWebhook,
  revokeAdminEntitlement,
  updateAdminSubscription,
  type AdminEntitlementKey,
} from "@/features/admin/services/admin-actions";
import { useAdminAccount, type AdminAccountLookup } from "@/features/admin/utils/use-admin-account";

import type { SubscriptionStatus } from "@/features/admin/types/admin-types";

import { parseCreditAmount } from "./credit-amount";

/**
 * Support's controls for one subscription (`adminBillingService.updateSubscription`).
 *
 * Both reach real billing. Cancel at period end is made at Dodo first and the row takes Dodo's
 * answer. A status change moves the plan's access with it, and ending a subscription here is
 * refused unless Dodo already reports it ended. The dialogs say so, because support reading a
 * "label" would believe nothing happens to the customer's card or access.
 */
export function SubscriptionActions({
  id,
  status,
  email,
  cancelAtPeriodEnd,
  deleted,
}: {
  id: string;
  status: SubscriptionStatus;
  email: string;
  cancelAtPeriodEnd: boolean;
  /** Kept as a billing record after the account was deleted; the server refuses every edit. */
  deleted: boolean;
}) {
  const [nextStatus, setNextStatus] = useState<SubscriptionStatus>(status);

  if (deleted) return <span className="text-muted text-xs">Read-only</span>;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Select
        aria-label="Subscription status"
        className="h-8 w-32 text-xs"
        value={nextStatus}
        onChange={(event) => setNextStatus(event.target.value as SubscriptionStatus)}
      >
        <option value="ACTIVE">Active</option>
        <option value="PAST_DUE">Past due</option>
        <option value="CANCELED">Canceled</option>
        <option value="INACTIVE">Inactive</option>
      </Select>

      <AdminActionDialog
        trigger="Apply"
        disabled={nextStatus === status}
        title="Override subscription status"
        description={
          <>
            Sets {email}&apos;s subscription to {nextStatus} and moves access with it, as a webhook
            would: Active grants the plan&apos;s features to the period end; the other statuses
            withdraw them (a cancelled plan keeps its paid time). Canceled or Inactive is refused
            unless Dodo already reports the subscription ended: to stop the renewal, use Cancel at
            period end. Dodo&apos;s next webhook can change the status again. Manual grants live on{" "}
            <Link href="/admin/billing/entitlements" className="text-accent underline">
              Entitlements
            </Link>
            .
          </>
        }
        confirmLabel="Change status"
        onConfirm={async (reason) => {
          await updateAdminSubscription(id, { status: nextStatus, reason });
        }}
      />

      <AdminActionDialog
        trigger={cancelAtPeriodEnd ? "Resume renewal" : "Cancel at period end"}
        title={
          cancelAtPeriodEnd
            ? "Resume this subscription's renewal at Dodo"
            : "Cancel this subscription's renewal at Dodo"
        }
        description={
          cancelAtPeriodEnd
            ? `Dodo renews ${email}'s subscription again: the card is charged again at renewal. If Dodo does not confirm, nothing changes and the error says why.`
            : `Dodo stops renewing ${email}'s subscription: the card is not charged again, and access ends at the end of the paid period. If Dodo does not confirm, nothing changes and the error says why.`
        }
        confirmLabel={cancelAtPeriodEnd ? "Resume renewal" : "Cancel renewal"}
        onConfirm={async (reason) => {
          await updateAdminSubscription(id, { cancelAtPeriodEnd: !cancelAtPeriodEnd, reason });
        }}
      />
    </div>
  );
}

/** Who a pasted user id belongs to, under the field, so a typo never reaches a stranger. */
function AccountHint({ lookup }: { lookup: AdminAccountLookup }) {
  if (lookup.state === "empty") return null;

  return (
    <p
      role={lookup.state === "missing" || lookup.state === "error" ? "alert" : undefined}
      className={
        lookup.state === "found" ? "text-muted text-xs" : "text-destructive text-xs font-medium"
      }
    >
      {lookup.state === "loading"
        ? "Looking up the account…"
        : lookup.state === "found"
          ? `Account: ${lookup.email}`
          : lookup.state === "missing"
            ? "No account has this id."
            : lookup.message}
    </p>
  );
}

/** Grant or claw back credits for one account, by user id. */
export function CreditAdjustmentForm() {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("100");
  const account = useAdminAccount(userId);

  const parsed = parseCreditAmount(amount);
  const ready = account.state === "found" && parsed.ok;

  return (
    <div className="space-y-3">
      <input
        className={ADMIN_INPUT_CLASS}
        aria-label="User id"
        placeholder="User id"
        value={userId}
        onChange={(event) => setUserId(event.target.value)}
      />
      <AccountHint lookup={account} />

      <input
        className={ADMIN_INPUT_CLASS}
        type="number"
        step={1}
        aria-label="Credits (negative to claw back)"
        placeholder="Credits (negative to claw back)"
        aria-invalid={!parsed.ok}
        aria-describedby={parsed.ok ? undefined : "credit-adjustment-error"}
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
      />

      {!parsed.ok && (
        <p id="credit-adjustment-error" role="alert" className="text-xs text-red-600">
          {parsed.message}
        </p>
      )}

      <AdminActionDialog
        trigger="Apply adjustment"
        triggerVariant="primary"
        disabled={!ready}
        title="Adjust a credit balance"
        description={
          parsed.ok && account.state === "found"
            ? `${parsed.amount > 0 ? "Granting" : "Removing"} ${Math.abs(parsed.amount)} credits ${parsed.amount > 0 ? "to" : "from"} ${account.email}.`
            : parsed.ok
              ? "Enter the id of an existing account."
              : parsed.message
        }
        confirmLabel="Apply"
        onConfirm={async (reason, attemptKey) => {
          if (!parsed.ok) throw new Error(parsed.message);
          await adjustAdminCredits(userId.trim(), parsed.amount, reason, attemptKey);
          setUserId("");
        }}
      />
    </div>
  );
}

/** Manual entitlement grant, optionally time-boxed. */
export function EntitlementGrantForm() {
  const [userId, setUserId] = useState("");
  const [key, setKey] = useState<AdminEntitlementKey>(ADMIN_ENTITLEMENT_KEYS[0]);
  const [endsAt, setEndsAt] = useState("");
  const account = useAdminAccount(userId);

  return (
    <div className="space-y-3">
      <input
        className={ADMIN_INPUT_CLASS}
        aria-label="User id"
        placeholder="User id"
        value={userId}
        onChange={(event) => setUserId(event.target.value)}
      />
      <AccountHint lookup={account} />

      <Select
        aria-label="Entitlement"
        className="h-9 text-xs"
        value={key}
        onChange={(event) => setKey(event.target.value as AdminEntitlementKey)}
      >
        {ADMIN_ENTITLEMENT_KEYS.map((entitlement) => (
          <option key={entitlement} value={entitlement}>
            {entitlement.replace(/_/g, " ")}
          </option>
        ))}
      </Select>

      <input
        className={ADMIN_INPUT_CLASS}
        type="date"
        aria-label="Expiry date (optional)"
        value={endsAt}
        onChange={(event) => setEndsAt(event.target.value)}
      />

      <AdminActionDialog
        trigger="Grant entitlement"
        triggerVariant="primary"
        disabled={account.state !== "found"}
        title="Grant an entitlement"
        description={`Granting "${key}" to ${account.state === "found" ? account.email : "this account"}${endsAt ? ` until ${endsAt}` : " with no expiry"}.`}
        confirmLabel="Grant"
        onConfirm={async (reason) => {
          await grantAdminEntitlement({
            userId: userId.trim(),
            key,
            endsAt: endsAt ? new Date(`${endsAt}T23:59:59.000Z`).toISOString() : null,
            reason,
          });

          setUserId("");
          setEndsAt("");
        }}
      />
    </div>
  );
}

/**
 * Only a live manual or promotional grant can be revoked. A subscription's grants follow the
 * subscription (the server refuses with 409, as the next billing event would restore them), an
 * expired grant gives nothing to take away, and a deleted account's grants are read-only records.
 */
export function EntitlementRevokeAction({
  id,
  entitlementKey,
  revoked,
  source,
  expired,
  deleted = false,
}: {
  id: string;
  entitlementKey: string;
  revoked: boolean;
  source: string;
  /** Decided by the server render, which has a clock; this client component must not read one. */
  expired: boolean;
  deleted?: boolean;
}) {
  if (revoked) return <span className="text-muted text-xs">Revoked</span>;
  if (deleted) return <span className="text-muted text-xs">Read-only</span>;
  if (source === "SUBSCRIPTION") {
    return <span className="text-muted text-xs">Follows the subscription</span>;
  }
  if (expired) return <span className="text-muted text-xs">Expired</span>;

  return (
    <AdminActionDialog
      trigger="Revoke"
      triggerClassName="text-destructive"
      title="Revoke this entitlement"
      description={`Access to "${entitlementKey}" is removed immediately. Any feature gated on it stops working for this account.`}
      confirmLabel="Revoke"
      onConfirm={async (reason) => {
        await revokeAdminEntitlement(id, reason);
      }}
    />
  );
}

/**
 * Replays a stored provider event through the normal webhook pipeline. Already-processed
 * events are rejected server-side, so the control is only offered where a replay can help.
 */
export function WebhookReplayAction({ id, status }: { id: string; status: string }) {
  if (status === "PROCESSED") return <span className="text-muted text-xs">Done</span>;

  return (
    <AdminActionDialog
      trigger="Replay"
      title="Replay this webhook event"
      description="The stored provider payload is re-run through the same pipeline as a live delivery. Use this for an event that failed on a transient error."
      confirmLabel="Replay event"
      onConfirm={async (reason) => {
        await replayAdminWebhook(id, reason);
      }}
    />
  );
}
