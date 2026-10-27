import Link from "next/link";
import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";

import { cn } from "@veriworkly/ui";

import {
  FRAME,
  PageHero,
  PageSection,
  SectionHeading,
  TYPE,
} from "@/components/marketing/PageLayout";
import { LandingButton } from "@/components/marketing/LandingButton";
import type { FaqItem } from "@/features/faq/data/faqItems";

import {
  AUDIENCES,
  BENCHMARKS,
  CAPABILITIES,
  COMPARISON_COLUMNS,
  COMPARISON_ROWS,
  DETERMINISM_POINTS,
  ENGINE_LINKS,
  ENGINE_VERSION_LABEL,
  EXTRAS,
  HERO_FACTS,
  INSTALL_COMMAND,
  INTEGRITY_CHECKS,
  RUNTIMES,
} from "../data/content";
import { CodeTabs } from "./CodeTabs";
import { CopyCommand } from "./CopyCommand";
import { EngineDemo } from "./EngineDemo";

const inlineLink = "font-semibold underline underline-offset-4 hover:no-underline";

export function EngineHero() {
  return (
    <PageHero
      title="Open-source"
      highlight="ATS engine."
      lede="Reads a resume the way an applicant tracking system does, scores it with a published rubric and matches it to a job posting. Deterministic, and small enough to run in the browser."
      aside={
        <div className="space-y-6">
          <CopyCommand command={INSTALL_COMMAND} />
          <div className="flex flex-wrap gap-3">
            <LandingButton showArrow size="lg" variant="solid" href={ENGINE_LINKS.quickStart}>
              Read the docs
            </LandingButton>
            <LandingButton size="lg" variant="outline" href={ENGINE_LINKS.github} target="_blank">
              View on GitHub
            </LandingButton>
          </div>
        </div>
      }
    >
      <dl className="grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-[1fr_1fr_1.5fr_1fr]">
        {HERO_FACTS.map((fact) => (
          <div key={fact.label}>
            <dt className="text-muted text-base">{fact.label}</dt>
            <dd className={cn("mt-1 tabular-nums", TYPE.title)}>{fact.value}</dd>
          </div>
        ))}
      </dl>

      <div id="demo" className="mt-20 scroll-mt-28 lg:mt-28">
        <div className="mb-8 max-w-2xl">
          <h2 className={TYPE.title}>Score a sample resume, right here.</h2>
          <p className="text-muted mt-3 text-base leading-7 text-pretty">
            Version {ENGINE_VERSION_LABEL}, running in this tab. The resumes are invented and
            nothing is uploaded. Edit the posting and the match updates as you type.
          </p>
        </div>
        <EngineDemo />
      </div>
    </PageHero>
  );
}

export function EngineCapabilities() {
  return (
    <PageSection
      tone="card"
      title="Read. Recover. Score. Match."
      lede="An ATS does not rank a resume. It extracts the text, files it into fields recruiters search, and filters on them. The engine does the same, then tells you what got lost and how to fix it."
    >
      <dl className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {CAPABILITIES.map((item) => (
          <div key={item.title} className="reveal">
            <dt className={TYPE.title}>{item.title}</dt>
            <dd className="text-muted mt-3 text-base leading-7 text-pretty">{item.body}</dd>
          </div>
        ))}
      </dl>
    </PageSection>
  );
}

export function EngineDeterminism() {
  return (
    <PageSection
      tone="accent"
      title="No model in the score."
      lede={
        <>
          Each point a resume loses traces back to one rule, the evidence it found and the fix.{" "}
          <a href={ENGINE_LINKS.rubric} className={inlineLink}>
            Read the full rubric
          </a>
          .
        </>
      }
    >
      <dl className="grid gap-6 md:grid-cols-3">
        {DETERMINISM_POINTS.map((point) => (
          <div key={point.title} className="reveal rounded-3xl bg-current/7 p-7 lg:p-8">
            <dt className={TYPE.title}>{point.title}</dt>
            <dd className="mt-4 text-base leading-7 opacity-85">{point.body}</dd>
          </div>
        ))}
      </dl>
    </PageSection>
  );
}

export function EngineIntegrity() {
  return (
    <section className="border-border border-b py-20 lg:py-28">
      <div className={`${FRAME} grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-20`}>
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeading title="Built to catch the tricks." />
          <p className="reveal text-muted mt-6 max-w-md text-base leading-7">
            Tricks aimed at screening software come off the finished score as deductions. An honest
            resume never meets them: it scores exactly as if these rules did not exist.
          </p>
        </div>

        <dl>
          {INTEGRITY_CHECKS.map((check) => (
            <div
              key={check.title}
              className="reveal border-border grid gap-3 border-t py-8 first:border-t-0 first:pt-0 sm:grid-cols-[14rem_1fr] sm:gap-8"
            >
              <dt className={TYPE.title}>{check.title}</dt>
              <dd className="text-muted text-base leading-7">{check.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function EngineSurfaces() {
  return (
    <PageSection
      tone="card"
      title="One engine, four ways to run it."
      lede="A library, a CLI, a GitHub Action and an MCP server, all on one published rubric. The CLI, the Action and the MCP server attach the built-in language and region packs; attach them in the library too and you get the same scores."
    >
      <CodeTabs />
    </PageSection>
  );
}

export function EngineRuntimes() {
  return (
    <PageSection
      title="Import only what you use."
      lede="The core makes no network calls and has no file system access, so it runs wherever JavaScript does. Sizes are gzipped, for each entry point bundled on its own."
    >
      <div
        tabIndex={0}
        role="group"
        aria-label="Entry points and sizes, scrollable"
        className="bg-card focus-visible:ring-accent/40 reveal relative overflow-x-auto rounded-3xl focus-visible:ring-2 focus-visible:outline-none"
      >
        <table className="w-full min-w-xl text-left text-base">
          <thead>
            <tr className="text-muted text-sm">
              <th scope="col" className="px-6 pt-6 pb-3 font-semibold">
                Import
              </th>
              <th scope="col" className="px-6 pt-6 pb-3 font-semibold">
                What it holds
              </th>
              <th scope="col" className="px-6 pt-6 pb-3 font-semibold">
                Runs in
              </th>
              <th scope="col" className="px-6 pt-6 pb-3 text-right font-semibold">
                Size
              </th>
            </tr>
          </thead>
          <tbody>
            {RUNTIMES.map((row) => (
              <tr key={row.subpath} className="border-border border-t">
                <td className="px-6 py-4 font-mono text-sm">
                  <code>{row.subpath}</code>
                </td>
                <td className="text-muted px-6 py-4">{row.what}</td>
                <td className="text-muted px-6 py-4">{row.where}</td>
                <td className="px-6 py-4 text-right font-semibold whitespace-nowrap tabular-nums">
                  {row.size}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-16 grid gap-x-10 gap-y-12 md:grid-cols-3">
        {EXTRAS.map((item) => (
          <div key={item.title} className="reveal">
            <dt className={TYPE.title}>{item.title}</dt>
            <dd className="text-muted mt-3 text-base leading-7">{item.body}</dd>
          </div>
        ))}
      </dl>
    </PageSection>
  );
}

export function EngineBenchmarks() {
  return (
    <PageSection
      tone="card"
      title="Measured on every release."
      lede={
        <>
          Each release is checked against hand-written and generated resumes, in English as text,
          PDF, two-column PDF and DOCX, and in German, French, Hindi, Spanish and Portuguese as
          text, DOCX and PDF. All of them are invented, so read these as regression figures, not
          real-world accuracy. Engine {ENGINE_VERSION_LABEL}.{" "}
          <a href={ENGINE_LINKS.benchmarks} className={`text-accent ${inlineLink}`}>
            How they are measured
          </a>
          .
        </>
      }
    >
      <dl className="grid gap-x-6 gap-y-12 sm:grid-cols-3 lg:gap-x-10">
        {BENCHMARKS.map((benchmark) => (
          <div key={benchmark.label} className="reveal flex flex-col-reverse">
            <dt className="text-muted mt-4 max-w-56 text-base leading-6">{benchmark.label}</dt>
            <dd className={TYPE.figure}>{benchmark.value}</dd>
          </div>
        ))}
      </dl>
    </PageSection>
  );
}

export function EngineAudiences() {
  return (
    <PageSection
      title="For products that help people apply."
      lede="Anywhere a candidate wants to know how their resume reads before a recruiter sees it."
    >
      <ul className="grid gap-4 sm:grid-cols-2">
        {AUDIENCES.map((item) => (
          <li key={item.title} className="reveal bg-card rounded-3xl p-7 lg:p-8">
            <h3 className={TYPE.title}>{item.title}</h3>
            <p className="text-muted mt-3 max-w-md text-base leading-7">{item.body}</p>
          </li>
        ))}
      </ul>

      <aside className="reveal bg-warning/10 mt-4 grid gap-3 rounded-3xl p-7 lg:grid-cols-[14rem_1fr] lg:gap-8 lg:p-8">
        <h3 className={cn("text-warning", TYPE.title)}>Not for ranking applicants</h3>
        <p className="text-base leading-7">
          The engine is built for candidates checking their own resume. It is not designed or
          validated to screen, rank or filter people, which can bring legal duties under laws such
          as New York City&apos;s Local Law 144 and the EU AI Act.{" "}
          <a href={ENGINE_LINKS.responsibleUse} className={`text-accent ${inlineLink}`}>
            Responsible use
          </a>
          .
        </p>
      </aside>
    </PageSection>
  );
}

export function EngineComparison() {
  return (
    <PageSection
      tone="card"
      title="Open rules, not a hosted black box."
      lede="Compared by kind of tool, not by vendor. What a given vendor offers varies, so check theirs."
    >
      <div
        tabIndex={0}
        role="group"
        aria-label="Comparison with other kinds of tool, scrollable"
        className="bg-background focus-visible:ring-accent/40 reveal relative overflow-x-auto rounded-3xl focus-visible:ring-2 focus-visible:outline-none"
      >
        <table className="w-full min-w-2xl text-left text-base">
          <thead>
            <tr>
              <th scope="col" className="px-6 pt-6 pb-4">
                <span className="sr-only">Feature</span>
              </th>
              {COMPARISON_COLUMNS.map((column, index) => (
                <th
                  key={column}
                  scope="col"
                  className={`px-6 pt-6 pb-4 text-sm font-semibold ${index === 0 ? "text-accent" : "text-muted"}`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row) => (
              <tr key={row.label} className="border-border border-t">
                <th scope="row" className="px-6 py-4 font-semibold">
                  {row.label}
                </th>
                {row.values.map((value, index) => (
                  <td
                    key={`${row.label}-${index}`}
                    className={`px-6 py-4 ${index === 0 ? "bg-accent/6 font-semibold" : "text-muted"}`}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageSection>
  );
}

export function EngineFaq({ faqs }: { faqs: FaqItem[] }) {
  return (
    <section className="border-border border-b py-20 lg:py-28">
      <div className={`${FRAME} grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20`}>
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeading title="Common questions." />
          <p className="reveal text-muted mt-6 max-w-md text-base leading-7">
            What it does, where it runs, and what it is not for.
          </p>
        </div>

        <div>
          {faqs.map((faq) => (
            <details
              key={faq.id}
              className="group border-border reveal border-t first:border-t-0 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="focus-visible:ring-accent/40 flex cursor-pointer list-none items-start justify-between gap-6 rounded-xl py-6 text-lg leading-snug font-semibold tracking-tight focus-visible:ring-2 focus-visible:outline-none lg:text-xl">
                {faq.question}
                <Plus
                  aria-hidden="true"
                  className="text-muted mt-1 size-5 shrink-0 transition-transform duration-200 group-open:rotate-45"
                />
              </summary>
              <p className="text-muted -mt-1 max-w-2xl pb-7 text-base leading-7">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function EngineCTA() {
  return (
    <section className="bg-card border-border border-b py-20 lg:py-28">
      <div className={`${FRAME} grid gap-14 lg:grid-cols-[1.2fr_.8fr] lg:items-end lg:gap-20`}>
        <div>
          <h2 className={cn("reveal text-balance", TYPE.section)}>
            Add an ATS check <span className="text-accent block">this afternoon.</span>
          </h2>
          <p className="reveal text-muted mt-6 max-w-lg text-base leading-7">
            One npm install, one function call, and a report you can show your users as it is.
          </p>
          <div className="reveal mt-8 space-y-5">
            <CopyCommand command={INSTALL_COMMAND} className="bg-background" />
            <div className="flex flex-wrap items-center gap-3">
              <LandingButton showArrow size="lg" variant="solid" href={ENGINE_LINKS.quickStart}>
                Quick start
              </LandingButton>
              <LandingButton size="lg" variant="outline" href={ENGINE_LINKS.npm} target="_blank">
                npm package
              </LandingButton>
              <Link
                href="/ats-checker"
                className="group text-muted hover:text-foreground inline-flex items-center gap-1.5 px-2 py-3 text-base font-semibold transition-colors duration-200"
              >
                Or use the free checker
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </div>
        </div>

        <aside className="reveal bg-background rounded-3xl p-7 lg:p-8">
          <h3 className={TYPE.title}>Prefer not to host it?</h3>
          <p className="text-muted mt-4 text-base leading-7">
            The VeriWorkly API runs the same engine. With an API key you can call{" "}
            <code className="text-foreground font-mono text-sm">/ats/check</code>,{" "}
            <code className="text-foreground font-mono text-sm">/ats/extract</code> and{" "}
            <code className="text-foreground font-mono text-sm">/ats/analyze</code>. They share your
            account&apos;s scan quota: 2 scans a day on a free account and 300 a month with any AI
            credits. There is no separate developer plan yet. For volume, run the library yourself:
            it is free.
          </p>
          <a
            href={ENGINE_LINKS.apiReference}
            className="group text-accent mt-6 inline-flex items-center gap-1.5 text-base font-semibold"
          >
            API reference
            <ArrowUpRight
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </a>
        </aside>
      </div>
    </section>
  );
}
