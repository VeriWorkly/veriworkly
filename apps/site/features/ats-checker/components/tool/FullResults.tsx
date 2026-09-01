"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ScanEye,
  Sparkles,
  SlidersHorizontal,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import { siteConfig } from "@/config/site";
import { categoryMeta, sortByCategoryOrder } from "../../data/categories";
import type { AtsFullReport, AtsQuota, AtsRuleResult } from "../../types";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { CopyReportButton } from "./CopyReportButton";
import { ParsedView } from "./ParsedView";
import { ScoreSummary } from "./ScoreSummary";

function groupByCategory(rules: AtsRuleResult[]) {
  const groups = new Map<string, AtsRuleResult[]>();
  for (const rule of rules) {
    const list = groups.get(rule.category) ?? [];
    list.push(rule);
    groups.set(rule.category, list);
  }
  return sortByCategoryOrder(
    [...groups.entries()].map(([category, items]) => ({ category, items })),
  );
}

const TABS = [
  { id: "score", label: "Readiness & job match", icon: SlidersHorizontal },
  { id: "parsed", label: "What the ATS sees", icon: ScanEye },
] as const;

/**
 * Both halves of one scan.
 *
 * The score and the recovered record come from a single deterministic pass, so switching between
 * them costs nothing and — more to the point — never costs a second scan from the caller's quota.
 * They are separated here because they answer different questions: the first is how well the
 * resume reads, the second is what survives being turned into database rows.
 */
export function FullResults({ report, quota }: { report: AtsFullReport; quota: AtsQuota }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("score");
  const categories = groupByCategory(report.rules);
  const rankedFixes = [...report.failedChecks].sort((a, b) => b.scoreImpact - a.scoreImpact);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {report.wordCount.toLocaleString()} words analysed &middot; nothing stored
        </p>
        <CopyReportButton report={report} />
      </div>

      <div
        role="tablist"
        aria-label="Report views"
        className="flex gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-white/5"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`ats-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`ats-panel-${id}`}
            onClick={() => setTab(id)}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
              tab === id
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {tab === "parsed" ? (
        <div id="ats-panel-parsed" role="tabpanel" aria-labelledby="ats-tab-parsed">
          <ParsedView parsed={report.parsed} />
        </div>
      ) : null}

      <div
        id="ats-panel-score"
        role="tabpanel"
        aria-labelledby="ats-tab-score"
        hidden={tab !== "score"}
        className="space-y-4"
      >
        <ScoreSummary
          verdict={report.verdict}
          readinessScore={report.readinessScore}
          jobMatchScore={report.jobMatchScore}
          checksPassed={report.checksPassed}
          checksTotal={report.checksTotal}
        />

        <CategoryBreakdown categories={report.categories} />

        {rankedFixes.length ? (
          <section
            aria-labelledby="ats-fixes-heading"
            className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-white/2"
          >
            <h2
              id="ats-fixes-heading"
              className="text-sm font-semibold text-zinc-900 dark:text-white"
            >
              Fix these first
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Ordered by how much readiness score each one returns.
            </p>
            <ol className="mt-5 space-y-4">
              {rankedFixes.map((rule, index) => (
                <li
                  key={rule.id}
                  className="border-t border-zinc-100 pt-4 first:border-t-0 first:pt-0 dark:border-zinc-800/70"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 font-mono text-[11px] font-semibold text-blue-700 tabular-nums dark:text-blue-400">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-relaxed font-medium text-zinc-900 dark:text-white">
                        {rule.fix}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                        {rule.evidence}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <SeverityChip severity={rule.severity} />
                        {rule.scoreImpact > 0 ? (
                          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700 tabular-nums dark:bg-white/10 dark:text-zinc-200">
                            +{Math.round(rule.scoreImpact)} pts if fixed
                          </span>
                        ) : null}
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {categoryMeta(rule.category).label}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <section className="flex items-start gap-3 rounded-3xl border border-emerald-500/25 bg-emerald-500/5 p-6">
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
              Every deterministic check passed. Remaining gains come from the wording itself: add a
              job description above to see how well this resume covers a specific role.
            </p>
          </section>
        )}

        {report.jobMatchScore !== null ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <KeywordCard
              title="Matched keywords"
              description="Terms from the job description your resume already uses."
              items={report.matchedKeywords}
              tone="good"
              emptyText="No terms from the description appear in your resume yet."
            />
            <KeywordCard
              title="Missing keywords"
              description="Weighted toward terms under Requirements. Only add what is genuinely true."
              items={report.missingKeywords}
              tone="warn"
              emptyText="Nothing significant is missing from this description."
            />
          </div>
        ) : null}

        {report.strengths.length ? (
          <section
            aria-labelledby="ats-strengths-heading"
            className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-white/2"
          >
            <h2
              id="ats-strengths-heading"
              className="text-sm font-semibold text-zinc-900 dark:text-white"
            >
              What already works
            </h2>
            <ul className="mt-4 space-y-2.5">
              {report.strengths.map((strength) => (
                <li
                  key={strength}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300"
                >
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  {strength}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <details className="group rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-white/2">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-3xl p-6 text-sm font-semibold text-zinc-900 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:text-white">
            Every check, one by one
            <span className="text-xs font-medium text-zinc-500 group-open:hidden dark:text-zinc-400">
              Show all {report.checksTotal}
            </span>
            <span className="hidden text-xs font-medium text-zinc-500 group-open:inline dark:text-zinc-400">
              Hide
            </span>
          </summary>
          <div className="space-y-6 px-6 pb-6">
            {categories.map(({ category, items }) => {
              const meta = categoryMeta(category);
              return (
                <div key={category}>
                  <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    <meta.icon className="h-3.5 w-3.5" aria-hidden="true" /> {meta.label}
                  </div>
                  <ul className="space-y-2.5">
                    {items.map((rule) => (
                      <li key={rule.id} className="flex items-start gap-2.5 text-sm">
                        <RuleIcon rule={rule} />
                        <span className="text-zinc-600 dark:text-zinc-300">
                          {rule.evidence}
                          {!rule.passed ? (
                            <span className="mt-0.5 block text-zinc-500 dark:text-zinc-400">
                              {rule.fix}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </details>
      </div>

      {quota.tier === "subscriber" ? (
        <section className="rounded-3xl border border-blue-500/20 bg-blue-500/5 p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Your plan includes AI analysis
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Run this resume through the AI layer in Studio for missing-evidence detection and an
            explained, impact-ranked edit list on top of the rules above.
          </p>
          <Link
            href={`${siteConfig.links.app}/ats`}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-black"
          >
            Open the AI analysis in Studio
          </Link>
        </section>
      ) : (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-white dark:border-white/10">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-blue-400" aria-hidden="true" /> Want the reasoning
            behind every fix?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            AI analysis reads the resume itself: it names the evidence a hiring manager expects to
            see and cannot find, and ranks edits by hiring impact rather than score impact. Part of
            the AI plan, from $5.99/mo.
          </p>
          <Link
            href={`${siteConfig.links.main}/pricing`}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:bg-blue-500 hover:text-white focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none"
          >
            See AI plans
          </Link>
        </section>
      )}
    </div>
  );
}

function RuleIcon({ rule }: { rule: AtsRuleResult }) {
  if (rule.passed)
    return (
      <CheckCircle2
        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
        aria-label="Passed"
      />
    );
  if (rule.severity === "error")
    return (
      <XCircle
        className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
        aria-label="Failed"
      />
    );
  return (
    <AlertCircle
      className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
      aria-label="Needs attention"
    />
  );
}

const SEVERITY_COPY = {
  error: { label: "Blocking", className: "bg-red-500/10 text-red-700 dark:text-red-400" },
  warning: { label: "Risky", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  info: {
    label: "Polish",
    className: "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-200",
  },
} as const;

function SeverityChip({ severity }: { severity: AtsRuleResult["severity"] }) {
  const { label, className } = SEVERITY_COPY[severity];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>{label}</span>
  );
}

function KeywordCard({
  title,
  description,
  items,
  tone,
  emptyText,
}: {
  title: string;
  description: string;
  items: string[];
  tone: "good" | "warn";
  emptyText: string;
}) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-white/2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
        {tone === "good" ? (
          <CheckCircle2
            className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
        ) : (
          <TriangleAlert
            className="h-4 w-4 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
        )}
        {title}
        <span className="ml-auto text-xs font-medium text-zinc-500 tabular-nums dark:text-zinc-400">
          {items.length}
        </span>
      </h3>
      <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{description}</p>
      {items.length ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <li
              key={item}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                tone === "good"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
              }`}
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{emptyText}</p>
      )}
    </section>
  );
}

export default FullResults;
