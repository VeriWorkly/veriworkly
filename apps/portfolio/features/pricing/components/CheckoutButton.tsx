"use client";

import React from "react";
import Link from "next/link";

import { siteConfig } from "@/config/site";

import { PAYMENTS_BLOCKED, type PlanKey } from "@/features/pricing/data/offers";
import { usePricingAccount } from "@/features/pricing/components/PricingAccount";

interface CheckoutButtonProps {
  children: React.ReactNode;
  className?: string;
  href: string;
  /** The subscription this buys; leave out for a pass. */
  plan?: PlanKey;
  /** Text colour for the notes under the button, to suit the card behind it. */
  noteClassName?: string;
  wrapperClassName?: string;
}

export const billingPortalHref = `${siteConfig.links.app}/billing`;

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition duration-300";

/**
 * A subscriber gets the studio billing page instead of a checkout the server would refuse with 409
 * (P-065). While checkout is closed the link still works (the studio checkout explains it and
 * lets the admin through), and the closure is said in visible text, not a tooltip (P-076).
 */
export function CheckoutButton({
  children,
  className = "",
  href,
  plan,
  noteClassName = "text-muted",
  wrapperClassName = "",
}: CheckoutButtonProps) {
  const { subscribedTo, onPass } = usePricingAccount();

  // The server refuses every purchase while a subscription or pass is live.
  if (subscribedTo || onPass) {
    const current = plan === subscribedTo;
    // The one in-place change (V-202): Creator Pro or AI Credits to the bundle, same period,
    // prorated. The studio billing page runs it; every other change is cancel, then rebuy.
    const upgrade = plan === "bundle" && subscribedTo !== null && subscribedTo !== "bundle";

    return (
      <span className={`flex flex-col items-center gap-2 text-center ${wrapperClassName}`}>
        {current ? (
          <span className={`${base} cursor-default ${className}`}>Your current plan</span>
        ) : null}
        <Link
          href={billingPortalHref}
          className={
            current
              ? `text-xs font-bold underline underline-offset-4 ${noteClassName}`
              : `${base} cursor-pointer hover:-translate-y-1 active:scale-[0.97] ${className}`
          }
        >
          {upgrade ? "Upgrade to the Bundle (pay the difference)" : "Manage billing"}
        </Link>
      </span>
    );
  }

  return (
    <span className={`flex flex-col items-center gap-2 text-center ${wrapperClassName}`}>
      <Link
        href={href}
        className={`${base} cursor-pointer hover:-translate-y-1 active:scale-[0.97] ${className}`}
      >
        {children}
      </Link>
      {PAYMENTS_BLOCKED ? (
        <span className={`text-xs font-semibold ${noteClassName}`}>Paid plans open soon</span>
      ) : null}
    </span>
  );
}
