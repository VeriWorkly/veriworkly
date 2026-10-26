import Link from "next/link";
import { Coins, History, TrendingDown, TrendingUp } from "lucide-react";

import type { CreditTransaction, CreditWallet } from "@/features/credits/types";
import type { BillingSummary } from "@/features/billing/types";
import type { AtsPricing } from "@/features/ats/types";
import { LocalDate } from "@/components/LocalDate";

/** The server keeps the newest entries only (`CREDIT_HISTORY_LIMIT`); there is no paging. */
const HISTORY_LIMIT = 50;

/** AI writing actions the apps offer, in the order the costs grid lists them. */
const AI_ACTION_LABELS: Record<string, string> = {
  rewrite_section: "AI section rewrite",
  generate_section: "AI section draft",
  generate_cover_letter: "AI cover letter",
  generate_portfolio_copy: "AI portfolio copy",
};

const ACTION_LABELS: Record<string, string> = {
  ...AI_ACTION_LABELS,
  rewrite_short_text: "AI short rewrite",
  tailor_resume_to_job: "AI job tailoring",
  generate_document: "AI document draft",
  ats_analysis: "ATS AI analysis",
  ats_parse_repair: "AI parse repair",
  ats_resume_conversion: "Resume conversion",
  linkedin_import: "LinkedIn import",
  admin_adjustment: "Adjustment",
};

/**
 * A grant, named by its server-minted request id, whose prefix says where the credits came from.
 * A plan allowance's reason names the product; passes are sold under the bundle, so a bundle
 * allowance is named for both. A support grant's reason is typed by an admin and never shown.
 */
function grantLabel(item: CreditTransaction) {
  const requestId = item.requestId ?? "";
  const reason = item.reason ?? "";

  if (requestId.startsWith("admin-credit:")) return "Credits added by support";
  if (requestId.startsWith("payment-credit:") && reason) return reason;
  if (requestId.startsWith("annual-credit:")) {
    const [, product, month] = reason.match(/^(.+) monthly credits \((month \d+ of \d+)\)$/) ?? [];
    return product ? `${product} annual plan credits, ${month}` : "Annual plan credits";
  }
  if (requestId.startsWith("subscription-credit:")) {
    const product = reason.endsWith(" credit allowance") ? reason.slice(0, -17) : "";
    if (product === "Job Hunter Bundle") return "Job Hunter Bundle or pass credits";
    return product ? `${product} plan credits` : "Plan credits";
  }
  return "Credits added";
}

/**
 * What a ledger row is, in product language. Free text an admin typed is never shown: it is
 * internal, so every unlabelled row reads as a plain adjustment.
 */
function entryLabel(item: CreditTransaction) {
  if (item.action && ACTION_LABELS[item.action]) return ACTION_LABELS[item.action];
  if (item.type === "EXPIRATION") return "Credits expired";
  if (item.type === "REFUND") return "Credits returned";
  return item.type === "GRANT" ? grantLabel(item) : "Adjustment";
}

function range({ min, max }: { min: number; max: number }) {
  return min === max ? `${min} credits` : `${min}–${max} credits`;
}

export function CreditUsagePage({
  wallet,
  history,
  economics,
  atsPricing,
}: {
  wallet: CreditWallet | null;
  history: CreditTransaction[];
  economics: BillingSummary["creditEconomics"] | null;
  atsPricing: AtsPricing | null;
}) {
  const aiCosts = Object.keys(AI_ACTION_LABELS).flatMap((action) => {
    const policy = economics?.actions[action];
    return policy
      ? [
          {
            label: AI_ACTION_LABELS[action],
            cost: `${policy.costs.standard} / ${policy.costs.expert} credits`,
            note: "Standard / Expert",
          },
        ]
      : [];
  });
  const atsCosts = atsPricing
    ? [
        {
          label: "ATS AI analysis",
          cost: range(atsPricing.analysisCredits),
          note: "By resume length",
        },
        {
          label: "ATS AI analysis with a job URL",
          cost: range(atsPricing.jobUrlAnalysisCredits),
          note: "Includes reading the job page",
        },
        ...(typeof atsPricing.parseRepairCredits === "number"
          ? [
              {
                label: "AI parse repair",
                cost: `${atsPricing.parseRepairCredits} credits`,
                note: "Only when you opt in and it runs",
              },
            ]
          : []),
        {
          label: "Resume conversion",
          cost: `${atsPricing.resumeConversionCredits} credits`,
          note: "Old resume to an editable draft",
        },
        // The server bills the import as the resume conversion it is (`profileImportService`).
        {
          label: "LinkedIn profile import",
          cost: `${atsPricing.resumeConversionCredits} credits`,
          note: "Profile to an editable resume",
        },
      ]
    : [];

  return (
    <main className="space-y-5">
      <header className="border-border bg-card rounded-2xl border p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-black">
              <Coins className="text-accent h-4 w-4" /> AI credits
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Credit usage</h1>
            <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
              One credit balance pays for every AI feature. Purchases, AI actions and expiries
              appear below with their cost and resulting balance.
            </p>
          </div>
          <Link
            className="bg-accent text-accent-foreground hover:bg-accent/90 inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-bold transition"
            href="/billing"
          >
            Buy credits
          </Link>
        </div>
      </header>
      <section className="grid gap-4 sm:grid-cols-3">
        <Metric icon={Coins} label="Available" value={wallet?.available ?? 0} />
        <Metric icon={TrendingUp} label="Lifetime credited" value={wallet?.lifetimeCredited ?? 0} />
        <Metric icon={TrendingDown} label="Spent or expired" value={wallet?.lifetimeDebited ?? 0} />
      </section>
      {wallet?.reserved || wallet?.nextExpiryCredits ? (
        <section className="border-border bg-card space-y-1 rounded-2xl border p-5 text-sm font-semibold">
          {wallet.nextExpiryCredits && wallet.nextExpiryAt ? (
            <p>
              {wallet.nextExpiryCredits} credits expire <LocalDate value={wallet.nextExpiryAt} />
            </p>
          ) : null}
          {wallet.reserved ? (
            <p className="text-muted">{wallet.reserved} credits held for an action in progress</p>
          ) : null}
        </section>
      ) : null}
      <section className="border-border bg-card rounded-2xl border p-5">
        <h2 className="font-black">What actions cost</h2>
        <p className="text-muted mt-2 max-w-3xl text-sm leading-6">
          Each action&apos;s cost is set by the server and charged when its result is delivered.
          Credits that expire soonest are spent first.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...aiCosts, ...atsCosts].map((item) => (
            <div className="bg-background rounded-xl p-4" key={item.label}>
              <p className="text-sm font-bold">{item.label}</p>
              <p className="text-accent mt-2 text-xl font-black">{item.cost}</p>
              <p className="text-muted mt-1 text-xs">{item.note}</p>
            </div>
          ))}
        </div>
        {atsPricing ? null : (
          <p className="text-muted mt-4 text-xs">
            ATS prices could not be loaded right now; the ATS page shows them before you run a scan.
          </p>
        )}
      </section>
      <section className="border-border bg-card rounded-2xl border p-5">
        <h2 className="flex items-center gap-2 font-black">
          <History className="h-4 w-4" /> Recent activity
        </h2>
        <p className="text-muted mt-1 text-xs">Your last {HISTORY_LIMIT} entries.</p>
        <div className="border-border mt-4 divide-y border-y">
          {history.length ? (
            history.map((item) => (
              <div
                className="grid gap-2 py-4 text-sm sm:grid-cols-[1fr_auto_auto] sm:items-center"
                key={item.id}
              >
                <div>
                  <p className="font-bold">{entryLabel(item)}</p>
                  <p className="text-muted mt-1 text-xs">
                    <LocalDate value={item.createdAt} withTime />
                  </p>
                </div>
                <p
                  className={
                    item.amount > 0 ? "font-black text-emerald-600" : "font-black text-rose-600"
                  }
                >
                  {item.amount > 0 ? "+" : ""}
                  {item.amount}
                </p>
                <p className="text-muted text-xs">Balance {item.balanceAfter}</p>
              </div>
            ))
          ) : (
            <p className="text-muted py-5 text-sm">
              No credit activity yet. Purchases and AI actions will appear here.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Coins;
  label: string;
  value: number;
}) {
  return (
    <article className="border-border bg-card rounded-2xl border p-5">
      <Icon className="text-accent h-4 w-4" />
      <p className="text-muted mt-4 text-xs font-bold">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </article>
  );
}
