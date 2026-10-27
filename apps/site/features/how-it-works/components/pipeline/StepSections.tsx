import type { ReactNode } from "react";
import { Check, Lock, Minus, Plus } from "lucide-react";

import { cn } from "@veriworkly/ui";

import { FRAME, TYPE } from "@/components/marketing/PageLayout";

import { WORKFLOW_STEPS } from "../../data";

const ProfileJson = () => (
  <div data-ui className="bg-foreground text-background overflow-hidden rounded-3xl">
    <p className="px-6 pt-5 text-sm font-semibold opacity-70 sm:px-8">master-profile.json</p>
    <pre className="relative overflow-x-auto px-6 pt-4 pb-7 text-sm leading-7 sm:px-8">
      <code>{`{
  "name": "Gautam Raj",
  "github": {
    "repositories": 12,
    "languages": ["TypeScript", "Python"]
  },
  "linkedin": {
    "roles": 4,
    "degrees": 2,
    "skills": 18
  },
  "storage": "this browser"
}`}</code>
    </pre>
  </div>
);

const StudioSettings = () => (
  <div data-ui className="bg-card rounded-3xl p-6 sm:p-8">
    <p className="text-base font-semibold">Layout</p>
    <dl className="mt-5 space-y-2">
      {[
        ["Typeface", "Geist"],
        ["Page margins", "24px"],
        ["Pages", "1"],
        ["Cover letter", "Matches this theme"],
      ].map(([term, value]) => (
        <div
          key={term}
          className="bg-background flex items-center justify-between gap-4 rounded-2xl px-5 py-4"
        >
          <dt className="text-muted text-base">{term}</dt>
          <dd className="text-base font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
    <p className="text-success mt-5 flex items-center gap-2 text-sm font-semibold">
      <Check aria-hidden="true" className="size-4" />
      Master Profile unchanged
    </p>
  </div>
);

const BulletDiff = () => (
  <div data-ui className="bg-background overflow-hidden rounded-3xl">
    <div className="p-6 sm:p-8">
      <p className="text-muted flex items-center gap-2 text-sm font-semibold">
        <Minus aria-hidden="true" className="text-destructive size-4" />
        Your draft
      </p>
      <p className="text-muted mt-3 text-lg leading-8 line-through decoration-1">
        Worked on microservices for data processing.
      </p>
    </div>
    <div className="bg-success/10 p-6 sm:p-8">
      <p className="text-success flex items-center gap-2 text-sm font-semibold">
        <Plus aria-hidden="true" className="size-4" />
        Suggestion
      </p>
      <p className="mt-3 text-lg leading-8 font-medium">
        Built six event-driven services that process 40,000 requests a second.
      </p>
    </div>
    <p className="text-muted px-6 py-4 text-sm sm:px-8">
      Sample edit. Accept it, change it or keep your own.
    </p>
  </div>
);

const ExportList = () => (
  <ul data-ui className="grid grid-cols-2 gap-2">
    {["PDF", "Word (.docx)", "Markdown", "HTML", "Plain text", "JSON"].map((format) => (
      <li
        key={format}
        className="bg-card flex items-center justify-between gap-3 rounded-2xl px-5 py-5"
      >
        <span className="text-lg font-semibold">{format}</span>
        <span className="text-success text-sm font-semibold">Free</span>
      </li>
    ))}
  </ul>
);

const PortfolioAddress = () => (
  <div data-ui className="bg-background overflow-hidden rounded-3xl">
    <div className="bg-card flex items-center gap-3 px-5 py-4">
      <span className="bg-background text-muted flex min-w-0 flex-1 items-center gap-2 rounded-full px-4 py-2 text-sm">
        <Lock aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">gautamraj.veriworkly.com</span>
      </span>
    </div>
    <div className="p-6 sm:p-8">
      <p className="text-3xl font-bold tracking-tighter">Gautam Raj</p>
      <p className="text-muted mt-2 text-base">Product designer. Case studies, projects, resume.</p>
      <p className="bg-warning/10 text-warning mt-8 inline-flex rounded-full px-4 py-2 text-sm font-semibold">
        Publishing opens at launch
      </p>
    </div>
  </div>
);

const FIGURES: Record<string, ReactNode> = {
  import: <ProfileJson />,
  draft: <StudioSettings />,
  tailor: <BulletDiff />,
  export: <ExportList />,
  publish: <PortfolioAddress />,
};

export const StepSections = () => (
  <>
    {WORKFLOW_STEPS.map((step, idx) => {
      const tinted = idx % 2 === 0;

      return (
        <section
          key={step.id}
          id={step.id}
          aria-labelledby={`${step.id}-title`}
          className={cn(
            "border-border scroll-mt-24 border-b py-20 lg:py-24",
            tinted ? "bg-card" : "bg-background",
          )}
        >
          <div className={cn(FRAME, "grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16")}>
            <div className="min-w-0">
              <h2 id={`${step.id}-title`} className={cn("reveal text-balance", TYPE.section)}>
                {step.title}
              </h2>
              <p className="reveal mt-5 text-lg leading-8 font-medium text-pretty">
                {step.subtitle}
              </p>
              <p className="reveal text-muted mt-3 max-w-xl text-base leading-7 text-pretty">
                {step.description}
              </p>

              <dl className="reveal mt-6 grid gap-x-8 sm:grid-cols-2">
                {step.points.map((point) => (
                  <div key={point.term} className="border-border border-t py-5">
                    <dt className="text-base font-bold">{point.term}</dt>
                    <dd className="text-muted mt-1.5 text-base leading-7 text-pretty">
                      {point.detail}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className={cn("reveal min-w-0", idx % 2 === 1 && "lg:order-first")}>
              {FIGURES[step.id]}
            </div>
          </div>
        </section>
      );
    })}
  </>
);

export default StepSections;
