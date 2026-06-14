"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  FileSearch,
  FileText,
  Link2,
  Loader2,
  LockKeyhole,
  ScanSearch,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  convertResumeWithAi,
  extractResumeFile,
  getAtsQuota,
  runAtsAnalysis,
  runAtsCheck,
} from "@/features/ats/ats-api";
import type { AtsQuota, AtsResult, ConvertedResume } from "@/features/ats/types";
import { getDocumentEditorPath } from "@/features/documents/core/routes";
import { defaultResume } from "@/features/resume/constants/default-resume";
import {
  saveResume,
  listSavedResumes,
  loadResumeById,
} from "@/features/resume/services/resume-service";
import { normalizeResumeData } from "@/features/resume/utils/normalize-data";
import { cn } from "@/lib/utils";

export function AtsWorkspace() {
  const router = useRouter();
  const [resume, setResume] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [useJobUrl, setUseJobUrl] = useState(false);
  const [saved] = useState(() =>
    listSavedResumes().map((item) => ({ id: item.id, title: item.title })),
  );
  const [quota, setQuota] = useState<AtsQuota | null>(null);
  const [result, setResult] = useState<AtsResult | null>(null);
  const [converted, setConverted] = useState<ConvertedResume | null>(null);
  const [busy, setBusy] = useState<"extract" | "check" | "ai" | "convert" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void getAtsQuota()
      .then(setQuota)
      .catch(() => undefined);
  }, []);

  const pricing = quota?.pricing;
  const hasResume = Boolean(resume.trim());
  const hasTarget = Boolean(jobDescription.trim() || (useJobUrl && jobUrl.trim()));

  async function run(withAi: boolean) {
    if (!hasResume) return setError("Add a resume before starting the scan.");
    setBusy(withAi ? "ai" : "check");
    setError("");
    try {
      const next = withAi
        ? await runAtsAnalysis({
            resume,
            jobDescription: jobDescription || undefined,
            jobUrl: useJobUrl ? jobUrl || undefined : undefined,
            fetchJobUrl: useJobUrl,
            requestId: crypto.randomUUID(),
          })
        : await runAtsCheck({ resume, jobDescription: jobDescription || undefined });
      setResult(next);
      setQuota(next.quota);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ATS scan failed.");
    } finally {
      setBusy(null);
    }
  }

  async function convertResume() {
    if (!hasResume) return setError("Add the old resume you want to convert.");
    setBusy("convert");
    setError("");
    try {
      const response = await convertResumeWithAi({ resume, requestId: crypto.randomUUID() });
      setConverted(response.resume);
      toast.success(`Resume draft prepared. ${response.creditsSpent} credits used.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Resume conversion failed.");
    } finally {
      setBusy(null);
    }
  }

  function createConvertedResume() {
    if (!converted) return;
    const id = `resume-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const withIds = {
      ...structuredClone(defaultResume),
      ...converted,
      id,
      basics: { ...defaultResume.basics, ...converted.basics },
      links: {
        ...defaultResume.links,
        items: converted.links.map((item, index) => ({
          id: `link-${index + 1}`,
          type: "custom" as const,
          ...item,
        })),
      },
      experience: converted.experience.map((item, index) => ({ id: `exp-${index + 1}`, ...item })),
      education: converted.education.map((item, index) => ({ id: `edu-${index + 1}`, ...item })),
      projects: converted.projects.map((item, index) => ({
        id: `project-${index + 1}`,
        linkLabel: "Link",
        showLinkAsText: true,
        ...item,
      })),
      skills: converted.skills.map((item, index) => ({ id: `skills-${index + 1}`, ...item })),
      updatedAt: new Date().toISOString(),
    };
    const nextResume = normalizeResumeData(withIds);
    nextResume.education = withIds.education;
    nextResume.skills = withIds.skills;
    const savedResult = saveResume(nextResume, { flush: true });
    if (!savedResult.ok) return setError("The converted resume could not be saved.");
    router.push(getDocumentEditorPath("RESUME", nextResume.id));
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <header className="border-border mb-8 flex flex-col gap-5 border-b pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="text-accent mb-3 flex items-center gap-2 text-sm font-semibold">
            <ScanSearch className="h-4 w-4" /> ATS workspace
          </div>
          <h1 className="text-3xl font-black tracking-tight text-balance sm:text-4xl">
            Check the resume. Understand the gaps. Fix what matters.
          </h1>
          <p className="text-muted mt-3 max-w-2xl text-sm leading-6">
            Every scan starts with transparent rule-based scoring. Add AI only when you want a
            deeper explanation or a job-page review.
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <Metric label="Scans left" value={quota ? `${quota.remaining}/${quota.limit}` : "..."} />
          <Metric label="Resume data" value="Not stored" />
        </div>
      </header>

      <section className="grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)]">
        <div className="space-y-6">
          <StepSection number="1" title="Choose the resume to review" complete={hasResume}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FileInput
                busy={busy === "extract"}
                onFile={async (file) => {
                  setBusy("extract");
                  setError("");
                  try {
                    setResume(await extractResumeFile(file));
                    setSourceLabel(file.name);
                    setResult(null);
                    setConverted(null);
                  } catch (cause) {
                    setError(
                      cause instanceof Error ? cause.message : "Resume file could not be read.",
                    );
                  } finally {
                    setBusy(null);
                  }
                }}
              />
              <label className="bg-background ring-border hover:ring-foreground/35 flex min-h-24 cursor-pointer flex-col justify-between rounded-xl p-4 ring-1 transition">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="h-4 w-4" /> Saved Studio resume
                </span>
                <select
                  className="mt-4 w-full bg-transparent text-sm outline-none"
                  value=""
                  onChange={(event) => {
                    const selected = loadResumeById(event.target.value);
                    if (!selected) return;
                    setResume(JSON.stringify(selected));
                    setSourceLabel(
                      saved.find((item) => item.id === event.target.value)?.title ??
                        "Studio resume",
                    );
                    setResult(null);
                    setConverted(null);
                  }}
                >
                  <option value="" disabled>
                    {saved.length ? "Choose resume" : "No saved resumes"}
                  </option>
                  {saved.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <textarea
              value={resume}
              onChange={(event) => {
                setResume(event.target.value);
                setSourceLabel(event.target.value ? "Pasted resume" : "");
              }}
              rows={9}
              placeholder="Or paste resume text here"
              className="bg-background ring-border focus:ring-accent mt-4 w-full resize-y rounded-xl p-4 text-sm leading-6 ring-1 transition outline-none focus:ring-2"
            />
            {sourceLabel ? (
              <p className="text-muted mt-3 text-xs font-medium">Using: {sourceLabel}</p>
            ) : null}
          </StepSection>

          <StepSection number="2" title="Add the role you are targeting" complete={hasTarget}>
            <div className="mb-4 flex gap-2">
              <ModeButton active={!useJobUrl} icon={FileSearch} onClick={() => setUseJobUrl(false)}>
                Paste job description
              </ModeButton>
              <ModeButton active={useJobUrl} icon={Link2} onClick={() => setUseJobUrl(true)}>
                Review job URL
              </ModeButton>
            </div>
            {useJobUrl ? (
              <input
                value={jobUrl}
                onChange={(event) => setJobUrl(event.target.value)}
                type="url"
                placeholder="https://company.com/jobs/role"
                className="bg-background ring-border focus:ring-accent w-full rounded-xl px-4 py-3 text-sm ring-1 transition outline-none focus:ring-2"
              />
            ) : (
              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                rows={6}
                placeholder="Paste the exact job description for a match score and targeted guidance"
                className="bg-background ring-border focus:ring-accent w-full resize-y rounded-xl p-4 text-sm leading-6 ring-1 transition outline-none focus:ring-2"
              />
            )}
            <p className="text-muted mt-3 text-xs leading-5">
              A target role is optional. Without one, the scan focuses on parsing quality, evidence,
              structure, and readability.
            </p>
          </StepSection>

          <StepSection number="3" title="Choose the depth of review">
            <div className="grid gap-3 md:grid-cols-2">
              <ActionChoice
                title="Run core ATS scan"
                description="Fast rule-based scoring with prioritized fixes. No AI credits."
                detail="Best for a quick readiness check"
                icon={ScanSearch}
                disabled={!hasResume || Boolean(busy)}
                busy={busy === "check"}
                onClick={() => void run(false)}
              />
              <ActionChoice
                title="Add AI interpretation"
                description="Explains missing evidence, keyword opportunities, and the best next edits."
                detail={
                  useJobUrl
                    ? pricing
                      ? `${pricing.jobUrlAnalysisCredits.min}-${pricing.jobUrlAnalysisCredits.max} credits`
                      : "Price range loads before analysis"
                    : pricing
                      ? `${pricing.analysisCredits.min}-${pricing.analysisCredits.max} credits`
                      : "Price range loads before analysis"
                }
                icon={Sparkles}
                accent
                disabled={!hasResume || Boolean(busy)}
                busy={busy === "ai"}
                onClick={() => void run(true)}
              />
            </div>
            {error ? (
              <p
                role="alert"
                className="bg-destructive/10 text-destructive mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </p>
            ) : null}
          </StepSection>

          <section className="bg-foreground text-background rounded-xl p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-xl">
                <div className="text-background/70 mb-2 flex items-center gap-2 text-sm font-semibold">
                  <LockKeyhole className="h-4 w-4" /> Pro resume conversion
                </div>
                <h2 className="text-xl font-black">
                  Turn an old resume into an editable VeriWorkly draft
                </h2>
                <p className="text-background/70 mt-2 text-sm leading-6">
                  AI extracts the existing facts into VeriWorkly&apos;s resume structure. Review the
                  draft before creating it in Studio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void convertResume()}
                disabled={!hasResume || Boolean(busy) || quota?.canConvertResume === false}
                className="bg-background text-foreground hover:bg-background/90 inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busy === "convert" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Prepare draft
              </button>
            </div>
            <p className="text-background/60 mt-4 text-xs">
              Pro feature ·{" "}
              {pricing ? `${pricing.resumeConversionCredits} credits` : "Price loads securely"} ·
              Nothing is created until you confirm
            </p>
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          {converted ? (
            <ConvertedResumeReview resume={converted} onCreate={createConvertedResume} />
          ) : result ? (
            <ResultsPanel result={result} />
          ) : (
            <EmptyResults />
          )}
        </aside>
      </section>
    </main>
  );
}

function StepSection({
  number,
  title,
  complete,
  children,
}: {
  number: string;
  title: string;
  complete?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card ring-border rounded-xl p-5 ring-1 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-black",
            complete
              ? "bg-accent text-accent-foreground"
              : "bg-background text-muted ring-border ring-1",
          )}
        >
          {complete ? <Check className="h-4 w-4" /> : number}
        </span>
        <h2 className="text-base font-black">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function FileInput({ busy, onFile }: { busy: boolean; onFile: (file: File) => void }) {
  return (
    <label className="bg-background ring-border hover:ring-foreground/35 flex min-h-24 cursor-pointer flex-col justify-between rounded-xl p-4 ring-1 transition">
      <span className="flex items-center gap-2 text-sm font-semibold">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{" "}
        Upload resume
      </span>
      <span className="text-muted mt-4 text-xs">PDF, DOCX, TXT, Markdown, or JSON · 5 MB max</span>
      <input
        type="file"
        accept=".pdf,.docx,.txt,.md,.json"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

function ModeButton({
  active,
  icon: Icon,
  children,
  onClick,
}: {
  active: boolean;
  icon: typeof FileSearch;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
        active ? "bg-foreground text-background" : "bg-background text-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" /> {children}
    </button>
  );
}

function ActionChoice({
  title,
  description,
  detail,
  icon: Icon,
  accent,
  disabled,
  busy,
  onClick,
}: {
  title: string;
  description: string;
  detail: string;
  icon: typeof ScanSearch;
  accent?: boolean;
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group flex min-h-44 flex-col items-start rounded-xl p-4 text-left ring-1 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45",
        accent
          ? "bg-accent text-accent-foreground ring-accent hover:bg-accent/90"
          : "bg-background ring-border hover:ring-foreground/35",
      )}
    >
      <span
        className={cn(
          "mb-5 flex h-9 w-9 items-center justify-center rounded-lg",
          accent ? "bg-accent-foreground/15" : "bg-card ring-border ring-1",
        )}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      </span>
      <strong className="text-sm">{title}</strong>
      <span
        className={cn(
          "mt-2 text-xs leading-5",
          accent ? "text-accent-foreground/75" : "text-muted",
        )}
      >
        {description}
      </span>
      <span
        className={cn(
          "mt-auto pt-4 text-xs font-bold",
          accent ? "text-accent-foreground" : "text-foreground",
        )}
      >
        {detail}
      </span>
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted text-xs">{label}</p>
      <p className="mt-1 font-mono text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

function EmptyResults() {
  return (
    <div className="bg-card ring-border flex min-h-[28rem] flex-col justify-between rounded-xl p-6 ring-1">
      <div>
        <span className="bg-background ring-border flex h-10 w-10 items-center justify-center rounded-lg ring-1">
          <ScanSearch className="h-5 w-5" />
        </span>
        <h2 className="mt-6 text-xl font-black">Your report will appear here</h2>
        <p className="text-muted mt-2 text-sm leading-6">
          Complete the steps, then choose a core scan or AI interpretation.
        </p>
      </div>
      <ol className="mt-8 space-y-4 text-sm">
        {[
          "Resume parsing and structure",
          "Evidence and measurable impact",
          "Target-role keyword coverage",
          "Prioritized, actionable fixes",
        ].map((item, index) => (
          <li key={item} className="border-border flex items-center gap-3 border-t pt-4">
            <span className="text-muted font-mono text-xs">0{index + 1}</span>
            {item}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ResultsPanel({ result }: { result: AtsResult }) {
  return (
    <div className="space-y-4">
      <div className="bg-foreground text-background rounded-xl p-5">
        <p className="text-background/65 text-sm font-semibold">ATS readiness</p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <p className="font-mono text-6xl font-black tracking-tight tabular-nums">
            {result.report.readinessScore}
          </p>
          <p className="text-background/65 pb-1 text-right text-xs leading-5">
            Job match
            <br />
            <strong className="text-background">
              {result.report.jobMatchScore ?? "Not targeted"}
            </strong>
          </p>
        </div>
      </div>
      <ReportList title="Fix these first" items={result.report.prioritizedFixes} warning />
      {result.ai ? (
        <>
          <section className="bg-card ring-border rounded-xl p-5 ring-1">
            <div className="flex items-center gap-2 text-sm font-black">
              <Sparkles className="text-accent h-4 w-4" /> AI interpretation
            </div>
            <p className="mt-3 text-sm leading-6">{result.ai.explanation}</p>
          </section>
          <ReportList title="Missing evidence" items={result.ai.missingEvidence} warning />
          <ReportList title="AI priority order" items={result.ai.priorityOrder} warning />
          <ReportList title="Recommended edits" items={result.ai.recommendedImprovements} />
          <ReportList title="Keyword opportunities" items={result.ai.keywordOpportunities} />
        </>
      ) : null}
      <ReportList title="What already works" items={result.report.strengths} />
      <p className="text-muted px-1 text-xs">
        {result.creditsSpent ? `${result.creditsSpent} credits used · ` : ""}
        {result.quota.remaining} scans remaining
      </p>
    </div>
  );
}

function ConvertedResumeReview({
  resume,
  onCreate,
}: {
  resume: ConvertedResume;
  onCreate: () => void;
}) {
  const counts = useMemo(
    () =>
      [
        ["Experience", resume.experience.length],
        ["Education", resume.education.length],
        ["Projects", resume.projects.length],
        ["Skill groups", resume.skills.length],
      ] as const,
    [resume],
  );
  return (
    <section className="bg-card ring-border rounded-xl p-5 ring-1">
      <div className="text-accent flex items-center gap-2 text-sm font-black">
        <Sparkles className="h-4 w-4" /> Draft ready for review
      </div>
      <h2 className="mt-4 text-2xl font-black tracking-tight">
        {resume.basics.fullName || "Converted resume"}
      </h2>
      <p className="text-muted mt-1 text-sm">
        {resume.basics.role || resume.basics.headline || "Role not detected"}
      </p>
      <div className="bg-border ring-border mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg ring-1">
        {counts.map(([label, value]) => (
          <div key={label} className="bg-background p-3">
            <p className="font-mono text-xl font-black tabular-nums">{value}</p>
            <p className="text-muted mt-1 text-xs">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-muted mt-5 text-xs leading-5">
        The draft contains only extracted facts. Open it in the editor to verify dates, links,
        formatting, and wording.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="bg-accent text-accent-foreground hover:bg-accent/90 mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition active:scale-[0.99]"
      >
        Create resume and review <ArrowRight className="h-4 w-4" />
      </button>
    </section>
  );
}

function ReportList({
  title,
  items,
  warning = false,
}: {
  title: string;
  items: string[];
  warning?: boolean;
}) {
  const Icon = warning ? AlertTriangle : CheckCircle2;
  return (
    <section className="bg-card ring-border rounded-xl p-5 ring-1">
      <h2 className="text-sm font-black">{title}</h2>
      <ul className="mt-4 space-y-3">
        {items.length ? (
          items.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm leading-5">
              <Icon
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  warning ? "text-amber-500" : "text-emerald-500",
                )}
              />
              {item}
            </li>
          ))
        ) : (
          <li className="text-muted text-sm">Nothing to show.</li>
        )}
      </ul>
    </section>
  );
}
