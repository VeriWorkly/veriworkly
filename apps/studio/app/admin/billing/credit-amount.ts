import type { AdminCreditKind } from "@/features/admin/services/admin-actions";

/** The server's `adminCreditAdjustmentSchema` bound: a non-zero whole number within a million. */
const MAX_CREDIT_ADJUSTMENT = 1_000_000;

/** The same schema's cap on a restored plan month: one month's allowance. */
const MAX_SUBSCRIPTION_MONTH = 1_000;

export type CreditAmountResult = { ok: true; amount: number } | { ok: false; message: string };

/** Reads an admin credit-adjustment input the way the server will judge it, for its kind (SV-22). */
export function parseCreditAmount(
  input: string,
  kind: AdminCreditKind = "goodwill",
): CreditAmountResult {
  const amount = Number(input.trim());

  if (!input.trim() || !Number.isFinite(amount)) {
    return { ok: false, message: "Enter a number of credits." };
  }

  if (!Number.isInteger(amount)) {
    return { ok: false, message: "Credits must be a whole number." };
  }

  if (amount === 0) {
    return { ok: false, message: "Enter a non-zero amount." };
  }

  if (Math.abs(amount) > MAX_CREDIT_ADJUSTMENT) {
    return { ok: false, message: "Adjust at most 1,000,000 credits at a time." };
  }

  if (amount < 0 && kind !== "goodwill") {
    return { ok: false, message: "Only goodwill credits can be removed." };
  }

  if (kind === "subscription_month" && amount > MAX_SUBSCRIPTION_MONTH) {
    return { ok: false, message: "A restored plan month is at most 1,000 credits." };
  }

  return { ok: true, amount };
}
