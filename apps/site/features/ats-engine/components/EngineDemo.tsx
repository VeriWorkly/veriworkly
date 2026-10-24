"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, RotateCcw } from "lucide-react";
import type { AtsReport } from "@veriworkly/ats-engine";
import { categoryLabel, scoreTone, sortByCategoryOrder } from "@veriworkly/ats-engine/format";

import { ScoreGauge } from "@/features/ats-checker/components/tool/ScoreGauge";
import { TONE_CLASSES } from "@/features/ats-checker/data/categories";

import { ENGINE_SAMPLES } from "../data/samples";

type CheckFn = typeof import("@veriworkly/ats-engine").check;

/** A fixed reference date, so a sample scores the same on every visit. */
const DEMO_NOW = new Date("2026-10-01T00:00:00Z");

const STATUS_STYLE: Record<AtsReport["requirements"][number]["status"], string> = {
  met: TONE_CLASSES.good.chip,
  partial: TONE_CLASSES.warn.chip,
  missing: TONE_CLASSES.bad.chip,
  unverifiable: "bg-muted/10 text-muted",
};

/**
 * Scores invented sample resumes with the real engine, in the visitor's browser. The engine is
 * loaded only when the demo scrolls into view, and nothing is sent anywhere. Visitors can edit
 * the posting, not the resume: checking their own resume is what /ats-checker is for.
 */
export function EngineDemo() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [check, setCheck] = useState<CheckFn | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [sampleId, setSampleId] = useState(ENGINE_SAMPLES[0]!.id);
  const [postings, setPostings] = useState<Record<string, string>>(() =>
    Object.fromEntries(ENGINE_SAMPLES.map((sample) => [sample.id, sample.posting])),
  );
  const [result, setResult] = useState<{ report: AtsReport; ms: number } | null>(null);

  const sample = ENGINE_SAMPLES.find((entry) => entry.id === sampleId) ?? ENGINE_SAMPLES[0]!;
  const posting = postings[sample.id] ?? sample.posting;

  // What to score next, kept current by the handlers so callbacks never read stale state.
  const current = useRef({ resume: sample.resume, posting });
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const score = (checkFn: CheckFn) => {
    const started = performance.now();
    const report = checkFn(current.current.resume, undefined, {
      jobDescription: current.current.posting,
      now: DEMO_NOW,
    });
    setResult({ report, ms: performance.now() - started });
  };

  // Load the engine (115 KB gz) once the demo is near the viewport and the browser is idle,
  // then score the selected sample. The demo sits in the hero, so "near the viewport" alone
  // meant at page load, competing with the first paint (W-038).
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || check) return;

    const load = () =>
      import("@veriworkly/ats-engine")
        .then((engine) => {
          setCheck(() => engine.check);
          score(engine.check);
        })
        .catch(() => setLoadFailed(true));

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        if ("requestIdleCallback" in window) requestIdleCallback(load, { timeout: 3000 });
        else setTimeout(load, 1500);
      },
      { rootMargin: "300px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [check]);

  useEffect(() => () => clearTimeout(debounce.current), []);

  const selectSample = (id: string) => {
    const next = ENGINE_SAMPLES.find((entry) => entry.id === id);
    if (!next) return;

    setSampleId(id);
    clearTimeout(debounce.current);
    current.current = { resume: next.resume, posting: postings[id] ?? next.posting };
    if (check) score(check);
  };

  const editPosting = (value: string) => {
    setPostings((existing) => ({ ...existing, [sample.id]: value }));
    current.current = { resume: sample.resume, posting: value };

    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      if (check) score(check);
    }, 250);
  };

  const resetPosting = () => editPosting(sample.posting);

  const report = result?.report;

  return (
    <div ref={sectionRef} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          role="group"
          aria-label="Sample resumes"
          className="bg-card inline-flex max-w-full flex-wrap gap-1 rounded-3xl p-1 sm:rounded-full"
        >
          {ENGINE_SAMPLES.map((entry) => {
            const selected = entry.id === sample.id;
            return (
              <button
                key={entry.id}
                type="button"
                aria-pressed={selected}
                onClick={() => selectSample(entry.id)}
                className={`focus-visible:ring-accent/40 shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none ${
                  selected ? "bg-foreground text-background" : "text-muted hover:text-foreground"
                }`}
              >
                {entry.label}
              </button>
            );
          })}
        </div>

        <p className="text-muted text-base">{sample.summary}</p>
      </div>

      <div data-ui className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="bg-card rounded-3xl">
            <div className="flex items-center justify-between px-6 pt-5">
              <span className="text-sm font-semibold">Resume, invented</span>
              <span className="text-muted text-sm">Read-only</span>
            </div>
            <pre
              tabIndex={0}
              aria-label="Sample resume text"
              className="text-muted focus-visible:ring-accent/40 max-h-72 overflow-auto rounded-b-3xl px-6 pt-3 pb-6 font-mono text-sm leading-relaxed whitespace-pre-wrap focus-visible:ring-2 focus-visible:outline-none"
            >
              {sample.resume}
            </pre>
          </div>

          <div className="bg-card flex flex-1 flex-col rounded-3xl">
            <div className="flex items-center justify-between px-6 pt-5">
              <label htmlFor="engine-demo-posting" className="text-sm font-semibold">
                Job posting, edit it
              </label>
              <button
                type="button"
                onClick={resetPosting}
                disabled={posting === sample.posting}
                className="text-muted hover:text-foreground focus-visible:ring-accent/40 -mr-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Reset
              </button>
            </div>
            <textarea
              id="engine-demo-posting"
              value={posting}
              onChange={(event) => editPosting(event.target.value)}
              rows={9}
              spellCheck={false}
              className="focus-visible:ring-accent/40 block min-h-56 w-full flex-1 resize-y rounded-b-3xl bg-transparent px-6 pt-3 pb-6 font-mono text-sm leading-relaxed focus-visible:ring-2 focus-visible:outline-none"
            />
          </div>
        </div>

        <div aria-live="polite" className="bg-card min-w-0 rounded-3xl p-6 sm:p-8">
          {!report ? (
            <div className="text-muted flex min-h-72 items-center justify-center gap-2 text-base">
              {loadFailed ? (
                "The engine could not be loaded. Reload the page to try again."
              ) : (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Loading the engine into this page…
                </>
              )}
            </div>
          ) : (
            <div className="space-y-7">
              <div className="flex flex-wrap items-start justify-around gap-6">
                <ScoreGauge score={report.readinessScore} label="Readiness" size="sm" />
                {report.jobMatchScore !== null ? (
                  <ScoreGauge score={report.jobMatchScore} label="Job match" size="sm" />
                ) : null}
              </div>

              <p className="text-muted text-center text-sm tabular-nums">
                Scored in {result.ms < 1 ? "<1" : Math.round(result.ms)} ms in this browser · engine{" "}
                {report.engine.version} · policy {report.engine.policy}
              </p>

              <ul className="flex flex-wrap gap-2" aria-label="Category scores">
                {sortByCategoryOrder(report.categories).map((category) => (
                  <li
                    key={category.category}
                    className={`rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${TONE_CLASSES[scoreTone(category.score)].chip}`}
                  >
                    {categoryLabel(category.category)} {category.score}%
                  </li>
                ))}
              </ul>

              <div>
                <h3 className="text-base font-semibold">
                  {report.failedChecks.length === 0
                    ? "No failed checks"
                    : `Failed checks (${report.failedChecks.length})`}
                </h3>
                {report.failedChecks.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {[...report.failedChecks]
                      .sort((a, b) => b.scoreImpact - a.scoreImpact)
                      .slice(0, 4)
                      .map((rule) => (
                        <li key={rule.id} className="bg-background space-y-1.5 rounded-2xl p-4">
                          <div className="flex items-center justify-between gap-3">
                            <code className="truncate font-mono text-sm">{rule.id}</code>
                            <span className="text-destructive shrink-0 text-sm font-semibold tabular-nums">
                              −{rule.scoreImpact}
                            </span>
                          </div>
                          <p className="text-muted text-sm leading-relaxed">{rule.evidence}</p>
                          <p className="text-sm leading-relaxed">{rule.fix}</p>
                        </li>
                      ))}
                  </ul>
                ) : null}
              </div>

              {report.requirements.length > 0 ? (
                <div>
                  <h3 className="text-base font-semibold">Requirements</h3>
                  <ul className="mt-3 space-y-2.5">
                    {report.requirements.slice(0, 6).map((requirement, index) => (
                      <li key={`${requirement.text}-${index}`} className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 w-28 shrink-0 rounded-full px-2 py-0.5 text-center text-sm font-semibold capitalize ${STATUS_STYLE[requirement.status]}`}
                        >
                          {requirement.status}
                        </span>
                        <span className="min-w-0 text-sm leading-relaxed">
                          {requirement.text}
                          {requirement.detail ? (
                            <span className="text-muted block">{requirement.detail}</span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}

          <Link
            href="/ats-checker/scan"
            className="group text-accent mt-8 inline-flex items-center gap-1.5 text-base font-semibold"
          >
            Check your own resume, with PDF upload
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default EngineDemo;
