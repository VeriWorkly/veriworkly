"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, RotateCw, ShieldCheck } from "lucide-react";
import { Button } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";
import { beginCheckout, cancelCheckout } from "@/features/billing/billing-api";
import type { BillingCycle, ProductKey } from "@/features/billing/types";

type CheckoutInterval = BillingCycle | "one_day" | "seven_day";

export function CheckoutRedirect({
  productKey,
  interval,
}: {
  productKey: string;
  interval: string;
}) {
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let active = true;

    beginCheckout(productKey as ProductKey, interval as CheckoutInterval)
      .then(({ url }) => {
        if (active) window.location.assign(url);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not start checkout.");
      });

    return () => {
      active = false;
    };
  }, [attempt, interval, productKey]);

  return (
    <main className="bg-background grid min-h-dvh place-items-center p-5">
      <section className="border-border bg-card w-full max-w-lg rounded-3xl border p-7 text-center shadow-sm sm:p-10">
        {error ? (
          <>
            <div className="bg-destructive/10 text-destructive mx-auto grid size-12 place-items-center rounded-full">
              <RotateCw className="size-5" />
            </div>
            <h1 className="mt-6 text-2xl font-black tracking-tight">Checkout could not start</h1>
            <p className="text-muted mt-3 text-sm leading-6">{error}</p>
            {error.includes("checkout is already active") ? (
              <Button
                className="mt-7 w-full"
                loading={resetting}
                onClick={async () => {
                  setResetting(true);
                  try {
                    await cancelCheckout();
                    setError("");
                    setAttempt((value) => value + 1);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Could not reset checkout lock.");
                  } finally {
                    setResetting(false);
                  }
                }}
              >
                Reset active lock & try again
              </Button>
            ) : (
              <Button
                className="mt-7 w-full"
                onClick={() => {
                  setError("");
                  setAttempt((value) => value + 1);
                }}
              >
                Try secure checkout again
              </Button>
            )}
          </>
        ) : (
          <>
            <LoaderCircle className="text-accent mx-auto size-10 animate-spin" />
            <h1 className="mt-6 text-2xl font-black tracking-tight">Opening secure checkout</h1>
            <p className="text-muted mt-3 text-sm leading-6">
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
