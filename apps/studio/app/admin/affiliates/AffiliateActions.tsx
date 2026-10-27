"use client";

import { useState } from "react";

import { Select } from "@veriworkly/ui";

import AdminActionDialog from "@/components/admin/AdminActionDialog";
import { ADMIN_INPUT_CLASS } from "@/components/admin/admin-input-class";
import {
  createAdminCommission,
  updateAdminAffiliate,
  updateAdminCommission,
  updateAdminWithdrawal,
} from "@/features/admin/services/admin-actions";
import { formatCents } from "@/features/admin/utils/admin-format";
import { useServerDraft } from "@/features/admin/utils/use-server-draft";
import { ApiRequestError } from "@/utils/fetchApiData";

import type { AffiliateStatus, AffiliateTier } from "@/features/admin/types/admin-types";

/** Standing (status) and commission tier for a single affiliate. */
export function AffiliateStandingActions({
  userId,
  status,
  tier,
  email,
}: {
  userId: string;
  status: AffiliateStatus;
  tier: AffiliateTier;
  email: string;
}) {
  const [nextStatus, setNextStatus] = useServerDraft(status);
  const [nextTier, setNextTier] = useServerDraft(tier);

  const dirty = nextStatus !== status || nextTier !== tier;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label="Affiliate status"
        className="h-8 w-32 text-xs"
        value={nextStatus}
        onChange={(event) => setNextStatus(event.target.value as AffiliateStatus)}
      >
        <option value="ACTIVE">Active</option>
        <option value="PENDING">Pending</option>
        <option value="SUSPENDED">Suspended</option>
      </Select>

      <Select
        aria-label="Affiliate tier"
        className="h-8 w-28 text-xs"
        value={nextTier}
        onChange={(event) => setNextTier(event.target.value as AffiliateTier)}
      >
        <option value="TIER_1">Tier 1</option>
        <option value="TIER_2">Tier 2</option>
        <option value="TIER_3">Tier 3</option>
      </Select>

      <AdminActionDialog
        trigger="Save"
        disabled={!dirty}
        title="Update affiliate standing"
        description={`${email} → status ${nextStatus}, tier ${nextTier}. Suspending stops new commissions accruing.`}
        confirmLabel="Save changes"
        reasonRequired={false}
        onConfirm={async (reason) => {
          await updateAdminAffiliate(userId, {
            ...(nextStatus !== status
              ? { status: nextStatus as "PENDING" | "ACTIVE" | "SUSPENDED" }
              : {}),
            ...(nextTier !== tier ? { tier: nextTier } : {}),
            reason: reason || undefined,
          });
        }}
      />
    </div>
  );
}

/** A US-dollar amount as typed: positive, at most two decimals. */
function parseUsdCents(value: string) {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;

  const cents = Math.round(Number(trimmed) * 100);
  return cents > 0 ? cents : null;
}

/**
 * The request that converts a pending non-USD commission (`createCommission` with
 * `convertedFromId`): the purchase is recorded again in USD, and the server marks the original
 * REVERSED in the same transaction. The payment reference must be new (it is unique), so it
 * defaults to the original's with a `:usd` suffix.
 */
export function commissionConversion(input: {
  commissionId: string;
  referredUserId: string;
  providerPaymentId: string | null;
  /** The original's subscription, so the USD commission stays tied to the same payment. */
  subscriptionId: string | null;
  purchaseUsd: string;
  reference: string;
}) {
  const purchaseAmountCents = parseUsdCents(input.purchaseUsd);

  if (purchaseAmountCents === null) {
    return { ok: false as const, message: "Enter the purchase amount in US dollars, e.g. 12.50." };
  }

  return {
    ok: true as const,
    payload: {
      referredUserId: input.referredUserId,
      providerPaymentId:
        input.reference.trim() || `${input.providerPaymentId ?? input.commissionId}:usd`,
      purchaseAmountCents,
      currency: "USD",
      convertedFromId: input.commissionId,
      ...(input.subscriptionId ? { subscriptionId: input.subscriptionId } : {}),
      status: "PENDING" as const,
    },
  };
}

/**
 * The server's answers to a conversion, in words: a reference already used is a unique-index
 * clash (409 "Resource already exists"), and a referral that is no longer active is a 404.
 */
function describeConversionError(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.status === 409 && /already exists/i.test(error.message)) {
      return "That reference is already used. Enter a different payment reference.";
    }
    if (error.status === 404) {
      return "The affiliate or the referral is no longer active, so this commission cannot be converted.";
    }
  }

  return error instanceof Error ? error.message : "The conversion failed. Please try again.";
}

/** Records a non-USD commission in USD so it can be released. */
function CommissionConvertAction({
  id,
  amount,
  currency,
  rateBps,
  referredUserId,
  providerPaymentId,
  subscriptionId,
}: {
  id: string;
  amount: string;
  currency: string;
  rateBps: number;
  referredUserId: string;
  providerPaymentId: string | null;
  subscriptionId: string | null;
}) {
  const [purchaseUsd, setPurchaseUsd] = useState("");
  const [reference, setReference] = useState("");

  const conversion = commissionConversion({
    commissionId: id,
    referredUserId,
    providerPaymentId,
    subscriptionId,
    purchaseUsd,
    reference,
  });

  return (
    <AdminActionDialog
      trigger="Convert to USD"
      title="Record this commission in USD"
      description={`The ${amount} commission is replaced by one in USD: enter what the customer's ${currency} purchase came to in US dollars. The USD commission uses the affiliate's current tier rate, which may differ from the ${(rateBps / 100).toFixed(1)}% this one used. It starts pending; the ${currency} one is closed in the same step.`}
      confirmLabel="Convert"
      reasonRequired={false}
      onConfirm={async (reason) => {
        if (!conversion.ok) throw new Error(conversion.message);

        try {
          await createAdminCommission({ ...conversion.payload, reason: reason || undefined });
        } catch (error) {
          throw new Error(describeConversionError(error));
        }
      }}
    >
      <div className="space-y-2">
        <input
          className={ADMIN_INPUT_CLASS}
          inputMode="decimal"
          aria-label="Purchase amount in USD"
          placeholder="Purchase amount in USD"
          value={purchaseUsd}
          onChange={(event) => setPurchaseUsd(event.target.value)}
        />

        <input
          className={ADMIN_INPUT_CLASS}
          aria-label="Payment reference (optional)"
          placeholder={`Payment reference (default ${providerPaymentId ?? id}:usd)`}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
        />

        {purchaseUsd && !conversion.ok ? (
          <p role="alert" className="text-destructive text-xs">
            {conversion.message}
          </p>
        ) : null}
      </div>
    </AdminActionDialog>
  );
}

/**
 * Release or reverse a pending commission. Non-pending rows are terminal server-side. The
 * wallet is a USD balance, so a commission in another currency cannot be released: the server
 * keeps it PENDING until it is converted and recorded in USD.
 */
export function CommissionActions({
  id,
  status,
  amountCents,
  currency,
  referredUserId,
  providerPaymentId,
  subscriptionId,
  rateBps,
  affiliateActive,
}: {
  id: string;
  status: string;
  amountCents: number;
  currency: string;
  rateBps: number;
  /** `null` once the referred account is gone: there is no referral left to record against. */
  referredUserId: string | null;
  providerPaymentId: string | null;
  subscriptionId: string | null;
  /** The server converts only for an ACTIVE affiliate; `false` also when that is unknown. */
  affiliateActive: boolean;
}) {
  // The server moves only PENDING commissions; a released one cannot be taken back here.
  if (status === "AVAILABLE") {
    return (
      <span className="text-muted max-w-48 text-xs">
        Released. A refund after release cannot be reversed from the console yet.
      </span>
    );
  }
  if (status !== "PENDING") return <span className="text-muted text-xs">No action</span>;

  const amount = formatCents(amountCents, currency);

  return (
    <div className="flex flex-wrap gap-2">
      {currency === "USD" ? (
        <AdminActionDialog
          trigger="Release"
          triggerVariant="primary"
          title="Release this commission"
          description={`${amount} moves from the affiliate's pending balance to available, making it withdrawable.`}
          confirmLabel="Release commission"
          reasonRequired={false}
          onConfirm={async (reason) => {
            await updateAdminCommission(id, "AVAILABLE", reason || undefined);
          }}
        />
      ) : !referredUserId ? (
        <span className="text-muted max-w-48 text-xs">
          In {currency}, and the referred account is gone: it cannot be converted.
        </span>
      ) : !affiliateActive ? (
        <span className="text-muted max-w-48 text-xs">
          In {currency}. The affiliate is not active, so it cannot be converted to USD.
        </span>
      ) : (
        <CommissionConvertAction
          id={id}
          amount={amount}
          currency={currency}
          rateBps={rateBps}
          referredUserId={referredUserId}
          providerPaymentId={providerPaymentId}
          subscriptionId={subscriptionId}
        />
      )}

      <AdminActionDialog
        trigger="Reverse"
        title="Reverse this commission"
        description={`${amount} is removed from the affiliate's pending balance. Use this when the underlying payment was refunded or fraudulent.`}
        confirmLabel="Reverse commission"
        onConfirm={async (reason) => {
          await updateAdminCommission(id, "REVERSED", reason);
        }}
      />
    </div>
  );
}

/**
 * Withdrawal decisions.
 *
 * Payouts leave the platform out of band (the payment provider has no third-party transfer
 * API), so "Mark paid" records a transfer a human already made — it does not move money.
 */
export function WithdrawalActions({
  id,
  status,
  amountCents,
  currency,
  email,
}: {
  id: string;
  status: string;
  amountCents: number;
  currency: string;
  email: string;
}) {
  const amount = formatCents(amountCents, currency);

  // The server takes a rejection from REQUESTED or APPROVED, and returns the amount either way.
  const reject = (
    <AdminActionDialog
      trigger="Reject"
      title="Reject this withdrawal"
      description={`${amount} is returned to ${email}'s available balance.${status === "APPROVED" ? " Only reject an approved payout that was never sent." : ""}`}
      confirmLabel="Reject"
      reasonLabel="Payout note"
      onConfirm={async (reason) => {
        await updateAdminWithdrawal(id, "REJECTED", reason);
      }}
    />
  );

  if (status === "REQUESTED") {
    return (
      <div className="flex flex-wrap gap-2">
        <AdminActionDialog
          trigger="Approve"
          triggerVariant="primary"
          title="Approve this withdrawal"
          description={`Approving ${amount} for ${email}. The funds stay reserved until you mark the payout as paid.`}
          confirmLabel="Approve"
          reasonLabel="Payout note"
          reasonRequired={false}
          onConfirm={async (reason) => {
            await updateAdminWithdrawal(id, "APPROVED", reason || undefined);
          }}
        />

        {reject}
      </div>
    );
  }

  if (status === "APPROVED") {
    return (
      <div className="flex flex-wrap gap-2">
        <AdminActionDialog
          trigger="Mark paid"
          triggerVariant="primary"
          title="Record this payout as paid"
          description={`Confirm that ${amount} has actually been sent to ${email}. This records the transfer; it does not send money.`}
          confirmLabel="Mark as paid"
          reasonLabel="Payout reference"
          reasonPlaceholder="Bank reference, PayPal transaction id, etc."
          onConfirm={async (reason) => {
            await updateAdminWithdrawal(id, "PAID", reason);
          }}
        />
        {reject}
      </div>
    );
  }

  return <span className="text-muted text-xs">Finalized</span>;
}

/** Manual commission entry for a payment that never produced a webhook. */
export function CommissionCreateForm() {
  const [referredUserId, setReferredUserId] = useState("");
  const [providerPaymentId, setProviderPaymentId] = useState("");
  const [amountUsd, setAmountUsd] = useState("");

  const purchaseAmountCents = Math.round(Number(amountUsd || 0) * 100);
  const ready = referredUserId.trim() && providerPaymentId.trim() && purchaseAmountCents > 0;

  return (
    <div className="space-y-3">
      <input
        className={ADMIN_INPUT_CLASS}
        aria-label="Referred user id"
        placeholder="Referred user id"
        value={referredUserId}
        onChange={(event) => setReferredUserId(event.target.value)}
      />

      <input
        className={ADMIN_INPUT_CLASS}
        aria-label="Provider payment id"
        placeholder="Provider payment id"
        value={providerPaymentId}
        onChange={(event) => setProviderPaymentId(event.target.value)}
      />

      <input
        className={ADMIN_INPUT_CLASS}
        type="number"
        min="0"
        step="0.01"
        aria-label="Purchase amount (USD)"
        placeholder="Purchase amount (USD)"
        value={amountUsd}
        onChange={(event) => setAmountUsd(event.target.value)}
      />

      <p className="text-muted text-xs">
        The commission itself is derived from the affiliate&apos;s tier rate — enter the
        customer&apos;s purchase amount, not the payout.
      </p>

      <AdminActionDialog
        trigger="Create commission"
        triggerVariant="primary"
        disabled={!ready}
        title="Create a manual commission"
        description={`Recording a ${formatCents(purchaseAmountCents)} purchase against the referring affiliate. The commission amount is calculated from their tier.`}
        confirmLabel="Create commission"
        reasonRequired={false}
        onConfirm={async (reason) => {
          await createAdminCommission({
            referredUserId: referredUserId.trim(),
            providerPaymentId: providerPaymentId.trim(),
            purchaseAmountCents,
            status: "AVAILABLE",
            reason: reason || undefined,
          });

          setReferredUserId("");
          setProviderPaymentId("");
          setAmountUsd("");
        }}
      />
    </div>
  );
}
