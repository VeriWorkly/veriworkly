"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, LoaderCircle, RotateCw, ShieldCheck } from "lucide-react";
import { Button } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";
import { beginCheckout, cancelCheckout, openBillingPortal } from "@/features/billing/billing-api";
import type { ProductKey } from "@/features/billing/types";
import {
  type CheckoutFailure,
  type CheckoutInterval,
  describeCheckoutCancelError,
  describeCheckoutError,
  PLAN_NAMES,
} from "@/features/billing/checkout-rules";
import { recordPurchaseBaseline } from "@/features/billing/purchase-baseline";
import { UpgradeToBundle } from "@/features/billing/UpgradeToBundle";

export function CheckoutRedirect({
  productKey,
  interval,
  productName,
  priceLabel,
}: {
  productKey: ProductKey;
  interval: CheckoutInterval;
  productName: string;
  priceLabel: string;
}) {
  const [error, setError] = useState<CheckoutFailure | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [resetting, setResetting] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([beginCheckout(productKey, interval), recordPurchaseBaseline(productKey)])
      .then(([{ url }]) => {
        if (active) window.location.assign(url);
      })
      .catch((cause) => {
        if (active) setError(describeCheckoutError(cause, "Could not start checkout."));
      });

    return () => {
      active = false;
    };
  }, [attempt, interval, productKey]);

  const openPortal = async () => {
    setOpeningPortal(true);
    try {
      window.location.assign((await openBillingPortal()).url);
    } catch (cause) {
      setError({
        kind: "other",
        message: cause instanceof Error ? cause.message : "Could not open the billing portal.",
      });
      setOpeningPortal(false);
    }
  };

  const retry = () => {
    setError(null);
    setAttempt((value) => value + 1);
  };

  return (
    <main className="bg-background grid min-h-dvh place-items-center p-5">
      <section className="border-border bg-card w-full max-w-lg rounded-3xl border p-7 text-center shadow-sm sm:p-10">
        {error?.kind === "payments-closed" ? (
          <>
            <div className="bg-accent/10 text-accent mx-auto grid size-12 place-items-center rounded-full">
              <Clock className="size-5" />
            </div>
            <h1 className="mt-6 text-2xl font-black tracking-tight">Payments open soon</h1>
            <p className="text-muted mt-3 text-sm leading-6">
              {productName} ({priceLabel}) is not on sale yet. Nothing has been charged.
            </p>
          </>
        ) : error?.kind === "already-have" ? (
          <>
            <h1 className="text-2xl font-black tracking-tight">You already have this</h1>
            <p className="text-muted mt-3 text-sm leading-6">{error.message}</p>
            <Button asChild className="mt-7 w-full">
              <Link href="/billing">Open billing</Link>
            </Button>
          </>
        ) : error?.kind === "upgrade" ? (
          <>
            <h1 className="text-2xl font-black tracking-tight">
              Upgrade to the {PLAN_NAMES[error.upgrade.productKey]}
            </h1>
            <p className="text-muted mt-3 text-sm leading-6">{error.message}</p>
            <UpgradeToBundle upgrade={error.upgrade} className="mt-7 w-full" />
            <Button asChild variant="secondary" className="mt-2 w-full">
              <Link href="/billing">Open billing</Link>
            </Button>
          </>
        ) : error?.kind === "manage-billing" || error?.kind === "overlap" ? (
          <>
            <h1 className="text-2xl font-black tracking-tight">
              {error.kind === "overlap" && error.suggestedProductKey
                ? `Switch to the ${PLAN_NAMES[error.suggestedProductKey]}`
                : "Nothing was charged"}
            </h1>
            <p className="text-muted mt-3 text-sm leading-6">{error.message}</p>
            <Button
              className="mt-7 w-full"
              loading={openingPortal}
              onClick={() => void openPortal()}
            >
              Manage billing
            </Button>
            <Button asChild variant="secondary" className="mt-2 w-full">
              <Link href="/billing">Open billing</Link>
            </Button>
          </>
        ) : error ? (
          <>
            <div className="bg-destructive/10 text-destructive mx-auto grid size-12 place-items-center rounded-full">
              <RotateCw className="size-5" />
            </div>
            <h1 className="mt-6 text-2xl font-black tracking-tight">Checkout could not start</h1>
            <p className="text-muted mt-3 text-sm leading-6">{error.message}</p>
            {error.kind === "checkout-locked" ? (
              <Button
                className="mt-7 w-full"
                loading={resetting}
                onClick={async () => {
                  setResetting(true);
                  try {
                    await cancelCheckout();
                    retry();
                  } catch (cause) {
                    const failure = describeCheckoutError(
                      cause,
                      "Could not cancel the earlier checkout.",
                    );
                    // A refused cancel says why (a payment mid 3-D Secure is kept up to an hour).
                    setError(
                      failure.kind === "other"
                        ? {
                            kind: "other",
                            message: describeCheckoutCancelError(
                              cause,
                              "Could not cancel the earlier checkout.",
                            ),
                          }
                        : failure,
                    );
                  } finally {
                    setResetting(false);
                  }
                }}
              >
                Cancel the earlier checkout and try again
              </Button>
            ) : (
              <Button className="mt-7 w-full" onClick={retry}>
                Try secure checkout again
              </Button>
            )}
          </>
        ) : (
          <>
            <LoaderCircle className="text-accent mx-auto size-10 animate-spin" />
            <h1 className="mt-6 text-2xl font-black tracking-tight">Opening secure checkout</h1>
            <p className="mt-3 text-sm font-bold">
              {productName} · {priceLabel}
            </p>
            <p className="text-muted mt-2 text-sm leading-6">
              Your account is ready. We are redirecting you to Dodo Payments to complete the
              purchase.
            </p>
            <p className="mt-6 flex items-center justify-center gap-2 text-xs font-bold">
              <ShieldCheck className="text-accent size-4" /> Payment details stay with Dodo Payments
            </p>
          </>
        )}
        <Link
          className="text-muted hover:text-foreground mt-7 inline-flex items-center gap-2 text-xs font-bold"
          href={`${siteConfig.links.main}/pricing`}
        >
          <ArrowLeft className="size-3.5" /> Back to pricing
        </Link>
      </section>
    </main>
  );
}
