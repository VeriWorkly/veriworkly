"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@veriworkly/ui";
import { requestWithdrawal } from "@/features/affiliate/affiliate-api";

/**
 * `withdrawableCents` is the server's cap (V-321): the available balance less what the affiliate
 * owes back from a commission reversed after release. Asking for more is refused with a 400.
 */
export function AffiliatePayoutForm({
  withdrawableCents,
  minimumCents,
}: {
  withdrawableCents: number;
  minimumCents: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const minDollars = minimumCents / 100;
  const maxDollars = withdrawableCents / 100;

  const validationError = useMemo(() => {
    if (!amount.trim()) return null;

    const value = Number(amount);
    if (!Number.isFinite(value)) return "Enter a valid amount.";
    if (value < minDollars) return `Minimum payout is $${minDollars.toFixed(2)}.`;
    if (value > maxDollars) return `You can withdraw up to $${maxDollars.toFixed(2)}.`;
    return null;
  }, [amount, minDollars, maxDollars]);

  const canSubmit = amount.trim().length > 0 && !validationError && !loading;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setMessage(null);
    try {
      await requestWithdrawal(Math.round(Number(amount) * 100));
      setAmount("");
      setMessage({ text: "Payout requested successfully.", isError: false });
      router.refresh();
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Could not request payout.",
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <label htmlFor="payout-amount" className="text-muted-foreground block text-xs font-bold">
        Amount in USD
      </label>
      <input
        id="payout-amount"
        className="border-border bg-background h-10 w-full rounded-lg border px-3 text-sm"
        min={minDollars}
        max={maxDollars}
        step="0.01"
        placeholder="Amount in USD"
        type="number"
        inputMode="decimal"
        aria-invalid={Boolean(validationError)}
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
      />
      {validationError ? (
        <p role="alert" className="text-destructive text-xs font-semibold">
          {validationError}
        </p>
      ) : message ? (
        <p
          role={message.isError ? "alert" : undefined}
          className={message.isError ? "text-destructive text-xs" : "text-muted text-xs"}
        >
          {message.text}
        </p>
      ) : null}
      <Button className="w-full" type="submit" loading={loading} disabled={!canSubmit}>
        Request payout
      </Button>
    </form>
  );
}
