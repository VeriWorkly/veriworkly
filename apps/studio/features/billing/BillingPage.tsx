"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Coins, ExternalLink, FileClock, ShieldCheck } from "lucide-react";
import { Button } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";
import { buyCreditPack, openBillingPortal } from "@/features/billing/billing-api";
import type { BillingActivity, BillingSummary } from "@/features/billing/types";

const planNames = {
  FREE: "Free",
  AI_CREDITS: "AI Credits",
  PORTFOLIO_PRO: "Portfolio Pro",
  BUNDLE: "VeriWorkly Bundle",
} as const;

function displayDate(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Not scheduled";
}

export function BillingPage({
  billing,
  history,
}: {
  billing: BillingSummary | null;
  history: BillingActivity[];
}) {
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  const openPortal = async () => {
    setLoading("portal");
    setError("");
    try {
      window.location.assign((await openBillingPortal()).url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open billing portal.");
      setLoading("");
    }
  };

  const buyPack = async () => {
    setLoading("credit_pack_100");
    setError("");
    try {
      window.location.assign((await buyCreditPack("credit_pack_100")).url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start credit checkout.");
      setLoading("");
    }
  };

  return (
    <main className="space-y-5">
      <header className="border-border bg-card rounded-2xl border p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Billing and plan</h1>
            <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
              Manage the plan already attached to your account, renewal details, credits, and
              invoices.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {billing?.productKey ? (
              <Button
                variant="secondary"
                loading={loading === "portal"}
                onClick={() => void openPortal()}
              >
                Manage subscription <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button asChild>
                <Link href={`${siteConfig.links.main}/pricing`}>View upgrade options</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {error ? (
        <p className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-3 text-sm">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
        <article className="border-border bg-card rounded-2xl border p-5">
          <div className="flex items-center gap-2 text-sm font-black">
            <ShieldCheck className="text-accent h-4 w-4" /> Current plan
          </div>
          <p className="mt-5 text-3xl font-black">
            {billing ? planNames[billing.plan] : "Unavailable"}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Detail
              icon={CalendarClock}
              label={billing?.cancelAtPeriodEnd ? "Access ends" : "Next renewal"}
              value={displayDate(billing?.currentPeriodEnd ?? null)}
            />
            <Detail
              icon={ShieldCheck}
              label="Subscription status"
              value={billing?.status.replaceAll("_", " ") ?? "Unavailable"}
            />
          </div>
          <div className="border-border mt-5 border-t pt-5">
            <p className="text-muted text-xs font-bold">Included account access</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(billing?.entitlements ?? []).map((item) => (
                <span
                  className="bg-background border-border rounded-lg border px-2.5 py-1.5 text-xs font-bold capitalize uppercase"
                  key={item}
                >
                  {item.replaceAll("_", " ")}
                </span>
              ))}

              {!billing?.entitlements.length ? (
                <span className="text-muted text-sm">Free account access</span>
              ) : null}
            </div>
          </div>
        </article>

        <article className="border-border bg-card rounded-2xl border p-5">
          <div className="flex items-center gap-2 text-sm font-black">
            <Coins className="text-accent h-4 w-4" /> AI credits
          </div>
          <p className="mt-5 text-4xl font-black">{billing?.credits.balance ?? 0}</p>
          <p className="text-muted mt-1 text-sm">credits available</p>
          <div className="border-border mt-5 border-t pt-4">
            <p className="text-sm font-bold">
              {billing?.credits.nextExpiryCredits
                ? `${billing.credits.nextExpiryCredits} credits expire ${displayDate(billing.credits.nextExpiryAt)}`
                : "No credits currently scheduled to expire"}
            </p>
          </div>
          <Button
            className="mt-5 w-full"
            loading={loading === "credit_pack_100"}
            disabled={!billing?.creditEconomics.packs[0]?.configured}
            onClick={() => void buyPack()}
          >
            {billing?.creditEconomics.packs[0]?.configured
              ? "Buy 100 extra credits"
              : "Extra credits coming soon"}
          </Button>
          <Link className="text-accent mt-3 block text-center text-xs font-bold" href="/credits">
            View usage and action costs
          </Link>
        </article>
      </section>

      <section className="border-border bg-card rounded-2xl border p-5">
        <h2 className="flex items-center gap-2 font-black">
          <FileClock className="h-4 w-4" /> Billing history
        </h2>
        <div className="border-border mt-4 divide-y border-y">
          {history.length ? (
            history.map((item) => (
              <div className="flex items-center justify-between gap-4 py-3 text-sm" key={item.id}>
                <span className="font-semibold">
                  {item.type
                    .replace("subscription.", "Subscription ")
                    .replace("payment.", "Payment ")
                    .replaceAll("_", " ")}
                </span>
                <time className="text-muted">
                  {new Date(item.processedAt ?? item.createdAt).toLocaleDateString()}
                </time>
              </div>
            ))
          ) : (
            <p className="text-muted py-5 text-sm">No billing activity yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-background rounded-xl p-4">
      <Icon className="text-accent h-4 w-4" />
      <p className="text-muted mt-3 text-xs font-bold">{label}</p>
      <p className="mt-1 text-sm font-black capitalize">{value}</p>
    </div>
  );
}
