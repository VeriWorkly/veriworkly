"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from "lucide-react";

import { extractResumeFile, runAtsAnalysis, runAtsCheck } from "@/features/ats/ats-api";
import type { AtsResult } from "@/features/ats/types";
import { listSavedResumes, loadResumeById } from "@/features/resume/services/resume-service";

export function AtsWorkspace() {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [fetchJobUrl, setFetchJobUrl] = useState(false);
  const [saved, setSaved] = useState<Array<{ id: string; title: string }>>([]);
  const [result, setResult] = useState<AtsResult | null>(null);
  const [busy, setBusy] = useState<"check" | "ai" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setSaved(listSavedResumes().map((item) => ({ id: item.id, title: item.title })));
  }, []);

  async function run(withAi: boolean) {
    if (!resume.trim()) return setError("Paste a resume or choose a saved Studio resume.");
    setBusy(withAi ? "ai" : "check");
    setError("");
    try {
      setResult(
        withAi
          ? await runAtsAnalysis({
              resume,
              jobDescription: jobDescription || undefined,
              jobUrl: jobUrl || undefined,
              fetchJobUrl,
              requestId: crypto.randomUUID(),
            })
          : await runAtsCheck({ resume, jobDescription: jobDescription || undefined }),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ATS scan failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <header className="max-w-3xl">
        <p className="text-accent text-xs font-bold tracking-[0.18em] uppercase">Private ATS checker</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Find the evidence recruiters miss.</h1>
        <p className="text-muted mt-3 text-sm leading-6">
          Deterministic scoring runs first. AI explanation is optional and never changes the score.
        </p>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="border-border bg-card space-y-5 rounded-2xl border p-5">
          <label className="block text-sm font-bold">Resume</label>
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md,.json"
            className="border-border bg-background w-full rounded-xl border px-3 py-2 text-sm"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setBusy("check");
              setError("");
              try {
                setResume(await extractResumeFile(file));
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Resume file could not be read.");
              } finally {
                setBusy(null);
              }
            }}
          />
          {saved.length ? (
            <select
              className="border-border bg-background w-full rounded-xl border px-3 py-2 text-sm"
              defaultValue=""
              onChange={(event) => {
                const selected = loadResumeById(event.target.value);
                if (selected) setResume(JSON.stringify(selected));
              }}
            >
              <option value="" disabled>Choose a saved Studio resume</option>
              {saved.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          ) : null}
          <textarea
            value={resume}
            onChange={(event) => setResume(event.target.value)}
            rows={14}
            placeholder="Paste resume text here..."
            className="border-border bg-background w-full resize-y rounded-xl border p-3 text-sm leading-6"
          />
          <label className="block text-sm font-bold">Job description <span className="text-muted font-normal">(optional)</span></label>
          <textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            rows={7}
            placeholder="Paste the exact job description..."
            className="border-border bg-background w-full resize-y rounded-xl border p-3 text-sm leading-6"
          />
          <input
            value={jobUrl}
            onChange={(event) => setJobUrl(event.target.value)}
            type="url"
            placeholder="https://company.example/jobs/role"
            className="border-border bg-background w-full rounded-xl border px-3 py-2 text-sm"
          />
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={fetchJobUrl}
              disabled={!/^https:\/\//i.test(jobUrl)}
              onChange={(event) => setFetchJobUrl(event.target.checked)}
              className="mt-1"
            />
            <span>Analyze only this exact job URL. Online analysis may cost up to 2x, with a maximum charge of 50 credits.</span>
          </label>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button onClick={() => void run(false)} disabled={Boolean(busy)} className="bg-foreground text-background rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50">
              {busy === "check" ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}Run ATS scan
            </button>
            <button onClick={() => void run(true)} disabled={Boolean(busy)} className="bg-accent text-accent-foreground rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50">
              {busy === "ai" ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 inline h-4 w-4" />}Improve with AI
            </button>
          </div>
          <p className="text-muted text-xs">AI ATS analysis costs 5-25 credits offline. Reports and resume content are not stored.</p>
        </div>

        <div className="space-y-5">
          {!result ? (
            <div className="border-border bg-card text-muted rounded-2xl border p-8 text-sm">Run a scan to see readiness, job match, and prioritized fixes.</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Score label="ATS readiness" value={result.report.readinessScore} />
                <Score label="Job match" value={result.report.jobMatchScore} />
              </div>
              <ReportList title="Prioritized fixes" items={result.report.prioritizedFixes} warning />
              <ReportList title="Strengths" items={result.report.strengths} />
              {result.ai ? (
                <div className="border-accent/40 bg-card rounded-2xl border p-5">
                  <p className="text-xs font-bold tracking-[0.16em] uppercase">Recruiter-style analysis</p>
                  <p className="mt-3 text-sm leading-6">{result.ai.explanation}</p>
                  <div className="mt-5"><ReportList title="AI priority order" items={result.ai.priorityOrder} warning /></div>
                </div>
              ) : null}
              <p className="text-muted text-xs">
                {result.creditsSpent ? `${result.creditsSpent} credits spent. ` : ""}
                {result.quota.remaining} of {result.quota.limit} scans remaining.
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function Score({ label, value }: { label: string; value: number | null }) {
  return <div className="border-border bg-card rounded-2xl border p-5"><p className="text-muted text-xs font-bold uppercase">{label}</p><p className="mt-2 text-4xl font-black">{value ?? "-"}</p></div>;
}

function ReportList({ title, items, warning = false }: { title: string; items: string[]; warning?: boolean }) {
  const Icon = warning ? AlertTriangle : CheckCircle2;
  return <div className="border-border bg-card rounded-2xl border p-5"><h2 className="text-sm font-black">{title}</h2><ul className="mt-3 space-y-3">{items.length ? items.map((item) => <li key={item} className="flex gap-2 text-sm leading-5"><Icon className={`mt-0.5 h-4 w-4 shrink-0 ${warning ? "text-amber-500" : "text-emerald-500"}`} />{item}</li>) : <li className="text-muted text-sm">Nothing to show.</li>}</ul></div>;
}
