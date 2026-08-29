"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, RotateCcw, ScanSearch, TriangleAlert } from "lucide-react";

import {
  extractResumeFile,
  getAtsQuota,
  runAtsCheck,
} from "../../services/ats-checker-api";
import type { AtsCheckResult, AtsQuota } from "../../types";
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
      const text = await extractResumeFile(file);
      if (wordCountOf(text) < 30) {
        setError("This file appears to contain very little readable text. Please try pasting the text.");
        return;
      }
      setResume(text);
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
      setError("Please paste at least a few lines of resume text so we have enough content to score.");
      return;
    }
    setResume(text);
    setSourceLabel("Pasted resume text");
    setPhase("target");
  };

  const handleClearResume = () => {
    setResume("");
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
        resume: { text: resume },
        jobDescription: jobDescription.trim() || undefined,
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
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <Stepper steps={STEP_LABELS} current={currentStep} />
      </div>

      {quota && phase !== "results" ? <QuotaNotice quota={quota} /> : null}

      <div className="relative">
        <AnimatePresence mode="wait">
          {phase === "resume" && (
            <motion.div
              key="resume"
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-white/2 sm:p-8">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Add your resume
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
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
            </motion.div>
          )}

          {phase === "target" && (
            <motion.div
              key="target"
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-white/2 sm:p-8">
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

                <div className="mt-6 border-t border-zinc-100 pt-6 dark:border-zinc-800/70">
                  <div className="flex items-baseline justify-between gap-4">
                    <label
                      htmlFor="target-jd"
                      className="text-sm font-semibold text-zinc-900 dark:text-white"
                    >
                      Target job description{" "}
                      <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
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
                    className="mt-3 w-full rounded-2xl border border-zinc-300 bg-white p-4 font-mono text-xs leading-relaxed text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-white/2 dark:text-white"
                  />
                </div>

                {error ? (
                  <p
                    role="alert"
                    className="mt-4 flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400"
                  >
                    <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {error}
                  </p>
                ) : null}

                <div className="mt-6 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleClearResume}
                    className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                  >
                    Change resume
                  </button>
                  <button
                    type="button"
                    disabled={busy || !resume.trim()}
                    onClick={runScan}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-blue-600 px-6 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
                  >
                    <span>{jobDescription.trim() ? "Scan with job match" : "Scan resume readiness"}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {phase === "scanning" && (
            <motion.div
              key="scanning"
              initial={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <ScanLoader hasTarget={Boolean(jobDescription.trim())} />
            </motion.div>
          )}

          {phase === "results" && result && (
            <motion.div
              key="results"
              ref={resultsRef}
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-zinc-500 dark:text-zinc-400">
                  <ScanSearch className="h-4 w-4 text-emerald-500" />
                  Scan complete
                </span>
                <button
                  type="button"
                  onClick={resetAll}
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Scan another resume</span>
                </button>
              </div>

              {result.report.restricted ? (
                <RestrictedResults report={result.report} />
              ) : (
                <FullResults report={result.report} quota={result.quota} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default AtsCheckerTool;
