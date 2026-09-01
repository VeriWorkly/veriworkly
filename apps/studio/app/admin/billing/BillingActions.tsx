"use client";

import { useState } from "react";

import { Select } from "@veriworkly/ui";

import AdminActionDialog from "@/components/admin/AdminActionDialog";
import {
  adjustAdminCredits,
  grantAdminEntitlement,
  replayAdminWebhook,
  revokeAdminEntitlement,
  updateAdminSubscription,
} from "@/features/admin/services/admin-actions";

import type { SubscriptionStatus } from "@/features/admin/types/admin-types";

const inputClass =
  "border-border bg-background h-9 w-full rounded-lg border px-3 text-xs outline-none";

export const ENTITLEMENT_KEYS = [
  "portfolio_publish",
  "ai_credits",
  "custom_subdomain",
  "seo_controls",
  "analytics",
  "watermark_removal",
];

/**
 * Manual subscription override.
 *
 * The payment provider stays the source of truth — this exists for the case where a webhook
 * was lost and an account is stuck without the access it paid for. The next provider webhook
 * will overwrite whatever is set here, which is why the dialog says so out loud.
 */
export function SubscriptionActions({
  id,
  status,
  email,
  cancelAtPeriodEnd,
}: {
  id: string;
  status: SubscriptionStatus;
  email: string;
  cancelAtPeriodEnd: boolean;
}) {
  const [nextStatus, setNextStatus] = useState<SubscriptionStatus>(status);

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
        description={`Setting ${email}'s subscription to ${nextStatus}. The payment provider remains authoritative — the next webhook for this subscription will overwrite this value.`}
        confirmLabel="Apply override"
        onConfirm={async (reason) => {
          await updateAdminSubscription(id, { status: nextStatus, reason });
        }}
      />

      <AdminActionDialog
        trigger={cancelAtPeriodEnd ? "Resume" : "Cancel at period end"}
        title={cancelAtPeriodEnd ? "Clear the scheduled cancellation" : "Cancel at period end"}
        description={
          cancelAtPeriodEnd
            ? `${email}'s subscription will renew normally again.`
            : `${email} keeps access until the current period ends, then the subscription lapses.`
        }
        confirmLabel="Save"
        onConfirm={async (reason) => {
          await updateAdminSubscription(id, { cancelAtPeriodEnd: !cancelAtPeriodEnd, reason });
        }}
      />
    </div>
  );
}

/** Grant or claw back credits for one account, by user id. */
export function CreditAdjustmentForm() {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("100");

  const parsed = Number(amount);
  const ready = userId.trim().length > 0 && Number.isFinite(parsed) && parsed !== 0;

  return (
    <div className="space-y-3">
      <input
        className={inputClass}
        placeholder="User id"
        value={userId}
        onChange={(event) => setUserId(event.target.value)}
      />

      <input
        className={inputClass}
        type="number"
        placeholder="Credits (negative to claw back)"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
      />

      <AdminActionDialog
        trigger="Apply adjustment"
        triggerVariant="primary"
        disabled={!ready}
        title="Adjust a credit balance"
        description={`${parsed > 0 ? "Granting" : "Removing"} ${Math.abs(parsed)} credits.`}
        confirmLabel="Apply"
        onConfirm={async (reason) => {
          await adjustAdminCredits(userId.trim(), parsed, reason);
          setUserId("");
        }}
      />
    </div>
  );
}

/** Manual entitlement grant, optionally time-boxed. */
export function EntitlementGrantForm() {
  const [userId, setUserId] = useState("");
  const [key, setKey] = useState(ENTITLEMENT_KEYS[0]);
  const [endsAt, setEndsAt] = useState("");

  return (
    <div className="space-y-3">
      <input
        className={inputClass}
        placeholder="User id"
        value={userId}
        onChange={(event) => setUserId(event.target.value)}
      />

      <Select className="h-9 text-xs" value={key} onChange={(event) => setKey(event.target.value)}>
        {ENTITLEMENT_KEYS.map((entitlement) => (
          <option key={entitlement} value={entitlement}>
            {entitlement.replace(/_/g, " ")}
          </option>
        ))}
      </Select>

      <input
        className={inputClass}
        type="date"
        aria-label="Expiry date (optional)"
        value={endsAt}
        onChange={(event) => setEndsAt(event.target.value)}
      />

      <AdminActionDialog
        trigger="Grant entitlement"
        triggerVariant="primary"
        disabled={!userId.trim()}
        title="Grant an entitlement"
        description={`Granting "${key}"${endsAt ? ` until ${endsAt}` : " with no expiry"}.`}
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

export function EntitlementRevokeAction({
  id,
  entitlementKey,
  revoked,
}: {
  id: string;
  entitlementKey: string;
  revoked: boolean;
}) {
  if (revoked) return <span className="text-muted text-xs">Revoked</span>;

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
