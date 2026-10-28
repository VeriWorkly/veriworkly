import { DollarSign, MousePointerClick, Trophy, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@veriworkly/ui";

import { AffiliateNav } from "@/features/affiliate/AffiliateNav";
import { EnrollButton } from "@/features/affiliate/EnrollButton";
import { CopyReferralLinkButton } from "@/features/affiliate/CopyReferralLinkButton";
import type { AffiliateDashboard } from "@/features/affiliate/types";
import { formatCents } from "@/features/admin/utils/admin-format";

export function AffiliatePage({ dashboard }: { dashboard: AffiliateDashboard | null }) {
  if (!dashboard || dashboard.affiliateStatus === "NOT_ENROLLED")
    return (
      <main className="space-y-5">
        <AffiliateNav />
        <section className="border-border bg-card rounded-2xl border p-6">
          <Trophy className="text-accent h-6 w-6" />
          <h1 className="mt-4 text-3xl font-black">Affiliate program</h1>
          <p className="text-muted mt-3 max-w-2xl text-sm leading-6">
            Earn commission only when a referred user completes a paid VeriWorkly purchase. Signups
            alone do not generate earnings.
          </p>
          <EnrollButton />
        </section>
      </main>
    );

  const currentTier = dashboard.tiers.find((tier) => tier.key === dashboard.affiliateTier);
  const isPending = dashboard.affiliateStatus === "PENDING";
  const isSuspended = dashboard.affiliateStatus === "SUSPENDED";

  return (
    <main className="space-y-5">
      <AffiliateNav />
      <header className="border-border bg-card rounded-2xl border p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">Affiliate overview</h1>
            <p className="text-muted mt-2 text-sm">
              You earn after a referred account completes a successful paid purchase.
            </p>
          </div>
          {isPending ? (
            <div className="flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-amber-500">
              <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              <span className="text-xs font-bold tracking-wider uppercase">Account on hold</span>
            </div>
          ) : isSuspended ? (
            <div className="border-destructive/20 bg-destructive/10 text-destructive flex items-center gap-2 rounded-2xl border px-4 py-3">
              <div className="bg-destructive h-2 w-2 rounded-full" />
              <span className="text-xs font-bold tracking-wider uppercase">Account Suspended</span>
            </div>
          ) : (
            <CopyReferralLinkButton affiliateCode={dashboard.affiliateCode} />
          )}
        </div>
        {isSuspended && (
          <p className="text-destructive mt-4 text-sm leading-6">
            Your affiliate account has been suspended. Existing earnings remain visible below, but
            new referral clicks and payouts are disabled while your account is under review. Contact
            support if you believe this is a mistake.
          </p>
        )}
        {isPending && (
          <p className="text-muted mt-4 text-sm leading-6">
            Your affiliate account is on hold while our team reviews it. You&apos;ll be able to
            share your referral link and request payouts once it&apos;s active again.
          </p>
        )}
      </header>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={MousePointerClick} label="Link clicks" value={String(dashboard.clicks)} />
        <Metric icon={UserPlus} label="Referred signups" value={String(dashboard.totalReferrals)} />
        <Metric icon={Trophy} label="Paid conversions" value={String(dashboard.conversions)} />
        <Metric
          icon={DollarSign}
          label="Available earnings"
          value={formatCents(dashboard.wallet.availableCents)}
        />
      </section>
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="border-border bg-card rounded-2xl border p-5">
          <div className="flex justify-between gap-3">
            <div>
              <p className="text-muted text-xs font-bold">Current tier</p>
              <h2 className="mt-1 text-2xl font-black">
                {currentTier?.name ?? dashboard.affiliateTier}
              </h2>
            </div>
            <strong className="text-accent text-xl">{(currentTier?.rateBps ?? 0) / 100}%</strong>
          </div>
          <div className="bg-background mt-5 h-2 overflow-hidden rounded-full">
            <div
              className="bg-accent h-full rounded-full"
              style={{
                width: dashboard.tierProgress.nextTierConversions
                  ? `${Math.min(100, (dashboard.tierProgress.currentConversions / dashboard.tierProgress.nextTierConversions) * 100)}%`
                  : "100%",
              }}
            />
          </div>
          <p className="text-muted mt-3 text-xs">
            {dashboard.tierProgress.nextTierConversions
              ? dashboard.tierProgress.currentConversions >=
                dashboard.tierProgress.nextTierConversions
                ? `${dashboard.tierProgress.currentConversions} paid conversions: you have reached the next tier's count. A tier our team set holds until you reach a count you had not reached when it was set.`
                : `${dashboard.tierProgress.currentConversions} of ${dashboard.tierProgress.nextTierConversions} paid conversions toward the next tier. You move up automatically at ${dashboard.tierProgress.nextTierConversions} paid conversions; refunded purchases don't count.`
              : "Highest tier reached."}
          </p>
          <Link className="text-accent mt-4 inline-block text-sm font-bold" href="/affiliate/tiers">
            View tier perks
          </Link>
        </article>
        <article className="border-border bg-card rounded-2xl border p-5">
          <p className="text-muted text-xs font-bold">Wallet</p>
          <p className="mt-2 text-3xl font-black">{formatCents(dashboard.wallet.availableCents)}</p>
          <p className="text-muted mt-2 text-sm">
            {formatCents(dashboard.wallet.pendingCents)} pending review
          </p>
          <Button
            asChild={!isPending && !isSuspended}
            disabled={isPending || isSuspended}
            className="mt-5 w-full"
            variant="secondary"
          >
            {isPending || isSuspended ? (
              "Manage payouts"
            ) : (
              <Link href="/affiliate/payouts">Manage payouts</Link>
            )}
          </Button>
        </article>
      </section>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
}) {
  return (
    <article className="border-border bg-card rounded-2xl border p-4">
      <Icon className="text-accent h-4 w-4" />
      <p className="text-muted mt-3 text-xs font-bold">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </article>
  );
}
