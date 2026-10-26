"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Info,
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
import { RequirementsPanel } from "./RequirementsPanel";
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

/** Score and parsed record come from one deterministic pass, so switching views never spends a second scan from the quota. */
export function FullResults({ report, quota }: { report: AtsFullReport; quota: AtsQuota }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("score");
  const categories = groupByCategory(report.rules);
  const rankedFixes = [...report.failedChecks].sort((a, b) => b.scoreImpact - a.scoreImpact);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted text-base">
          {report.wordCount.toLocaleString()} words analysed &middot; nothing stored
        </p>
        <CopyReportButton report={report} />
      </div>

      {report.parsingWarnings.length ? (
        <ul className="bg-warning/10 space-y-2 rounded-2xl p-5">
          {report.parsingWarnings.map((warning) => (
            <li key={warning} className="flex items-start gap-3 text-base leading-7">
              <TriangleAlert className="text-warning mt-1.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {warning}
            </li>
          ))}
        </ul>
      ) : null}

      <div role="tablist" aria-label="Report views" className="bg-card flex gap-1 rounded-full p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`ats-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`ats-panel-${id}`}
            onClick={() => setTab(id)}
            className={`focus-visible:ring-accent/40 inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none sm:text-base ${
              tab === id ? "bg-foreground text-background" : "text-muted hover:text-foreground"
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
          <section aria-labelledby="ats-fixes-heading" className="bg-card rounded-3xl p-6 sm:p-8">
            <h2 id="ats-fixes-heading" className="text-xl font-bold tracking-tight">
              Fix these first
            </h2>
            <p className="text-muted mt-1 text-base leading-7">
              Ordered by how much readiness score each one returns.
            </p>
            <ol className="mt-5 space-y-4">
              {rankedFixes.map((rule, index) => (
                <li
                  key={rule.id}
                  className="border-border border-t pt-4 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-start gap-3">
                    <span className="bg-accent/10 text-accent mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-base leading-7 font-medium">{rule.fix}</p>
                      <p className="text-muted mt-1 text-base leading-7">{rule.evidence}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <SeverityChip severity={rule.severity} />
                        {rule.scoreImpact > 0 ? (
                          <span className="bg-background rounded-full px-3 py-1 text-sm font-semibold tabular-nums">
                            +{Math.round(rule.scoreImpact)} pts if fixed
                          </span>
                        ) : null}
                        <span className="text-muted text-sm">
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
          <section className="bg-success/10 flex items-start gap-3 rounded-3xl p-6 sm:p-8">
            <CheckCircle2 className="text-success mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="text-base leading-7">
              Every deterministic check passed. Remaining gains come from the wording itself: add a
              job description above to see how well this resume covers a specific role.
            </p>
          </section>
        )}

        <RequirementsPanel requirements={report.requirements} />

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
              items={report.missingKeywordGroups.hard}
              tone="warn"
              emptyText="Nothing significant is missing from this description."
            />
            {report.missingKeywordGroups.soft.length ? (
              <p className="text-muted text-base leading-7 sm:col-span-2">
                <span className="text-foreground font-medium">
                  Soft skills the description mentions:
                </span>{" "}
                {report.missingKeywordGroups.soft.join(", ")}. They weigh less in the match: a
                resume shows them through what you did, not by naming them.
              </p>
            ) : null}
          </div>
        ) : null}

        {report.strengths.length ? (
          <section
            aria-labelledby="ats-strengths-heading"
            className="bg-card rounded-3xl p-6 sm:p-8"
          >
            <h2 id="ats-strengths-heading" className="text-xl font-bold tracking-tight">
              What already works
            </h2>
            <ul className="mt-4 space-y-2.5">
              {report.strengths.map((strength) => (
                <li
                  key={strength}
                  className="text-muted flex items-start gap-3 text-base leading-7"
                >
                  <CheckCircle2
                    className="text-success mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  {strength}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {report.advice.length ? (
          <section aria-labelledby="ats-advice-heading" className="bg-card rounded-3xl p-6 sm:p-8">
            <h2 id="ats-advice-heading" className="text-xl font-bold tracking-tight">
              Worth knowing
            </h2>
            <p className="text-muted mt-1 text-sm leading-6">
              Not scored: none of this changes a number above.
            </p>
            <ul className="mt-4 space-y-3">
              {report.advice.map((item) => (
                <li key={item.id} className="text-muted flex items-start gap-3 text-base leading-7">
                  <Info className="text-accent mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    {item.message}
                    {item.fix ? (
                      <span className="text-muted mt-0.5 block text-sm">{item.fix}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <details className="group bg-card rounded-3xl">
          <summary className="focus-visible:ring-accent/40 flex cursor-pointer list-none items-center justify-between gap-4 rounded-3xl p-6 text-xl font-bold tracking-tight focus-visible:ring-2 focus-visible:outline-none sm:p-8">
            Every check, one by one
            <span className="text-muted text-sm font-medium tracking-normal group-open:hidden">
              Show all {report.checksTotal}
            </span>
            <span className="text-muted hidden text-sm font-medium tracking-normal group-open:inline">
              Hide
            </span>
          </summary>
          <div className="space-y-8 px-6 pb-6 sm:px-8 sm:pb-8">
            {categories.map(({ category, items }) => {
              const meta = categoryMeta(category);
              return (
                <div key={category}>
                  <div className="mb-3 flex items-center gap-2 text-base font-semibold">
                    <meta.icon className="text-muted h-4 w-4" aria-hidden="true" /> {meta.label}
                  </div>
                  <ul className="space-y-2.5">
                    {items.map((rule) => (
                      <li key={rule.id} className="flex items-start gap-3 text-base leading-7">
                        <RuleIcon rule={rule} />
                        <span className="text-muted">
                          {rule.evidence}
                          {!rule.passed ? (
                            <span className="text-muted mt-0.5 block text-sm">{rule.fix}</span>
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
        <section className="bg-accent/10 rounded-3xl p-6 sm:p-8">
          <h2 className="text-accent flex items-center gap-2 text-xl font-bold tracking-tight">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Your AI credits cover AI analysis
          </h2>
          <p className="text-muted mt-2 text-base leading-7">
            Run this resume through the AI layer in Studio for missing-evidence detection and an
            explained, impact-ranked edit list on top of the rules above.
          </p>
          <Link
            href={`${siteConfig.links.app}/ats`}
            className="bg-accent text-accent-foreground focus-visible:ring-accent/40 mt-5 inline-flex h-12 items-center justify-center rounded-full px-6 text-base font-semibold transition-opacity duration-200 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97]"
          >
            Open the AI analysis in Studio
          </Link>
        </section>
      ) : (
        <section className="bg-foreground text-background rounded-3xl p-6 sm:p-8">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Sparkles className="h-5 w-5" aria-hidden="true" /> Want the reasoning behind every fix?
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-7 opacity-80">
            AI analysis reads the resume itself: it names the evidence a hiring manager expects to
            see and cannot find, and ranks edits by hiring impact rather than score impact. It runs
            on AI credits: a pack from $2.99, a pass or a plan.
          </p>
          <Link
            href={`${siteConfig.links.main}/pricing`}
            className="bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-accent mt-5 inline-flex h-12 items-center justify-center rounded-full px-6 text-base font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97]"
          >
            See AI credit options
          </Link>
        </section>
      )}
    </div>
  );
}

function RuleIcon({ rule }: { rule: AtsRuleResult }) {
  if (rule.passed)
    return <CheckCircle2 className="text-success mt-0.5 h-4 w-4 shrink-0" aria-label="Passed" />;
  if (rule.severity === "error")
    return <XCircle className="text-destructive mt-0.5 h-4 w-4 shrink-0" aria-label="Failed" />;
  return (
    <AlertCircle className="text-warning mt-0.5 h-4 w-4 shrink-0" aria-label="Needs attention" />
  );
}

const SEVERITY_COPY = {
  error: { label: "Blocking", className: "bg-destructive/10 text-destructive" },
  warning: { label: "Risky", className: "bg-warning/10 text-warning" },
  info: {
    label: "Polish",
    className: "bg-background text-muted",
  },
} as const;

function SeverityChip({ severity }: { severity: AtsRuleResult["severity"] }) {
  const { label, className } = SEVERITY_COPY[severity];
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${className}`}>{label}</span>
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
    <section className="bg-card rounded-3xl p-6 sm:p-8">
      <h3 className="flex items-center gap-2 text-xl font-bold tracking-tight">
        {tone === "good" ? (
          <CheckCircle2 className="text-success h-4 w-4" aria-hidden="true" />
        ) : (
          <TriangleAlert className="text-warning h-4 w-4" aria-hidden="true" />
        )}
        {title}
        <span className="text-muted ml-auto text-base font-medium tracking-normal tabular-nums">
          {items.length}
        </span>
      </h3>
      <p className="text-muted mt-1 text-sm leading-6">{description}</p>
      {items.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={item}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                tone === "good" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              }`}
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted mt-3 text-base">{emptyText}</p>
      )}
    </section>
  );
}

export default FullResults;
