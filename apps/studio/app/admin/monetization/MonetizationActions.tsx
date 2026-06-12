"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@veriworkly/ui";
import { fetchApiData } from "@/utils/fetchApiData";

export function MonetizationActions({ withdrawalId, status }: { withdrawalId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState("");
  const update = async (nextStatus: "APPROVED" | "REJECTED" | "PAID") => {
    setLoading(nextStatus);
    try {
      await fetchApiData(`/admin/monetization/withdrawals/${withdrawalId}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
      router.refresh();
    } finally { setLoading(""); }
  };
  return <div className="flex flex-wrap gap-2">
    {status === "REQUESTED" ? <><Button size="sm" loading={loading === "APPROVED"} onClick={() => void update("APPROVED")}>Approve</Button><Button size="sm" variant="secondary" loading={loading === "REJECTED"} onClick={() => void update("REJECTED")}>Reject</Button></> : null}
    {status === "APPROVED" ? <Button size="sm" loading={loading === "PAID"} onClick={() => void update("PAID")}>Mark paid</Button> : null}
  </div>;
}

export function ManualGrantForm({ kind }: { kind: "credits" | "entitlements" }) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [value, setValue] = useState(kind === "credits" ? "100" : "portfolio_publish");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const submit = async () => {
    setMessage("");
    try {
      await fetchApiData(`/admin/monetization/${kind}`, {
        method: "POST",
        body: JSON.stringify(kind === "credits" ? { userId, amount: Number(value), reason } : { userId, key: value, reason }),
      });
      setMessage("Saved."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Failed."); }
  };
  return <div className="space-y-3">
    <input className="border-border bg-background h-10 w-full rounded-lg border px-3 text-sm" placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
    {kind === "credits" ? <input className="border-border bg-background h-10 w-full rounded-lg border px-3 text-sm" type="number" value={value} onChange={(e) => setValue(e.target.value)} /> : <select className="border-border bg-background h-10 w-full rounded-lg border px-3 text-sm" value={value} onChange={(e) => setValue(e.target.value)}><option value="portfolio_publish">Portfolio publish</option><option value="ai_credits">AI credits</option><option value="custom_subdomain">Custom subdomain</option><option value="analytics">Analytics</option><option value="seo_controls">SEO controls</option><option value="watermark_removal">Watermark removal</option></select>}
    <input className="border-border bg-background h-10 w-full rounded-lg border px-3 text-sm" placeholder="Audit reason" value={reason} onChange={(e) => setReason(e.target.value)} />
    {message ? <p className="text-muted text-xs">{message}</p> : null}<Button onClick={() => void submit()}>Apply {kind}</Button>
  </div>;
}

export function AffiliateModeration({ userId, status, tier }: { userId: string; status: string; tier: string }) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState(status);
  const [nextTier, setNextTier] = useState(tier);
  const save = async () => {
    await fetchApiData(`/admin/monetization/affiliates/${userId}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus, tier: nextTier }) });
    router.refresh();
  };
  return <div className="flex flex-wrap gap-2"><select className="border-border bg-background h-8 rounded-lg border px-2 text-xs" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}><option>ACTIVE</option><option>PENDING</option><option>SUSPENDED</option></select><select className="border-border bg-background h-8 rounded-lg border px-2 text-xs" value={nextTier} onChange={(e) => setNextTier(e.target.value)}><option>TIER_1</option><option>TIER_2</option><option>TIER_3</option></select><Button size="sm" onClick={() => void save()}>Save</Button></div>;
}

export function CommissionForm() {
  const router = useRouter();
  const [referredUserId, setReferredUserId] = useState("");
  const [providerPaymentId, setProviderPaymentId] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const submit = async () => {
    try {
      await fetchApiData("/admin/monetization/commissions", { method: "POST", body: JSON.stringify({ referredUserId, providerPaymentId, purchaseAmountCents: Math.round(Number(amount) * 100), status: "AVAILABLE" }) });
      setMessage("Commission created."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Failed."); }
  };
  return <div className="space-y-3"><input className="border-border bg-background h-10 w-full rounded-lg border px-3 text-sm" placeholder="Referred user ID" value={referredUserId} onChange={(e) => setReferredUserId(e.target.value)} /><input className="border-border bg-background h-10 w-full rounded-lg border px-3 text-sm" placeholder="Provider payment ID" value={providerPaymentId} onChange={(e) => setProviderPaymentId(e.target.value)} /><input className="border-border bg-background h-10 w-full rounded-lg border px-3 text-sm" placeholder="Purchase amount USD" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />{message ? <p className="text-muted text-xs">{message}</p> : null}<Button onClick={() => void submit()}>Create commission</Button></div>;
}

export function CommissionActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const update = async (nextStatus: "AVAILABLE" | "REVERSED") => {
    await fetchApiData(`/admin/monetization/commissions/${id}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
    router.refresh();
  };
  if (status !== "PENDING") return <span className="text-muted text-xs">{status}</span>;
  return <div className="flex gap-2"><Button size="sm" onClick={() => void update("AVAILABLE")}>Release</Button><Button size="sm" variant="secondary" onClick={() => void update("REVERSED")}>Reverse</Button></div>;
}
