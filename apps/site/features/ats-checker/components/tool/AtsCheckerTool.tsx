"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { ArrowRight, RotateCcw, ScanSearch, TriangleAlert } from "lucide-react";

import { extractResumeFile, getAtsQuota, runAtsCheck } from "../../services/ats-checker-api";
import type { AtsCheckResult, AtsLayoutSignals, AtsQuota } from "../../types";
import { ApiRequestError } from "@/utils/fetchApiData";
import { Stepper } from "./Stepper";
import { ResumeStep } from "./ResumeStep";
import { ScanLoader, SCAN_LOADER_MIN_MS } from "./ScanLoader";
import { QuotaNotice } from "./QuotaNotice";
import { RestrictedResults } from "./RestrictedResults";
import { FullResults } from "./FullResults";

const STEP_LABELS = ["Resume", "Target role", "Results"];

type Phase = "resume" | "target" | "scanning" | "results";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function wordCountOf(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function AtsCheckerTool() {
  const [phase, setPhase] = useState<Phase>("resume");
  const [resume, setResume] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  // Page geometry from an uploaded file, held alongside its text and sent with the scan so the
  // format checks can see the layout. Pasted text has none, and the checks are skipped.
  const [layout, setLayout] = useState<AtsLayoutSignals | undefined>(undefined);
  // The uploaded file's name and size, for the advice on them; none for pasted text.
  const [upload, setUpload] = useState<{ name: string; bytes: number } | undefined>(undefined);
  const [jobDescription, setJobDescription] = useState("");
  const [quota, setQuota] = useState<AtsQuota | null>(null);
  const [result, setResult] = useState<AtsCheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const resultsRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    let active = true;
    getAtsQuota()
      .then((data) => {
        if (active) setQuota(data);
      })
      .catch(() => {
        // Quota fails silently on network error; next scan attempt surfaces it.
      });
    return () => {
      active = false;
    };
  }, []);

  const handleFile = async (file: File) => {
    setError("");
    setExtracting(true);
    try {
      const { text, layout: extractedLayout } = await extractResumeFile(file);
      if (wordCountOf(text) < 30) {
        setError(
          "This file appears to contain very little readable text. Please try pasting the text.",
        );
        return;
      }
      setResume(text);
      setLayout(extractedLayout);
      setUpload({ name: file.name, bytes: file.size });
      setSourceLabel(file.name);
      setPhase("target");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this resume file.");
    } finally {
      setExtracting(false);
    }
  };

  const handlePaste = (text: string) => {
    setError("");
    if (wordCountOf(text) < 30) {
      setError(
        "Please paste at least a few lines of resume text so we have enough content to score.",
      );
      return;
    }
    setResume(text);
    // Pasted text carries no geometry, so any layout measured from a previous upload no longer
    // describes this resume and must not be scored against it.
    setLayout(undefined);
    setUpload(undefined);
    setSourceLabel("Pasted resume text");
    setPhase("target");
  };

  const handleClearResume = () => {
    setResume("");
    setLayout(undefined);
    setUpload(undefined);
    setSourceLabel("");
    setError("");
    setPhase("resume");
  };

  const runScan = async () => {
    if (!resume.trim()) {
      setError("Add a resume first.");
      setPhase("resume");
      return;
    }

    setError("");
    setBusy(true);
    setPhase("scanning");

    const startedAt = Date.now();
    const minHoldMs = SCAN_LOADER_MIN_MS(Boolean(jobDescription.trim()));

    try {
      const checkPromise = runAtsCheck({
        resume,
        jobDescription: jobDescription.trim() || undefined,
        layout,
        file: upload,
      });

      const [checkResult] = await Promise.all([
        checkPromise,
        delay(Math.max(0, minHoldMs - (Date.now() - startedAt))),
      ]);

      setResult(checkResult);
      setQuota(checkResult.quota);
      setPhase("results");
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 429) {
        setError("You have reached your scan limit for now.");
      } else {
        setError(err instanceof Error ? err.message : "Scan failed. Please try again.");
      }
      setPhase("target");
    } finally {
      setBusy(false);
    }
  };

  const resetAll = () => {
    setPhase("resume");
    setResume("");
    setSourceLabel("");
    setJobDescription("");
    setResult(null);
    setError("");
  };

  const currentStep = phase === "resume" ? 0 : phase === "target" || phase === "scanning" ? 1 : 2;

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <Stepper steps={STEP_LABELS} current={currentStep} />
      </div>

      {/* One line is held for the notice while the quota loads, so the tool does not jump
          down when it arrives (W-042). */}
      {phase !== "results" ? (
        quota ? (
          <QuotaNotice quota={quota} />
        ) : (
          <p aria-hidden="true" className="mb-6 h-6" />
        )
      ) : null}

      <div className="relative">
        <AnimatePresence mode="wait">
          {phase === "resume" && (
            <m.div
              key="resume"
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-card rounded-3xl p-6 sm:p-8">
                <h2 className="text-2xl font-bold tracking-tight">Add your resume</h2>
                <p className="text-muted mt-2 text-base">
                  Upload a document or paste raw text. The scan runs entirely in volatile memory.
                </p>
                <div className="mt-6">
                  <ResumeStep
                    hasResume={Boolean(resume)}
                    sourceLabel={sourceLabel}
                    wordCount={wordCountOf(resume)}
                    busy={extracting}
                    error={error}
                    onFile={handleFile}
                    onPaste={handlePaste}
                    onClear={handleClearResume}
                  />
                </div>
              </div>
            </m.div>
          )}

          {phase === "target" && (
            <m.div
              key="target"
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="bg-card rounded-3xl p-6 sm:p-8">
                <ResumeStep
                  hasResume={true}
                  sourceLabel={sourceLabel}
                  wordCount={wordCountOf(resume)}
                  busy={false}
                  error=""
                  onFile={handleFile}
                  onPaste={handlePaste}
                  onClear={handleClearResume}
                />

                <div className="border-border mt-6 border-t pt-6">
                  <div className="flex items-baseline justify-between gap-4">
                    <label htmlFor="target-jd" className="text-base font-semibold">
                      Target job description{" "}
                      <span className="text-muted text-sm font-normal">
                        (optional, for keyword scoring)
                      </span>
                    </label>
                  </div>
                  <textarea
                    id="target-jd"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    rows={7}
                    placeholder="Paste the job description here to check keyword match…"
                    className="border-border bg-background focus:border-accent focus:ring-accent/20 mt-3 w-full rounded-2xl border p-4 text-base leading-relaxed focus:ring-2 focus:outline-none"
                  />
                </div>

                {error ? (
                  <p
                    role="alert"
                    className="text-destructive mt-4 flex items-center gap-2 text-sm font-medium"
                  >
                    <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {error}
                  </p>
                ) : null}

                <div className="mt-6 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleClearResume}
                    className="text-muted hover:text-foreground text-sm font-semibold transition-colors"
                  >
                    Change resume
                  </button>
                  <button
                    type="button"
                    disabled={busy || !resume.trim()}
                    onClick={runScan}
                    className="bg-foreground text-background hover:bg-accent hover:text-accent-foreground inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-[transform,background-color,color] duration-200 active:scale-[0.97] disabled:opacity-50"
                  >
                    <span>
                      {jobDescription.trim() ? "Scan with job match" : "Scan resume readiness"}
                    </span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </m.div>
          )}

          {phase === "scanning" && (
            <m.div
              key="scanning"
              initial={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <ScanLoader hasTarget={Boolean(jobDescription.trim())} />
            </m.div>
          )}

          {phase === "results" && result && (
            <m.div
              key="results"
              ref={resultsRef}
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted inline-flex items-center gap-2 text-sm font-semibold">
                  <ScanSearch aria-hidden="true" className="text-success h-4 w-4" />
                  Scan complete
                </span>
                <button
                  type="button"
                  onClick={resetAll}
                  className="border-border bg-card hover:bg-background inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
                >
                  <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                  <span>Scan another resume</span>
                </button>
              </div>

              {result.report.restricted ? (
                <RestrictedResults report={result.report} />
              ) : (
                <FullResults report={result.report} quota={result.quota} />
              )}
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default AtsCheckerTool;
