"use client";

import { useEffect, useId, useState } from "react";

import { Select, TextArea } from "@veriworkly/ui";

import AdminActionDialog from "@/components/admin/AdminActionDialog";
import { ADMIN_REASON_MAX_LENGTH } from "@/components/admin/admin-reason";
import { ADMIN_INPUT_CLASS } from "@/components/admin/admin-input-class";
import {
  createAdminCommission,
  fetchAdminReferrer,
  updateAdminAffiliate,
  updateAdminCommission,
  updateAdminWithdrawal,
} from "@/features/admin/services/admin-actions";
import { formatCents } from "@/features/admin/utils/admin-format";
import { useServerDraft } from "@/features/admin/utils/use-server-draft";
import { useAdminAccount } from "@/features/admin/utils/use-admin-account";
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
        onConfirm={async (reason) => {
          await updateAdminAffiliate(userId, {
            ...(nextStatus !== status
              ? { status: nextStatus as "PENDING" | "ACTIVE" | "SUSPENDED" }
              : {}),
            ...(nextTier !== tier ? { tier: nextTier } : {}),
            reason,
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
      description={`The ${amount} commission is replaced by one in USD: enter what the customer's ${currency} purchase came to in US dollars. The USD commission uses the same ${(rateBps / 100).toFixed(1)}% rate as the original. It starts pending; the ${currency} one is closed in the same step.`}
      confirmLabel="Convert"
      onConfirm={async (reason) => {
        if (!conversion.ok) throw new Error(conversion.message);

        try {
          await createAdminCommission({ ...conversion.payload, reason });
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
 * Release or reverse a pending commission, or reverse a released or paid one. The wallet is a
 * USD balance, so a commission in another currency cannot be released: the server keeps it
 * PENDING until it is converted and recorded in USD. A refusal (409, e.g. the row changed while
 * it was being reversed) shows the server's message in the dialog.
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
  const amount = formatCents(amountCents, currency);

  // Released money is taken back the way a refund takes it (`reverseLockedCommission`).
  if (status === "AVAILABLE" || status === "PAID") {
    return (
      <AdminActionDialog
        trigger="Reverse"
        title="Reverse this commission"
        description={`${amount} comes back out of the affiliate's available balance first; whatever it cannot cover is owed back and repaid from their next commissions. Use this for a refund or chargeback settled outside the payment provider.`}
        confirmLabel="Reverse commission"
        onConfirm={async (reason) => {
          await updateAdminCommission(id, "REVERSED", reason);
        }}
      />
    );
  }
  if (status !== "PENDING") return <span className="text-muted text-xs">No action</span>;

  return (
    <div className="flex flex-wrap gap-2">
      {currency === "USD" ? (
        <AdminActionDialog
          trigger="Release"
          triggerVariant="primary"
          title="Release this commission"
          description={`${amount} moves from the affiliate's pending balance to available, making it withdrawable.`}
          confirmLabel="Release commission"
          onConfirm={async (reason) => {
            await updateAdminCommission(id, "AVAILABLE", reason);
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
    <WithdrawalDecision
      id={id}
      status="REJECTED"
      trigger="Reject"
      title="Reject this withdrawal"
      description={`${amount} is returned to ${email}'s available balance.${status === "APPROVED" ? " Only reject an approved payout that was never sent." : ""}`}
      confirmLabel="Reject"
      noteLabel="Why it was rejected"
      notePlaceholder="Explain the decision to the affiliate."
      noteRequired
    />
  );

  if (status === "REQUESTED") {
    return (
      <div className="flex flex-wrap gap-2">
        <WithdrawalDecision
          id={id}
          status="APPROVED"
          trigger="Approve"
          triggerVariant="primary"
          title="Approve this withdrawal"
          description={`Approving ${amount} for ${email}. The funds stay reserved until you mark the payout as paid.`}
          confirmLabel="Approve"
          noteLabel="Payout note"
          notePlaceholder="Optional, e.g. when to expect the transfer."
          noteRequired={false}
        />

        {reject}
      </div>
    );
  }

  if (status === "APPROVED") {
    return (
      <div className="flex flex-wrap gap-2">
        <WithdrawalDecision
          id={id}
          status="PAID"
          trigger="Mark paid"
          triggerVariant="primary"
          title="Record this payout as paid"
          description={`Confirm that ${amount} has actually been sent to ${email}. This records the transfer; it does not send money.`}
          confirmLabel="Mark as paid"
          noteLabel="Payout reference"
          notePlaceholder="Bank reference, PayPal transaction id, etc."
          noteRequired
        />
        {reject}
      </div>
    );
  }

  return <span className="text-muted text-xs">Finalized</span>;
}

/** The server's rule for a payout note: 3–500 characters once trimmed, or blank when optional. */
export function isPayoutNoteValid(note: string, required: boolean) {
  const length = note.trim().length;

  return length <= ADMIN_REASON_MAX_LENGTH && (length >= 3 || (!required && length === 0));
}

/**
 * One withdrawal decision. Two fields, because two people read them (V-324, V-081): the payout
 * note is shown to the affiliate on their payout history, and the audit reason stays in the
 * admin audit log. An admin typing "held: fraud check" must know which one the affiliate sees.
 */
function WithdrawalDecision({
  id,
  status,
  noteLabel,
  notePlaceholder,
  noteRequired,
  ...dialog
}: {
  id: string;
  status: "APPROVED" | "REJECTED" | "PAID";
  trigger: string;
  triggerVariant?: "primary";
  title: string;
  description: string;
  confirmLabel: string;
  noteLabel: string;
  notePlaceholder: string;
  noteRequired: boolean;
}) {
  const noteId = useId();
  const [note, setNote] = useState("");
  const noteValid = isPayoutNoteValid(note, noteRequired);
  const showNoteError = note.length > 0 && !noteValid;

  return (
    <AdminActionDialog
      {...dialog}
      reasonLabel="Internal audit reason"
      reasonPlaceholder="Why you are doing this. Kept in the admin audit log; the affiliate never sees it."
      confirmDisabled={!noteValid}
      onClosed={() => setNote("")}
      onConfirm={async (reason) => {
        await updateAdminWithdrawal(id, status, reason, note);
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor={noteId} className="text-muted text-xs font-medium">
          {noteLabel} (visible to the affiliate)
          {noteRequired ? <span className="text-destructive"> *</span> : null}
        </label>

        <TextArea
          id={noteId}
          rows={2}
          value={note}
          maxLength={ADMIN_REASON_MAX_LENGTH}
          placeholder={notePlaceholder}
          aria-required={noteRequired}
          aria-invalid={showNoteError}
          aria-describedby={`${noteId}-hint${showNoteError ? ` ${noteId}-error` : ""}`}
          onChange={(event) => setNote(event.target.value)}
        />

        <p id={`${noteId}-hint`} className="text-muted text-xs">
          Shown to the affiliate on their payout history. Do not put internal notes here.
        </p>

        {showNoteError ? (
          <p id={`${noteId}-error`} className="text-warning text-xs">
            Give at least 3 characters.
          </p>
        ) : null}
      </div>
    </AdminActionDialog>
  );
}

type ReferrerLookup =
  | { state: "idle" | "loading" | "none" }
  | { state: "found"; affiliateEmail: string; blocker: string | null }
  | { state: "error"; message: string };

/**
 * Why this referral cannot be paid a manual commission, or null. The server refuses unless the
 * affiliate is ACTIVE (404), and a referral support rejected earns nothing (S-414).
 */
export function commissionBlocker(referral: {
  status: string;
  affiliate: { affiliateStatus: string };
}) {
  if (referral.affiliate.affiliateStatus !== "ACTIVE")
    return `Affiliate not active (${referral.affiliate.affiliateStatus.toLowerCase().replace("_", " ")}): the commission would be refused.`;
  if (referral.status === "REJECTED")
    return "This referral was rejected, so it earns no commission.";
  return null;
}

/** The affiliate a referred account was referred by, once that account is known. */
function useReferrer(referredUserId: string, referredEmail: string | null): ReferrerLookup {
  const id = referredUserId.trim();
  const [lookup, setLookup] = useState<{ key: string; result: ReferrerLookup } | null>(null);
  const key = `${id} ${referredEmail ?? ""}`;

  useEffect(() => {
    if (!referredEmail) return;

    let active = true;
    fetchAdminReferrer(id, referredEmail)
      .then((referral) => {
        if (!active) return;
        setLookup({
          key,
          result: referral
            ? {
                state: "found",
                affiliateEmail: referral.affiliate.email,
                blocker: commissionBlocker(referral),
              }
            : { state: "none" },
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLookup({
          key,
          result: {
            state: "error",
            message: `Could not look up the referral: ${error instanceof Error ? error.message : String(error)}`,
          },
        });
      });

    return () => {
      active = false;
    };
  }, [id, referredEmail, key]);

  if (!referredEmail) return { state: "idle" };
  return lookup?.key === key ? lookup.result : { state: "loading" };
}

/**
 * Manual commission entry for a payment that never produced a webhook. The server pays the
 * affiliate who referred `referredUserId`, so both accounts are named before anything is created
 * (S-414): a mistyped id that happens to be another referred user would pay a stranger. The
 * commission is created PENDING, which nothing releases on its own, unless the admin releases
 * it on purpose.
 */
export function CommissionCreateForm() {
  const [referredUserId, setReferredUserId] = useState("");
  const [providerPaymentId, setProviderPaymentId] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [releaseNow, setReleaseNow] = useState(false);
  const account = useAdminAccount(referredUserId);
  const referrer = useReferrer(referredUserId, account.state === "found" ? account.email : null);

  const purchaseAmountCents = Math.round(Number(amountUsd || 0) * 100);
  const ready =
    referrer.state === "found" &&
    referrer.blocker === null &&
    providerPaymentId.trim() !== "" &&
    purchaseAmountCents > 0;

  const problem =
    account.state === "missing" ||
    account.state === "error" ||
    referrer.state === "none" ||
    referrer.state === "error" ||
    (referrer.state === "found" && referrer.blocker !== null);
  const accountLine =
    account.state === "loading"
      ? "Looking up the account…"
      : account.state === "missing"
        ? "No account has this id."
        : account.state === "error"
          ? account.message
          : account.state === "found"
            ? referrer.state === "found"
              ? `Referred: ${account.email} · affiliate: ${referrer.affiliateEmail}${referrer.blocker ? `. ${referrer.blocker}` : ""}`
              : referrer.state === "none"
                ? `${account.email} was not referred by any affiliate.`
                : referrer.state === "error"
                  ? referrer.message
                  : `Referred: ${account.email} · looking up the affiliate…`
            : null;

  return (
    <div className="space-y-3">
      <input
        className={ADMIN_INPUT_CLASS}
        aria-label="Referred user id"
        placeholder="Referred user id"
        value={referredUserId}
        onChange={(event) => setReferredUserId(event.target.value)}
      />
      {accountLine ? (
        <p
          role={problem ? "alert" : undefined}
          className={problem ? "text-destructive text-xs font-medium" : "text-muted text-xs"}
        >
          {accountLine}
        </p>
      ) : null}

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

      <label className="text-muted flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={releaseNow}
          onChange={(event) => setReleaseNow(event.target.checked)}
        />
        Release now: withdrawable immediately, instead of held as pending until an admin releases it
      </label>

      <AdminActionDialog
        trigger="Create commission"
        triggerVariant="primary"
        disabled={!ready}
        title="Create a manual commission"
        description={
          account.state === "found" && referrer.state === "found"
            ? `Recording a ${formatCents(purchaseAmountCents)} purchase by ${account.email}. The commission goes to ${referrer.affiliateEmail}, at their tier's rate, and ${releaseNow ? "is withdrawable immediately" : "is held as pending until an admin releases it"}.`
            : "Enter the id of a referred account."
        }
        confirmLabel="Create commission"
        onConfirm={async (reason) => {
          await createAdminCommission({
            referredUserId: referredUserId.trim(),
            providerPaymentId: providerPaymentId.trim(),
            purchaseAmountCents,
            status: releaseNow ? "AVAILABLE" : "PENDING",
            reason,
          });

          setReferredUserId("");
          setProviderPaymentId("");
          setAmountUsd("");
          setReleaseNow(false);
        }}
      />
    </div>
  );
}
