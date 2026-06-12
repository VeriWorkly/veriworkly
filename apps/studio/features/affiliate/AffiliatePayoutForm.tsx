"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@veriworkly/ui";
import { requestWithdrawal } from "@/features/affiliate/affiliate-api";

export function AffiliatePayoutForm({ availableCents, minimumCents }: { availableCents: number; minimumCents: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  return <div className="space-y-3"><input className="border-border bg-background h-10 w-full rounded-lg border px-3 text-sm" min={minimumCents / 100} max={availableCents / 100} placeholder="Amount in USD" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />{message ? <p className="text-muted text-xs">{message}</p> : null}<Button className="w-full" loading={loading} onClick={async () => { setLoading(true); setMessage(""); try { await requestWithdrawal(Math.round(Number(amount) * 100)); setAmount(""); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not request payout."); } finally { setLoading(false); } }}>Request payout</Button></div>;
}
