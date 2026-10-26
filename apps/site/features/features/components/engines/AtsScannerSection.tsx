import Link from "next/link";
import { AlertTriangle, ArrowRight, Check } from "lucide-react";

import { PageSection, TYPE } from "@/components/marketing/PageLayout";

const CHECKS = [
  { label: "Core hard skills: React, TypeScript, Next.js", result: "All found", ok: true },
  { label: "Standard section headings", result: "Pass", ok: true },
  { label: "Layout and font parsing", result: "Single column, safe", ok: true },
  { label: "Missing keyword: CI/CD pipeline automation", result: "Add if true", ok: false },
];

const AUDITS = [
  {
    title: "Keyword gaps",
    detail:
      "The phrases, tools and certifications the posting mentions that your draft does not, so you can add the experience you really have.",
  },
  {
    title: "Parser-safe templates",
    detail:
      "Every template uses a standard hierarchy, readable text and clean section breaks, so parsers keep your dates and employers intact.",
  },
  {
    title: "Weak verbs",
    detail:
      "Duty openers such as “Responsible for” or “Worked on” are flagged, with a fix that leads with what you did.",
  },
];

const QUOTAS = [
  { count: "2", unit: "scans every 24 hours", who: "With a free account" },
  { count: "300", unit: "scans a month", who: "With any AI credits" },
];

const ScoreFigure = () => (
  <figure>
    <div data-ui className="bg-card rounded-3xl p-6 sm:p-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-muted text-sm font-semibold">Match against</p>
          <p className="mt-1 text-lg font-semibold">Senior Frontend Developer</p>
        </div>
        <p className="text-success text-3xl font-bold tracking-tighter tabular-nums">
          94<span className="text-muted ml-1 text-base font-medium tracking-normal">/100</span>
        </p>
      </div>

      <div
        className="bg-background mt-6 h-2.5 overflow-hidden rounded-full"
        role="img"
        aria-label="Score 94 out of 100"
      >
        <div className="bg-success h-full w-[94%] rounded-full" />
      </div>

      <ul className="mt-6 space-y-2">
        {CHECKS.map((check) => (
          <li
            key={check.label}
            className={`flex items-start justify-between gap-4 rounded-2xl px-4 py-3.5 ${
              check.ok ? "bg-background" : "bg-warning/10"
            }`}
          >
            <span className="flex items-start gap-2.5 text-base">
              {check.ok ? (
                <Check aria-hidden="true" className="text-success mt-1 size-4 shrink-0" />
              ) : (
                <AlertTriangle aria-hidden="true" className="text-warning mt-1 size-4 shrink-0" />
              )}
              {check.label}
            </span>
            <span
              className={`shrink-0 text-sm font-semibold ${check.ok ? "text-success" : "text-warning"}`}
            >
              {check.result}
            </span>
          </li>
        ))}
      </ul>
    </div>
    <figcaption className="text-muted mt-4 text-sm">Sample report.</figcaption>
  </figure>
);

export const AtsScannerSection = () => (
  <PageSection
    id="ats"
    title="Score it against the real job."
    lede="Check that your resume parses cleanly in applicant tracking systems and carries the keywords the posting asks for, before a recruiter ever sees it."
  >
    <div className="grid gap-12 lg:grid-cols-[1.1fr_.9fr] lg:items-start">
      <div className="reveal min-w-0">
        <ScoreFigure />
      </div>

      <div className="space-y-10">
        {AUDITS.map((audit) => (
          <div key={audit.title} className="reveal">
            <h3 className={TYPE.title}>{audit.title}</h3>
            <p className="text-muted mt-2 text-base leading-7 text-pretty">{audit.detail}</p>
          </div>
        ))}

        <Link
          href="/ats-checker"
          className="reveal group text-accent inline-flex min-h-11 items-center gap-2 text-base font-semibold"
        >
          Try the ATS Checker
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform duration-200 group-hover:translate-x-1"
          />
        </Link>
      </div>
    </div>

    <div className="reveal mt-16">
      <h3 className={`${TYPE.title} text-balance`}>Free to score, within a fair-use quota.</h3>
      <dl className="mt-6 grid gap-x-10 sm:grid-cols-2 lg:max-w-3xl">
        {QUOTAS.map((quota) => (
          <div
            key={quota.who}
            className="border-border flex items-baseline gap-5 border-t py-5 sm:flex-col sm:items-start sm:gap-3 sm:py-6"
          >
            <dt className="order-last text-base leading-7">
              <span className="block font-semibold">{quota.unit}</span>
              <span className="text-muted block">{quota.who}</span>
            </dt>
            <dd className={`${TYPE.figure} w-20 shrink-0 sm:w-auto`}>{quota.count}</dd>
          </div>
        ))}
      </dl>
    </div>
  </PageSection>
);

export default AtsScannerSection;
