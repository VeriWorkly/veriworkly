"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  Coins,
  ExternalLink,
  FileClock,
  ShieldCheck,
  LockKeyhole,
} from "lucide-react";
import { Button, cn } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";
import { useSessionUser } from "@/store/session-user";
import { buyCreditPack, openBillingPortal, cancelCheckout } from "@/features/billing/billing-api";
import type { BillingActivity, BillingSummary, CreditPackKey } from "@/features/billing/types";
import {
  purchaseFingerprint,
  recordPurchaseBaseline,
  takePurchaseBaseline,
} from "@/features/billing/purchase-baseline";
import {
  isPaymentsClosedError,
  PAYMENTS_OPEN_SOON,
  PLAN_NAMES,
} from "@/features/billing/checkout-rules";
import { UpgradeToBundle } from "@/features/billing/UpgradeToBundle";
import { LocalDate } from "@/components/LocalDate";
import { fetchApiData } from "@/utils/fetchApiData";
import { formatCents } from "@/features/admin/utils/admin-format";

// The plan changes only when the payment webhook lands, which can trail the redirect back
// here by several seconds; past the last delay the user is told to refresh later instead.
const PURCHASE_POLL_DELAYS_MS = [0, 1500, 2500, 4000, 6000];

async function waitForPurchaseToApply(before: string): Promise<boolean> {
  for (const delay of PURCHASE_POLL_DELAYS_MS) {
    await new Promise((resolve) => window.setTimeout(resolve, delay));

    const next = await fetchApiData<BillingSummary>("/billing/me", { method: "GET" });

    if (purchaseFingerprint(next) !== before) return true;
  }

  return false;
}

/**
 * Nothing on this page starts a subscription checkout, so none of its 409s is the checkout lock:
 * a cancelled checkout whose payment is still processing, or a portal with no billing account
 * yet, is said as the server says it, with nothing offered that would 409 again.
 */
type BillingError = { message: string; isNotice?: boolean };

function toBillingError(cause: unknown, fallbackMessage: string): BillingError {
  if (isPaymentsClosedError(cause)) return { message: PAYMENTS_OPEN_SOON, isNotice: true };

  return { message: cause instanceof Error ? cause.message : fallbackMessage };
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  PAST_DUE: "Payment failed",
  CANCELED: "Cancelled",
};

const ENTITLEMENT_LABELS: Record<string, string> = {
  ai_credits: "AI features on your credits",
  portfolio_publish: "Portfolio publishing",
  seo_controls: "SEO controls",
  analytics: "Portfolio analytics",
  watermark_removal: "No VeriWorkly badge",
};

const HISTORY_LABELS: Record<string, string> = {
  "subscription.active": "Subscription started",
  "subscription.renewed": "Subscription renewed",
  "subscription.plan_changed": "Plan changed",
  "subscription.updated": "Subscription updated",
  "subscription.on_hold": "Renewal payment failed",
  "subscription.failed": "Subscription payment failed",
  "subscription.cancelled": "Subscription cancelled",
  "subscription.expired": "Subscription ended",
  "payment.succeeded": "Payment received",
  "payment.failed": "Payment failed",
  "refund.succeeded": "Refund issued",
};

function historyLabel(type: string) {
  if (HISTORY_LABELS[type]) return HISTORY_LABELS[type];
  if (type.startsWith("dispute.")) return "Payment disputed";

  const label = type.replace(".", " ").replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * A renewal that failed: the provider retries the card until `graceEndsAt`, then access ends.
 * The summary can already read INACTIVE and FREE by then, so the grace date is the signal.
 */
function dunningEndsAt(billing: BillingSummary): { endsAt: string | null } | null {
  if (billing.graceEndsAt && Date.parse(billing.graceEndsAt) > Date.now()) {
    return { endsAt: billing.graceEndsAt };
  }

  return billing.status === "PAST_DUE" ? { endsAt: billing.currentPeriodEnd } : null;
}

export function BillingPage({
  billing,
  history,
}: {
  billing: BillingSummary | null;
  history: BillingActivity[];
}) {
  const [loading, setLoading] = useState("");
  const [error, setError] = useState<BillingError | null>(null);
  // What is being waited for after a payment: a checkout return or a plan upgrade.
  const [finalizing, setFinalizing] = useState<"purchase" | "upgrade" | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const user = useSessionUser();

  // Whether payments are actually blocked for this user is decided authoritatively by
  // the backend (BillingController.assertPaymentsEnabled), whose 403 shows as the
  // "Payments open soon" notice below. We deliberately do not try to
  // replicate that admin check on the client — doing so would require shipping an
  // admin identity into the public bundle and would only ever be an unreliable guess.

  const dunning = billing ? dunningEndsAt(billing) : null;
  const tier = billing?.access.tier;
  // A lapsed subscriber is "free" or "credits" again and must be able to buy again. During a
  // failed renewal the card is fixed instead: no second subscription is offered.
  const canBuy = !dunning && (!billing || tier === "free" || tier === "credits");
  const recurringTier = tier === "ai_credits" || tier === "portfolio_pro" || tier === "bundle";
  // The server refuses AI Credits beside any live subscription (`checkoutOverlap`), so it is
  // offered only to an account without one.
  const aiCreditsProduct =
    dunning || recurringTier
      ? undefined
      : billing?.catalog.find((product) => product.key === "ai_credits");
  // The portal holds receipts for every purchase, and manages a subscription only while one runs.
  const canOpenPortal = Boolean(billing?.productKey || billing?.access.isPaying);
  const managesSubscription = Boolean(dunning) || (recurringTier && billing?.access.isPaying);
  // V-202: a live Creator Pro or AI Credits subscription can become the bundle in place, at the
  // interval it is billed on. The server refuses it for an ending plan and for a pass.
  const upgradeInterval =
    billing?.interval === "MONTHLY"
      ? ("monthly" as const)
      : billing?.interval === "ANNUAL"
        ? ("annual" as const)
        : null;
  const upgrade =
    billing &&
    !dunning &&
    (tier === "portfolio_pro" || tier === "ai_credits") &&
    billing.access.isPaying &&
    billing.productKey === tier &&
    !billing.cancelAtPeriodEnd &&
    upgradeInterval
      ? { productKey: "bundle" as const, interval: upgradeInterval }
      : null;

  // `router.replace` below changes `searchParams`; the ref keeps that re-run from starting
  // the return flow twice, and nothing here is cancelled by it.
  const checkoutReturnHandled = useRef(false);

  useEffect(() => {
    const checkoutStatus = searchParams?.get("checkout");

    // Cleared once the parameter is gone, so a later upgrade on this same page is handled too.
    if (!checkoutStatus) {
      checkoutReturnHandled.current = false;
      return;
    }
    if (checkoutReturnHandled.current) return;
    checkoutReturnHandled.current = true;

    if (checkoutStatus === "cancelled") {
      void cancelCheckout()
        .then(() => {
          router.replace("/billing");
        })
        .catch((cause) => {
          setError(toBillingError(cause, "Could not release the cancelled checkout."));
        });
      return;
    }

    // `upgrade`: a plan change was sent (V-202); like a payment, it lands with its webhook.
    if (
      checkoutStatus === "complete" ||
      checkoutStatus === "success" ||
      checkoutStatus === "upgrade"
    ) {
      const baseline = takePurchaseBaseline();
      router.replace("/billing");

      // No record of the state before checkout (another tab, cleared storage): nothing to
      // wait for, so one refresh shows the plan as it now is.
      if (baseline === null) {
        router.refresh();
        return;
      }

      // Deferred to a microtask so this setState call doesn't run synchronously
      // inside the effect body itself (cascading-render lint rule).
      queueMicrotask(() => setFinalizing(checkoutStatus === "upgrade" ? "upgrade" : "purchase"));

      void waitForPurchaseToApply(baseline)
        .then((applied) => {
          if (applied) {
            router.refresh();
            return;
          }

          setError({
            message:
              checkoutStatus === "upgrade"
                ? "Your upgrade is still being confirmed. Your plan changes once the payment goes through: refresh this page in a minute."
                : "Your payment is still being confirmed. Refresh this page in a minute to see your plan and credits.",
          });
        })
        .catch((cause) => {
          setError(toBillingError(cause, "Could not check the status of your purchase."));
        })
        .finally(() => setFinalizing(null));
    }
  }, [searchParams, router]);

  const openPortal = async () => {
    setLoading("portal");
    setError(null);
    try {
      window.location.assign((await openBillingPortal()).url);
    } catch (cause) {
      setError(toBillingError(cause, "Could not open billing portal."));
      setLoading("");
    }
  };

  const buyPack = async (packKey: CreditPackKey) => {
    setLoading(packKey);
    setError(null);
    try {
      const [{ url }] = await Promise.all([
        buyCreditPack(packKey),
        recordPurchaseBaseline(packKey),
      ]);
      window.location.assign(url);
    } catch (cause) {
      setError(toBillingError(cause, "Could not start credit checkout."));
      setLoading("");
    }
  };

  return (
    <main className="relative min-h-100">
      <div className={cn("space-y-5", !user && "pointer-events-none opacity-40 blur-[3px]")}>
        <header className="border-border bg-card rounded-2xl border p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <h1 className="text-3xl font-black tracking-tight">Billing and plan</h1>
              <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
                Your plan and its dates, your AI credits, and your billing activity.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canOpenPortal ? (
                <Button
                  variant="secondary"
                  loading={loading === "portal"}
                  onClick={() => void openPortal()}
                >
                  {managesSubscription ? "Manage subscription" : "Receipts and invoices"}{" "}
                  <ExternalLink className="mr-2 h-4 w-4" />
                </Button>
              ) : null}
              {canBuy ? (
                <Button asChild disabled={!user}>
                  <Link href={user ? `${siteConfig.links.main}/pricing` : "#"}>
                    View upgrade options
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </header>

        {dunning ? (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/5 text-destructive flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 text-sm font-semibold"
          >
            <p className="flex flex-1 items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Payment failed
                {dunning.endsAt ? (
                  <>
                    {" "}
                    — access ends <LocalDate value={dunning.endsAt} />
                  </>
                ) : null}{" "}
                — update your card to keep your plan.
              </span>
            </p>
            <Button
              size="sm"
              variant="secondary"
              loading={loading === "portal"}
              onClick={() => void openPortal()}
            >
              Update card
            </Button>
          </div>
        ) : null}

        {finalizing ? (
          <div className="border-accent/30 bg-accent/10 text-accent flex flex-wrap items-center gap-3 rounded-xl border p-4 text-sm font-semibold">
            <span className="border-accent/40 border-t-accent h-4 w-4 animate-spin rounded-full border-2" />
            {finalizing === "upgrade"
              ? "Upgrade is being confirmed — your plan changes once the payment goes through."
              : "Finalizing your purchase — this can take a few seconds while we confirm payment."}
          </div>
        ) : null}

        {error ? (
          <div
            role={error.isNotice ? "status" : "alert"}
            className={cn(
              "flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 text-sm",
              error.isNotice
                ? "border-accent/30 bg-accent/10 text-accent"
                : "border-destructive/30 bg-destructive/5 text-destructive",
            )}
          >
            <p className="flex-1">{error.message}</p>
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
          <article className="border-border bg-card rounded-2xl border p-5">
            <div className="flex items-center gap-2 text-sm font-black">
              <ShieldCheck className="text-accent h-4 w-4" /> Current plan
            </div>
            {billing ? (
              <PlanDetails billing={billing} inDunning={Boolean(dunning)} />
            ) : (
              <p className="mt-5 text-3xl font-black">Unavailable</p>
            )}
          </article>

          <article className="border-border bg-card rounded-2xl border p-5">
            <div className="flex items-center gap-2 text-sm font-black">
              <Coins className="text-accent h-4 w-4" /> AI credits
            </div>
            <p className="mt-5 text-4xl font-black">{billing?.credits.available ?? 0}</p>
            <p className="text-muted mt-1 text-sm">credits available</p>
            <div className="border-border mt-5 space-y-1 border-t pt-4 text-sm font-bold">
              <p>
                {billing?.credits.nextExpiryCredits && billing.credits.nextExpiryAt ? (
                  <>
                    {billing.credits.nextExpiryCredits} credits expire{" "}
                    <LocalDate value={billing.credits.nextExpiryAt} />
                  </>
                ) : (
                  "No credits currently scheduled to expire"
                )}
              </p>
              {billing?.credits.reserved ? (
                <p className="text-muted font-semibold">
                  {billing.credits.reserved} credits held for an action in progress
                </p>
              ) : null}
              {tier === "pass" ? (
                <p className="text-muted font-semibold">Your pass credits end with the pass.</p>
              ) : null}
            </div>

            {aiCreditsProduct ? (
              <div className="border-border mt-5 border-t pt-4">
                <p className="text-sm font-black">AI Credits subscription</p>
                {(["monthly", "annual"] as const).map((interval) =>
                  aiCreditsProduct.creditNotes?.[interval] ? (
                    <p key={interval} className="text-muted mt-1 text-xs leading-5">
                      <span className="text-foreground font-bold">
                        {interval === "monthly" ? "Monthly" : "Annual"}:
                      </span>{" "}
                      {aiCreditsProduct.creditNotes[interval]}
                    </p>
                  ) : null,
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(["monthly", "annual"] as const).map((interval) => {
                    const cents = aiCreditsProduct.prices[interval];
                    const sold =
                      cents !== undefined &&
                      aiCreditsProduct.configuredIntervals.includes(interval);

                    return sold ? (
                      <Button asChild key={interval} variant="secondary" disabled={!user}>
                        <Link
                          href={user ? `/checkout?productKey=ai_credits&interval=${interval}` : "#"}
                        >
                          {formatCents(cents, aiCreditsProduct.currency)} /{" "}
                          {interval === "monthly" ? "month" : "year"}
                        </Link>
                      </Button>
                    ) : (
                      <Button key={interval} variant="secondary" disabled>
                        Coming soon
                      </Button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {upgrade ? (
              <div className="border-border mt-5 border-t pt-4">
                <p className="text-sm font-black">{PLAN_NAMES.bundle}</p>
                <p className="text-muted mt-1 text-xs leading-5">
                  {PLAN_NAMES.ai_credits} and {PLAN_NAMES.portfolio_pro} in one plan. Upgrade now
                  and pay only the difference for the rest of this billing period; your renewal date
                  stays the same.
                </p>
                <UpgradeToBundle upgrade={upgrade} className="mt-3 w-full" />
              </div>
            ) : null}

            <div className="border-border mt-5 border-t pt-4">
              <p className="text-sm font-black">Credit packs</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(billing?.creditEconomics.packs ?? []).map((pack) => (
                  <Button
                    key={pack.key}
                    className="h-auto flex-col py-2 odd:last:col-span-2"
                    loading={loading === pack.key}
                    disabled={!pack.configured || !user}
                    onClick={() => void buyPack(pack.key)}
                  >
                    {pack.configured
                      ? `Buy ${pack.credits.toLocaleString("en-US")} credits`
                      : "Coming soon"}
                    <span className="text-xs font-semibold opacity-80">
                      {pack.configured ? `${formatCents(pack.price, pack.currency)} · ` : null}
                      valid {pack.expiresInDays} days
                    </span>
                  </Button>
                ))}
              </div>
              <p className="text-muted mt-2 text-xs leading-5">
                Packs top up AI credits only. They don&apos;t lift the document limit or unlock Pro
                features.
              </p>
            </div>
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
            <FileClock className="h-4 w-4" /> Billing activity
          </h2>
          <div className="border-border mt-4 divide-y border-y">
            {history.length ? (
              history.map((item) => (
                <div className="flex items-center justify-between gap-4 py-3 text-sm" key={item.id}>
                  <span className="font-semibold">
                    {historyLabel(item.type)}
                    {item.productName ? ` · ${item.productName}` : ""}
                  </span>
                  <span className="text-muted flex shrink-0 gap-3">
                    {item.amountCents !== null && item.currency ? (
                      <span className="text-foreground font-bold">
                        {formatCents(item.amountCents, item.currency)}
                      </span>
                    ) : null}
                    <LocalDate value={item.processedAt ?? item.createdAt} />
                  </span>
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
          <div className="bg-accent/10 text-accent flex h-12 w-12 items-center justify-center rounded-full">
            <LockKeyhole size={20} />
          </div>
          <h2 className="text-foreground mt-4 text-base font-extrabold">
            Sign in to view subscriptions
          </h2>
          <p className="text-muted-foreground mt-1.5 max-w-sm text-xs leading-5">
            Sign in or create an account to view subscription plans, purchase credits, and manage
            billing history.
          </p>
          <button
            onClick={() => {
              router.push(`/login?callbackURL=${encodeURIComponent(window.location.href)}`);
            }}
            className="bg-accent text-accent-foreground hover:bg-accent/90 mt-5 inline-flex min-h-10 items-center justify-center rounded-lg px-5 text-xs font-bold transition"
          >
            Sign in
          </button>
        </div>
      ) : null}
    </main>
  );
}

/**
 * The plan as the customer bought it. A pass and a credit pack create no subscription, so
 * neither gets a status or renewal line; a recurring plan shows when it renews or, once
 * cancelled, when access ends. During a failed renewal the plan is named from the
 * subscription, because its grants (and so `access.tier`) may already be gone.
 */
function PlanDetails({ billing, inDunning }: { billing: BillingSummary; inDunning: boolean }) {
  const { access } = billing;
  const recurringKey =
    access.tier === "ai_credits" || access.tier === "portfolio_pro" || access.tier === "bundle"
      ? access.tier
      : inDunning
        ? billing.productKey
        : null;

  if (recurringKey) {
    // Status, interval and period describe the most recently updated subscription, which can
    // be another product (a cancelled Creator Pro running out beside an active AI Credits).
    // They are shown only when that row is the plan named here; otherwise the date is when
    // this plan's own access runs to.
    const ownRow = billing.productKey === recurringKey;
    const status = ownRow ? STATUS_LABELS[billing.status] : undefined;
    const ending = billing.cancelAtPeriodEnd || billing.status === "CANCELED";
    const paidThrough =
      recurringKey === "ai_credits"
        ? access.aiCreditsEndsAt
        : (access.portfolioAccessEndsAt ?? access.aiCreditsEndsAt);

    return (
      <>
        <PlanName>
          {PLAN_NAMES[recurringKey]}
          {!ownRow
            ? ""
            : billing.interval === "ANNUAL"
              ? " · Annual"
              : billing.interval === "MONTHLY"
                ? " · Monthly"
                : ""}
        </PlanName>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {status ? <Detail icon={ShieldCheck} label="Status" value={status} /> : null}
          {!ownRow && paidThrough ? (
            <Detail
              icon={CalendarClock}
              label="Billing period"
              value={
                <>
                  {/* A plan support granted (an admin comp) was never paid for. */}
                  {access.isPaying ? "Paid through" : "Access until"}{" "}
                  <LocalDate value={paidThrough} />
                </>
              }
            />
          ) : null}
          {ownRow && billing.currentPeriodEnd && !inDunning ? (
            <Detail
              icon={CalendarClock}
              label="Billing period"
              value={
                <>
                  {ending ? "Access ends" : "Renews"} <LocalDate value={billing.currentPeriodEnd} />
                </>
              }
            />
          ) : null}
        </div>
        <Included entitlements={billing.entitlements} />
      </>
    );
  }

  if (access.tier === "pass") {
    return (
      <>
        <PlanName>Job Hunter pass</PlanName>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Detail
            icon={CalendarClock}
            label="One-time pass"
            value={
              access.passEndsAt ? (
                <>
                  Pass active until <LocalDate value={access.passEndsAt} />
                </>
              ) : (
                "Pass active"
              )
            }
          />
        </div>
        <Included entitlements={billing.entitlements} />
      </>
    );
  }

  if (access.tier === "credits") {
    return (
      <>
        <PlanName>Credits customer</PlanName>
        <p className="text-muted mt-2 text-sm">
          {billing.credits.available} credits available for every AI feature. Documents stay on one
          of each type; a subscription or pass removes that limit.
        </p>
      </>
    );
  }

  return (
    <>
      <PlanName>Free</PlanName>
      <p className="text-muted mt-2 text-sm">
        One document of each type. AI features run on credits.
      </p>
    </>
  );
}

function PlanName({ children }: { children: ReactNode }) {
  return <p className="mt-5 text-3xl font-black">{children}</p>;
}

function Included({ entitlements }: { entitlements: string[] }) {
  if (!entitlements.length) return null;

  return (
    <div className="border-border mt-5 border-t pt-5">
      <p className="text-muted text-xs font-bold">Included</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="bg-background border-border rounded-lg border px-2.5 py-1.5 text-xs font-bold">
          Unlimited documents
        </span>
        {entitlements.map((item) => (
          <span
            className="bg-background border-border rounded-lg border px-2.5 py-1.5 text-xs font-bold"
            key={item}
          >
            {ENTITLEMENT_LABELS[item] ?? item.replaceAll("_", " ")}
          </span>
        ))}
      </div>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="bg-background rounded-xl p-4">
      <Icon className="text-accent h-4 w-4" />
      <p className="text-muted mt-3 text-xs font-bold">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}
