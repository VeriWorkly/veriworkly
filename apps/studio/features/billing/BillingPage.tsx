"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CalendarClock,
  Coins,
  ExternalLink,
  FileClock,
  ShieldCheck,
  LockKeyhole,
} from "lucide-react";
import { Button } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";
import { useUserStore } from "@/store/useUserStore";
import { buyCreditPack, openBillingPortal, cancelCheckout } from "@/features/billing/billing-api";
import type { BillingActivity, BillingSummary } from "@/features/billing/types";
import { cn } from "@/lib/utils";

const planNames = {
  FREE: "Free",
  AI_CREDITS: "AI Credits",
  PORTFOLIO_PRO: "Creator Pro",
  BUNDLE: "Job Hunter Bundle",
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
  const [clearingLock, setClearingLock] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const { user } = useUserStore();
  const isProd = process.env.NODE_ENV === "production";
  const adminEmail = (
    process.env.NEXT_PUBLIC_ADMIN_EMAIL || "ashragautam25@gmail.com"
  ).toLowerCase();
  const isAdmin = user && user.email && user.email.toLowerCase() === adminEmail;
  const paymentsBlocked = isProd && !isAdmin;

  useEffect(() => {
    const checkoutStatus = searchParams?.get("checkout");
    if (checkoutStatus === "cancelled") {
      void cancelCheckout()
        .then(() => {
          router.replace("/billing");
        })
        .catch((err) => {
          console.error("Failed to cancel checkout lock", err);
        });
    }
  }, [searchParams, router]);

  const handleClearLock = async () => {
    setClearingLock(true);
    try {
      await cancelCheckout();
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not clear checkout lock.");
    } finally {
      setClearingLock(false);
    }
  };

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
    <main className="relative min-h-[400px]">
      <div className={cn("space-y-5", !user && "pointer-events-none opacity-40 blur-[3px]")}>
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
                  disabled={paymentsBlocked}
                  onClick={() => void openPortal()}
                >
                  Manage subscription <ExternalLink className="mr-2 h-4 w-4" />
                </Button>
              ) : (
                <Button asChild disabled={!user}>
                  <Link href={user ? `${siteConfig.links.main}/pricing` : "#"}>
                    View upgrade options
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </header>

        {paymentsBlocked ? (
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm font-semibold text-amber-600 dark:text-amber-400">
            <p className="flex-1">
              Payments are disabled in production during this phase. Only administrators can perform
              purchases or manage subscriptions.
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="border-destructive/30 bg-destructive/5 text-destructive flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 text-sm">
            <p className="flex-1">{error}</p>
            {error.includes("checkout is already active") && (
              <Button
                size="sm"
                variant="secondary"
                loading={clearingLock}
                onClick={() => void handleClearLock()}
              >
                Reset checkout lock
              </Button>
            )}
          </div>
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
                    className="bg-background border-border rounded-lg border px-2.5 py-1.5 text-xs font-bold uppercase"
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
              disabled={!billing?.creditEconomics.packs[0]?.configured || paymentsBlocked || !user}
              onClick={() => void buyPack()}
            >
              {paymentsBlocked
                ? "Payments disabled in production"
                : billing?.creditEconomics.packs[0]?.configured
                  ? "Buy 100 extra credits"
                  : "Extra credits coming soon"}
            </Button>
            <Link
              className="text-accent mt-3 block text-center text-xs font-bold"
              href={user ? "/credits" : "#"}
            >
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
      </div>

      {!user ? (
        <div className="border-border bg-card/45 absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl border p-6 text-center backdrop-blur-sm">
          <div className="bg-accent-soft text-accent flex h-12 w-12 items-center justify-center rounded-full">
            <LockKeyhole size={20} />
          </div>
          <h2 className="text-foreground mt-4 text-base font-extrabold">
            Log in to view subscriptions
          </h2>
          <p className="text-muted-foreground mt-1.5 max-w-sm text-xs leading-5">
            Please log in or create an account to view subscription plans, purchase credits, and
            manage billing history.
          </p>
          <button
            onClick={() => {
              const loginUrl =
                process.env.NODE_ENV === "development"
                  ? "http://localhost:3001/login"
                  : "https://app.veriworkly.com/login";
              window.location.href = `${loginUrl}?callbackURL=${encodeURIComponent(window.location.href)}`;
            }}
            className="bg-accent text-accent-foreground hover:bg-accent/90 mt-5 inline-flex min-h-10 items-center justify-center rounded-lg px-5 text-xs font-bold transition"
          >
            Log In
          </button>
        </div>
      ) : null}
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
