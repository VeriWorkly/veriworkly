import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { siteConfig } from "@/config/site";
import { sessionExpiredPath } from "@/lib/auth-redirect";
import { hasSessionCookie } from "@/lib/server-fetch";
import { getBillingServerData } from "@/features/billing/billing-server";
import { resolveCheckoutRequest } from "@/features/billing/checkout-rules";
import type { BillingSummary } from "@/features/billing/types";

import { CheckoutRedirect } from "./checkout-redirect";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ productKey?: string; interval?: string }>;
}) {
  const params = await searchParams;

  // The catalog (names, prices) comes with the account's billing summary; a guest signs in first.
  const billing = await getBillingServerData<BillingSummary>("/billing/me");

  if (!billing) {
    const query = new URLSearchParams(
      Object.entries(params).filter((entry): entry is [string, string] => !!entry[1]),
    );
    const checkout = `/checkout?${query}`;

    // A cookie the API rejected: /login would bounce it straight back here, so clear it first.
    if (await hasSessionCookie()) redirect(sessionExpiredPath(checkout));

    redirect(`/login?callbackURL=${encodeURIComponent(checkout)}`);
  }

  const request = resolveCheckoutRequest(params, billing.catalog);

  if (!request.ok) {
    return (
      <main className="bg-background grid min-h-dvh place-items-center p-5">
        <section className="border-border bg-card w-full max-w-lg rounded-3xl border p-7 text-center shadow-sm sm:p-10">
          <h1 className="text-2xl font-black tracking-tight">Checkout link not recognised</h1>
          <p className="text-muted mt-3 text-sm leading-6">
            {request.reason} Choose a plan on the pricing page to start again.
          </p>
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

  return (
    <CheckoutRedirect
      productKey={request.productKey}
      interval={request.interval}
      productName={request.productName}
      priceLabel={request.priceLabel}
    />
  );
}
