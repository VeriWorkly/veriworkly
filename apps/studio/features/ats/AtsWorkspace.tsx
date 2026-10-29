"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
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
import { renderResumeDocument, type AtsResumeDocument } from "@veriworkly/ats-engine/document";
import {
  categoryLabel,
  formatRoleDates,
  formatTenure,
  scoreTone,
  sortByCategoryOrder,
} from "@veriworkly/ats-engine/format";
import { toast } from "sonner";

import { useSessionUser } from "@/store/session-user";
import {
  convertResumeWithAi,
  describeAtsError,
  extractResumeFile,
  getAtsQuota,
  conversionUnavailableReason,
  quotaResetLabel,
  runAtsAnalysis,
  runAtsCheck,
  type AtsFileInfo,
} from "@/features/ats/ats-api";
import type { PaidActionError } from "@/features/credits/credit-errors";
import type { CreditWallet } from "@/features/credits/types";
import { fetchApiData } from "@/utils/fetchApiData";
import type {
  AtsLayoutSignals,
  AtsParsedResume,
  AtsQuota,
  AtsParsedField,
  AtsRepairSummary,
  AtsResult,
  ConvertedResume,
} from "@/features/ats/types";
import { toAtsDocument } from "@/features/ats/resume-document";
import { recallAtsReport, rememberAtsReport } from "@/features/ats/ats-report-memory";
import { buildResumeFromConversion } from "@/features/ats/converted-resume";
import { getDocumentEditorPath } from "@/features/documents/core/routes";
import { useHiddenFileInput } from "@/features/documents/editor/toolbar/useHiddenFileInput";
import {
  DOCUMENT_LIBRARY_SERVER_SNAPSHOT,
  getDocumentLibrarySnapshot,
  subscribeToDocumentLibrary,
} from "@/features/documents/services/document-library";
import {
  deleteDocument,
  listDocuments,
} from "@/features/documents/services/document-workspace-service";
import {
  createDocumentWithinLimit,
  FREE_DOCUMENTS_PER_TYPE,
  freeLimitMessage,
  hasUnlimitedDocuments,
} from "@/features/documents/services/document-limit";
import type { BillingSummary } from "@/features/billing/types";
import { saveResume, readResumeById } from "@/features/resume/services/resume-service";
import { describeSaveResult } from "@/features/documents/services/save-failure-message";
import { requestIdFor, settleRequestId, type PendingAiRequest } from "@/features/ai/ai-api";
import { cn } from "@veriworkly/ui";

/**
 * The conversion is charged before it makes a resume, so the document limit is checked first:
 * otherwise a free account that already has one pays, then cannot keep the result. `null` when
 * the new resume fits.
 */
export async function conversionLimitMessage(): Promise<string | null> {
  if (listDocuments("RESUME").length < FREE_DOCUMENTS_PER_TYPE) return null;

  const billing = await fetchApiData<BillingSummary>("/billing/me");
  return hasUnlimitedDocuments(billing) ? null : freeLimitMessage("RESUME");
}

/** `initialDocumentId`: the saved resume to start from, when opened from its editor (S-221). */
export function AtsWorkspace({ initialDocumentId }: { initialDocumentId?: string }) {
  const router = useRouter();
  const isLoggedIn = Boolean(useSessionUser()?.email);
  const [resume, setResume] = useState("");
  // Set only while the text above is the untouched rendering of a saved resume. The scan then
  // sends the structure, so the ATS record is read from typed fields rather than re-parsed; any
  // edit, paste or upload clears it and the scan falls back to the text.
  const [resumeDocument, setResumeDocument] = useState<AtsResumeDocument | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  // The saved resume being scanned, while its text is untouched: its last report is kept for
  // the tab, and shown again when the resume is picked again.
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [reportIsStale, setReportIsStale] = useState(false);
  // Page geometry from an uploaded file, kept beside its text so the format checks can read the
  // layout. Cleared whenever the resume comes from anywhere else, since it would then describe
  // a document that is no longer loaded.
  const [layout, setLayout] = useState<AtsLayoutSignals | undefined>(undefined);
  const [fileInfo, setFileInfo] = useState<AtsFileInfo | undefined>(undefined);
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [useJobUrl, setUseJobUrl] = useState(false);
  // Opt-in, never inferred: repair spends credits, so it runs only when the user asked for it
  // and the server finds the parse thin enough to need it.
  const [repairParse, setRepairParse] = useState(false);
  // Read from storage after hydration: the server snapshot is the empty library, so the
  // first client render matches the HTML and the list fills in once storage is readable.
  const saved = useSyncExternalStore(
    subscribeToDocumentLibrary,
    () => getDocumentLibrarySnapshot("RESUME"),
    () => DOCUMENT_LIBRARY_SERVER_SNAPSHOT,
  ).docs;
  const [quota, setQuota] = useState<AtsQuota | null>(null);
  const [result, setResult] = useState<AtsResult | null>(null);
  const [converted, setConverted] = useState<ConvertedResume | null>(null);
  const [busy, setBusy] = useState<"extract" | "check" | "ai" | "convert" | null>(null);
  const [error, setError] = useState<PaidActionError | null>(null);
  // What the user can spend, shown next to every price. "error" keeps a failed read visible
  // instead of looking like a balance that is still loading.
  const [wallet, setWallet] = useState<CreditWallet | "error" | null>(null);
  const reportRef = useRef<HTMLElement>(null);
  // One request id per paid attempt (V-192): a retry after a lost response is answered from the
  // stored result instead of being charged again. A success, an answered error or a changed
  // input starts a new one.
  const pendingAnalysisRef = useRef<PendingAiRequest["current"]>(null);
  const pendingConversionRef = useRef<PendingAiRequest["current"]>(null);
  const fieldIds = useId();

  // Picking a resume to scan is not opening it, so the active-document pointer stays where the
  // user's editor left it.
  const selectSavedResume = useCallback((id: string, fallbackTitle?: string) => {
    const selected = readResumeById(id);
    if (!selected) return;

    const document = toAtsDocument(selected);
    const text = renderResumeDocument(document);
    const remembered = recallAtsReport(id, text);

    setResumeDocument(document);
    setResume(text);
    setDocumentId(id);
    setLayout(undefined);
    setFileInfo(undefined);
    setSourceLabel(fallbackTitle ?? (selected.title || "Studio resume"));
    setResult(remembered?.result ?? null);
    setReportIsStale(remembered ? !remembered.current : false);
    setConverted(null);
  }, []);

  // Read from storage once the page is on screen: the server render has no storage, and the
  // first client render must match it.
  useEffect(() => {
    if (!initialDocumentId) return;

    const frame = window.requestAnimationFrame(() => selectSavedResume(initialDocumentId));
    return () => window.cancelAnimationFrame(frame);
  }, [initialDocumentId, selectSavedResume]);

  const refreshWallet = useCallback(() => {
    void fetchApiData<CreditWallet>("/billing/credits")
      .then(setWallet)
      .catch(() => setWallet("error"));
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    void getAtsQuota()
      .then(setQuota)
      .catch((cause) =>
        setError(describeAtsError(cause, "Your scan allowance could not be loaded.")),
      );
    refreshWallet();
  }, [isLoggedIn, refreshWallet]);

  // Below `xl` the report renders under the form, out of sight: a finished scan or draft would
  // look like nothing happened, so it is brought into view and focused for screen readers.
  useEffect(() => {
    if (!result && !converted) return;
    if (window.matchMedia("(min-width: 1280px)").matches) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    reportRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    reportRef.current?.focus({ preventScroll: true });
  }, [result, converted]);

  const pricing = quota?.pricing;
  const available = wallet && wallet !== "error" ? wallet.available : null;
  const hasResume = Boolean(resume.trim());
  // Only the visible field is the target: a description left behind the URL tab is not sent.
  const hasTarget = Boolean(useJobUrl ? jobUrl.trim() : jobDescription.trim());
  const urlOnlyTarget = useJobUrl && Boolean(jobUrl.trim());
  const canRepair = canOfferRepair(quota);
  // Both scans spend one from the allowance, so at zero neither is offered.
  const outOfScans = quota?.remaining === 0;

  async function run(withAi: boolean) {
    if (!isLoggedIn) {
      toast.error("Sign in to scan resumes.");
      return;
    }
    if (!hasResume)
      return setError({ message: "Add a resume before starting the scan.", buyCredits: false });
    setBusy(withAi ? "ai" : "check");
    setError(null);
    setConverted(null);
    const scanInput = resumeDocument ?? resume;
    const targetDescription = useJobUrl ? undefined : jobDescription || undefined;
    const analysis = {
      resume: scanInput,
      jobDescription: targetDescription,
      jobUrl: useJobUrl ? jobUrl || undefined : undefined,
      fetchJobUrl: useJobUrl,
      layout,
      file: fileInfo,
      repairParse: repairParse && canRepair && !resumeDocument,
    };
    try {
      const next = withAi
        ? await runAtsAnalysis({
            ...analysis,
            requestId: requestIdFor(pendingAnalysisRef, JSON.stringify(analysis)),
          })
        : await runAtsCheck({
            resume: scanInput,
            jobDescription: targetDescription,
            layout,
            file: fileInfo,
          });
      if (withAi) settleRequestId(pendingAnalysisRef);
      setResult(next);
      setReportIsStale(false);
      if (documentId && resumeDocument) rememberAtsReport(documentId, resume, next);
      setQuota(next.quota);
    } catch (cause) {
      if (withAi) settleRequestId(pendingAnalysisRef, cause);
      const failure = describeAtsError(cause, "ATS scan failed.");
      setError(failure);
      if (failure.quota) setQuota(failure.quota);
    } finally {
      setBusy(null);
      if (withAi) refreshWallet();
    }
  }

  async function convertResume() {
    if (!isLoggedIn) {
      toast.error("Sign in to convert resumes.");
      return;
    }
    if (!hasResume) {
      return setError({ message: "Add the old resume you want to convert.", buyCredits: false });
    }
    setBusy("convert");
    setError(null);
    try {
      const limit = await conversionLimitMessage();
      if (limit) return setError({ message: limit, buyCredits: false });

      const response = await convertResumeWithAi({
        resume,
        requestId: requestIdFor(pendingConversionRef, resume),
      });
      // The id is kept after a success: the draft can be cleared by the next click, and preparing
      // the same text again is then answered from the server's stored result, not charged (S-382).
      setConverted(response.resume);
      toast.success(
        response.replayed
          ? "Resume draft recovered from your last request. No extra credits used."
          : `Resume draft prepared. ${response.creditsSpent} credits used.`,
      );
    } catch (cause) {
      settleRequestId(pendingConversionRef, cause);
      setError(describeAtsError(cause, "Resume conversion failed."));
    } finally {
      setBusy(null);
      refreshWallet();
    }
  }

  async function createConvertedResume() {
    if (!converted) return;

    // Through the same gate as every new document: the limit, the workspace's sync setting,
    // and the new resume becoming the active one.
    const result = await createDocumentWithinLimit("RESUME", "blank");

    if (!result.ok) {
      if (result.reason === "busy") return;
      return setError({
        message:
          result.reason === "save"
            ? `The converted resume could not be saved. ${result.message}`
            : result.message,
        buyCredits: false,
      });
    }

    const created = result.document;

    const draft = buildResumeFromConversion(converted, created.id);
    const failure = describeSaveResult(
      saveResume({ ...draft, sync: created.sync }, { flush: true }),
    );

    if (failure) {
      // The placeholder createDocument wrote must not stay behind as the active resume.
      deleteDocument("RESUME", created.id);
      return setError({
        message: `The converted resume could not be saved. ${failure}`,
        buyCredits: false,
      });
    }

    router.push(getDocumentEditorPath("RESUME", created.id));
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
          <ScansLeftMetric quota={quota} />
          <Metric
            label="Credits available"
            value={wallet === "error" ? "Unavailable" : wallet ? String(wallet.available) : "..."}
          />
          <Metric label="Resume data" value="Not stored" />
        </div>
      </header>

      <section className="relative grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)]">
        {/*
          `pointer-events-none` only stops the mouse. Without `inert` the whole locked form stays
          in the tab order and in the accessibility tree, so a keyboard or screen-reader user
          walked through inputs they cannot use and never reached the login prompt sitting on top.
        */}
        <div
          inert={!isLoggedIn}
          className={cn("space-y-6", !isLoggedIn && "pointer-events-none opacity-40 blur-[3px]")}
        >
          <StepSection number="1" title="Choose the resume to review" complete={hasResume}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FileInput
                busy={busy === "extract"}
                disabled={Boolean(busy)}
                onFile={async (file) => {
                  if (!isLoggedIn) {
                    toast.error("Sign in to analyze resumes.");
                    return;
                  }
                  setBusy("extract");
                  setError(null);
                  try {
                    const extracted = await extractResumeFile(file);
                    setResume(extracted.text);
                    setResumeDocument(null);
                    setDocumentId(null);
                    setLayout(extracted.layout);
                    setFileInfo({ name: file.name, bytes: file.size });
                    setQuota(extracted.quota);
                    setSourceLabel(file.name);
                    setResult(null);
                    setConverted(null);
                  } catch (cause) {
                    const failure = describeAtsError(cause, "Resume file could not be read.");
                    setError(failure);
                    if (failure.quota) setQuota(failure.quota);
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
                  disabled={Boolean(busy)}
                  className="mt-4 w-full bg-transparent text-sm outline-none"
                  value=""
                  onChange={(event) =>
                    selectSavedResume(
                      event.target.value,
                      saved.find((item) => item.id === event.target.value)?.title,
                    )
                  }
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
            <label htmlFor={`${fieldIds}-resume`} className="mt-4 mb-2 block text-sm font-semibold">
              Resume text
            </label>
            <textarea
              id={`${fieldIds}-resume`}
              value={resume}
              disabled={Boolean(busy)}
              onChange={(event) => {
                setResume(event.target.value);
                setResumeDocument(null);
                setDocumentId(null);
                setLayout(undefined);
                setFileInfo(undefined);
                setSourceLabel(event.target.value ? "Pasted resume" : "");
              }}
              rows={9}
              placeholder="Or paste resume text here"
              className="bg-background ring-border focus:ring-accent w-full resize-y rounded-xl p-4 text-sm leading-6 ring-1 transition outline-none focus:ring-2"
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
            <label htmlFor={`${fieldIds}-target`} className="mb-2 block text-sm font-semibold">
              {useJobUrl ? "Job posting URL" : "Job description"}
            </label>
            {useJobUrl ? (
              <input
                id={`${fieldIds}-target`}
                value={jobUrl}
                onChange={(event) => setJobUrl(event.target.value)}
                type="url"
                placeholder="https://company.com/jobs/role"
                className="bg-background ring-border focus:ring-accent w-full rounded-xl px-4 py-3 text-sm ring-1 transition outline-none focus:ring-2"
              />
            ) : (
              <textarea
                id={`${fieldIds}-target`}
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
                detail={
                  quota && outOfScans
                    ? outOfScansDetail(quota)
                    : urlOnlyTarget
                      ? "Paste the job description for a job match score"
                      : "Best for a quick readiness check"
                }
                icon={ScanSearch}
                disabled={!hasResume || Boolean(busy) || urlOnlyTarget || outOfScans}
                busy={busy === "check"}
                onClick={() => void run(false)}
              />
              <ActionChoice
                title="Add AI interpretation"
                description="Explains missing evidence, keyword opportunities, and the best next edits."
                detail={
                  quota && outOfScans
                    ? outOfScansDetail(quota)
                    : useJobUrl && !jobUrl.trim()
                      ? "Enter the job URL to review it"
                      : pricing
                        ? `Uses ${creditRange(useJobUrl ? pricing.jobUrlAnalysisCredits : pricing.analysisCredits)}${available === null ? "" : ` · you have ${available}`}`
                        : "Price range loads before analysis"
                }
                icon={Sparkles}
                accent
                disabled={
                  !hasResume || Boolean(busy) || (useJobUrl && !jobUrl.trim()) || outOfScans
                }
                busy={busy === "ai"}
                onClick={() => void run(true)}
              />
            </div>
            {canRepair && pricing?.parseRepairCredits && !resumeDocument ? (
              <label className="text-muted mt-4 flex cursor-pointer items-start gap-2 text-xs leading-5">
                <input
                  type="checkbox"
                  className="accent-accent mt-0.5 h-3.5 w-3.5 shrink-0"
                  checked={repairParse}
                  disabled={Boolean(busy)}
                  onChange={(event) => setRepairParse(event.target.checked)}
                />
                <span>
                  With AI interpretation: if the parser misses parts of your history, re-read it
                  with AI (+{pricing.parseRepairCredits} credits, charged only when it runs). Values
                  the AI returns are kept only if they appear word for word in your resume.
                </span>
              </label>
            ) : null}
            {urlOnlyTarget ? (
              <p className="text-muted mt-4 flex items-start gap-2 text-xs leading-5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> A job URL is only read
                when you add AI interpretation — the core scan never fetches pages. Paste the
                description instead if you want a job match score without AI.
              </p>
            ) : null}
            {error ? (
              <p
                role="alert"
                className="bg-destructive/10 text-destructive mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {error.message}
                  {error.buyCredits ? (
                    <>
                      {" "}
                      <Link className="font-bold underline" href="/billing">
                        Get credits
                      </Link>
                    </>
                  ) : null}
                </span>
              </p>
            ) : null}
          </StepSection>

          <section className="bg-foreground text-background rounded-xl p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-xl">
                <div className="text-background/70 mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4" /> AI resume conversion
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
                aria-describedby={`${fieldIds}-convert-hint`}
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
            <p id={`${fieldIds}-convert-hint`} className="text-background/60 mt-4 text-xs">
              {hasResume ? null : "Add a resume in step 1 to prepare a draft. "}
              {pricing ? `Uses ${pricing.resumeConversionCredits} credits` : "Price loads securely"}
              {available === null ? "" : ` · you have ${available}`} · Nothing is created until you
              confirm
            </p>
            {quota?.canConvertResume === false ? (
              <p className="text-background/80 mt-2 text-xs">
                {conversionUnavailableReason(pricing, available)}{" "}
                {pricing ? (
                  <Link className="font-bold underline" href="/billing">
                    Get credits
                  </Link>
                ) : null}
              </p>
            ) : null}
          </section>
        </div>

        <aside
          ref={reportRef}
          tabIndex={-1}
          aria-label="ATS report"
          inert={!isLoggedIn}
          className={cn(
            "scroll-mt-20 space-y-5 outline-none xl:sticky xl:top-6 xl:self-start",
            !isLoggedIn && "pointer-events-none opacity-40 blur-[3px]",
          )}
        >
          {converted ? (
            <ConvertedResumeReview
              resume={converted}
              onCreate={() => void createConvertedResume()}
            />
          ) : result ? (
            <>
              {reportIsStale ? (
                <p className="bg-card ring-border text-muted flex items-start gap-2 rounded-xl px-4 py-3 text-xs leading-5 ring-1">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Your last report for this resume. It has changed since, so scan it again to check
                  the new version.
                </p>
              ) : null}
              <ResultsPanel result={result} />
            </>
          ) : (
            <EmptyResults />
          )}
        </aside>

        {!isLoggedIn ? (
          <div className="border-border bg-card/45 absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl border p-6 text-center backdrop-blur-sm">
            {/*
              `bg-accent-soft` and `text-muted-foreground` were both dead classes here: neither
              `--color-accent-soft` nor `--color-muted-foreground` is mapped in any app's
              `@theme` block, so the icon well rendered transparent and the help text inherited
              whatever colour happened to be in scope.
            */}
            <div className="bg-accent/10 text-accent flex h-12 w-12 items-center justify-center rounded-full">
              <LockKeyhole size={20} />
            </div>
            <h2 className="text-foreground mt-4 text-base font-black">Sign in to scan resumes</h2>
            <p className="text-muted mt-1.5 max-w-sm text-xs leading-5">
              ATS scanning, resume conversions, and gap analysis require a VeriWorkly account.
            </p>
            <button
              onClick={() => {
                router.push(`/login?callbackURL=${encodeURIComponent(window.location.href)}`);
              }}
              className="bg-accent text-accent-foreground hover:bg-accent/90 mt-5 inline-flex min-h-10 items-center justify-center rounded-lg px-5 text-xs font-bold transition"
            >
              Sign in
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function creditRange({ min, max }: { min: number; max: number }) {
  return min === max ? `${min} credits` : `${min}–${max} credits`;
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

function FileInput({
  busy,
  disabled,
  onFile,
}: {
  busy: boolean;
  disabled: boolean;
  onFile: (file: File) => Promise<void> | void;
}) {
  const input = useHiddenFileInput(onFile);

  return (
    <label
      className={cn(
        "bg-background ring-border hover:ring-foreground/35 flex min-h-24 cursor-pointer flex-col justify-between rounded-xl p-4 ring-1 transition",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{" "}
        Upload resume
      </span>
      <span className="text-muted mt-4 text-xs">PDF, DOCX, TXT, Markdown, or JSON · 5 MB max</span>
      <input
        type="file"
        accept=".pdf,.docx,.txt,.md,.json"
        className="sr-only"
        disabled={disabled}
        onChange={input.onChange}
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
      aria-pressed={active}
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

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-muted text-xs">{label}</p>
      <p className="mt-1 font-mono text-sm font-bold tabular-nums">{value}</p>
      {hint ? <p className="text-muted mt-0.5 text-xs">{hint}</p> : null}
    </div>
  );
}

/** The allowance and when it comes back (S-198), so running out is never a dead end. */
export function ScansLeftMetric({ quota, now }: { quota: AtsQuota | null; now?: number }) {
  return (
    <Metric
      label="Scans left"
      value={quota ? `${quota.remaining}/${quota.limit}` : "..."}
      hint={quota ? quotaResetLabel(quota, now) : undefined}
    />
  );
}

/** AI parse repair is offered only when it has a price and the server lets this account use it. */
export function canOfferRepair(quota: AtsQuota | null) {
  return typeof quota?.pricing?.parseRepairCredits === "number" && quota.canRepair !== false;
}

export function outOfScansDetail(quota: AtsQuota, now?: number) {
  return `No scans left in this period. ${quotaResetLabel(quota, now)}`;
}

function EmptyResults() {
  return (
    <div className="bg-card ring-border flex min-h-112 flex-col justify-between rounded-xl p-6 ring-1">
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

/** Marks a value a model recovered, so it is never shown as though the parser read it. */
function AiFilled() {
  return (
    <span className="bg-accent/10 text-accent ml-1.5 rounded px-1 py-px align-middle text-xs font-bold tracking-wide normal-case">
      AI
    </span>
  );
}

/**
 * The record an applicant tracking system would build from this document.
 *
 * Shown as the table it becomes, because that is what a recruiter searches. A blank employer or
 * a missing date range is not a presentation problem — it is a column their filter cannot match
 * on, and seeing the gap is more use than any score.
 */
function ParsedRecord({ parsed, repair }: { parsed: AtsParsedResume; repair?: AtsRepairSummary }) {
  const missing = <span className="text-amber-600 dark:text-amber-400">not found</span>;
  const filled = new Set(repair?.applied ? repair.fields : []);

  return (
    <section className="bg-card ring-border rounded-xl p-5 ring-1">
      <div className="flex items-center gap-2 text-sm font-black">
        <FileSearch className="text-accent h-4 w-4" /> What the ATS sees
      </div>
      <p className="text-muted mt-1 text-xs leading-5">
        {repair?.creditsSpent
          ? `Recovered by the scan, with AI re-reading for ${repair.creditsSpent} credits.`
          : "Recovered by the same scan, at no extra cost to your quota."}
      </p>
      {/*
        A repaired row and a parsed row are different claims: one is what a parser read, the
        other is what a model read. A real ATS would still see the unrepaired version, so the
        labelled fields are also the ones worth fixing in the document itself.
      */}
      {["name", "email", "phone", "roles"].some((field) => filled.has(field as AtsParsedField)) ? (
        <p className="bg-accent/10 mt-3 rounded-lg px-3 py-2 text-xs leading-5">
          Fields marked <AiFilled /> were missed by the parser and recovered by AI. An
          employer&apos;s ATS would not see them — restructure those parts of the resume so a parser
          can.
          {repair && repair.rejectedValues > 0
            ? ` ${repair.rejectedValues} AI value${repair.rejectedValues === 1 ? " was" : "s were"} discarded because ${repair.rejectedValues === 1 ? "it does" : "they do"} not appear in your resume.`
            : ""}
        </p>
      ) : null}

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        {(
          [
            ["Name", parsed.name, "name"],
            ["Email", parsed.email, "email"],
            ["Phone", parsed.phone, "phone"],
          ] as const
        ).map(([label, value, field]) => (
          <div key={label}>
            <dt className="text-muted text-xs font-semibold tracking-wide uppercase">
              {label}
              {filled.has(field) ? <AiFilled /> : null}
            </dt>
            <dd className="mt-0.5 text-sm break-words">{value || missing}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5">
        <p className="text-muted text-xs font-semibold tracking-wide uppercase">
          Work history — {parsed.roles.length} {parsed.roles.length === 1 ? "row" : "rows"}
          {filled.has("roles") ? <AiFilled /> : null}
        </p>
        {parsed.roles.length ? (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[460px] text-left text-sm">
              <thead>
                <tr className="border-border text-muted border-b text-xs">
                  <th className="pb-1.5 font-semibold">Title</th>
                  <th className="pb-1.5 font-semibold">Employer</th>
                  <th className="pb-1.5 font-semibold">Dates</th>
                </tr>
              </thead>
              <tbody>
                {parsed.roles.map((role, index) => (
                  <tr
                    key={`${role.title}-${index}`}
                    className="border-border/60 border-b last:border-0"
                  >
                    <td className="py-2 pr-3">{role.title || missing}</td>
                    <td className="py-2 pr-3">{role.employer || missing}</td>
                    <td className="py-2 tabular-nums">{formatRoleDates(role) ?? missing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            No work history could be recovered. Give each role an employer, a title and a date range
            on one line — a parser builds its rows from exactly those three fields.
          </p>
        )}
      </div>

      {parsed.monthsOfExperience !== null ? (
        <p className="text-muted border-border mt-4 border-t pt-3 text-sm">
          Total experience read from your dates:{" "}
          <span className="text-foreground font-semibold tabular-nums">
            {formatTenure(parsed.monthsOfExperience)}
          </span>{" "}
          — overlapping roles counted once.
        </p>
      ) : null}
    </section>
  );
}

const TONE_FILL = { good: "bg-emerald-500", warn: "bg-amber-500", bad: "bg-red-500" } as const;

function CategoryRollup({ categories }: { categories: AtsResult["report"]["categories"] }) {
  if (!categories?.length) return null;

  const ordered = sortByCategoryOrder(categories);

  return (
    <section className="bg-card ring-border rounded-xl p-5 ring-1">
      <h2 className="text-sm font-black">Where the score went</h2>
      <ul className="mt-4 space-y-3.5">
        {ordered.map((entry) => (
          <li key={entry.category}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="font-semibold">{categoryLabel(entry.category)}</span>
              <span className="text-muted tabular-nums">
                {entry.passed}/{entry.total} · {entry.score}%
              </span>
            </div>
            <div
              className="bg-background mt-1.5 h-1.5 w-full overflow-hidden rounded-full"
              role="meter"
              aria-valuenow={entry.score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${categoryLabel(entry.category)}: ${entry.score} percent`}
            >
              <div
                className={cn("h-full rounded-full", TONE_FILL[scoreTone(entry.score)])}
                style={{ width: `${Math.max(entry.score, 2)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The engine already ranks failures by the points each one recovers, and Studio was throwing
 * that away by rendering `prioritizedFixes` as a flat string list. Showing the evidence and the
 * recoverable points beside each fix turns the list into an order of operations.
 */
function RankedFixes({ failedChecks }: { failedChecks: AtsResult["report"]["failedChecks"] }) {
  if (!failedChecks.length) return null;
  const ranked = [...failedChecks].sort((a, b) => b.scoreImpact - a.scoreImpact);

  return (
    <section className="bg-card ring-border rounded-xl p-5 ring-1">
      <h2 className="text-sm font-black">Fix these first</h2>
      <ol className="mt-4 space-y-4">
        {ranked.map((rule, index) => (
          <li
            key={rule.id}
            className="border-border flex gap-3 border-t pt-4 first:border-t-0 first:pt-0"
          >
            <span className="bg-accent/10 text-accent mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold tabular-nums">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-5 font-medium">{rule.fix}</p>
              <p className="text-muted mt-1 text-xs leading-5">{rule.evidence}</p>
              {rule.scoreImpact > 0 ? (
                <span className="bg-background mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums">
                  +{Math.round(rule.scoreImpact)} pts if fixed
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ResultsPanel({ result }: { result: AtsResult }) {
  // `creditsSpent` is the analysis alone; the repair is charged separately.
  const repairCredits = result.repair?.creditsSpent ?? 0;

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
        {/*
          Studio and the API deploy separately, so a server one version behind omits these
          fields entirely. Rendering the line only when the counts are present beats printing
          "undefined of undefined checks passed".
        */}
        {result.report.checksTotal ? (
          <p className="text-background/65 mt-3 text-xs">
            {result.report.checksPassed} of {result.report.checksTotal} checks passed
            {result.report.wordCount ? ` · ${result.report.wordCount.toLocaleString()} words` : ""}
          </p>
        ) : null}
      </div>
      {result.report.parsed ? (
        <ParsedRecord parsed={result.report.parsed} repair={result.repair} />
      ) : null}
      {result.report.parsingWarnings?.length ? (
        <ul className="space-y-1.5 px-1">
          {result.report.parsingWarnings.map((warning) => (
            <li key={warning} className="text-muted flex items-start gap-2 text-xs leading-5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              {warning}
            </li>
          ))}
        </ul>
      ) : null}
      {result.repair?.unusable ? (
        <p className="text-muted flex items-start gap-2 px-1 text-xs leading-5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          The AI found nothing to add to what was read. Nothing was charged for the re-read.
        </p>
      ) : result.repair?.available &&
        !result.repair.applied &&
        !result.repair.creditsSpent &&
        result.quota.canRepair !== false &&
        typeof result.quota.pricing?.parseRepairCredits === "number" ? (
        <p className="text-muted flex items-start gap-2 px-1 text-xs leading-5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          The parser missed parts of this resume and nothing was recovered this time. AI re-reading,
          under the scan options, can recover them on the next AI interpretation.
        </p>
      ) : null}
      <CategoryRollup categories={result.report.categories} />
      <RankedFixes failedChecks={result.report.failedChecks} />
      {result.report.jobMatchScore !== null ? (
        <>
          <ReportList title="Matched keywords" items={result.report.matchedKeywords} />
          <ReportList title="Missing keywords" items={result.report.missingKeywords} warning />
        </>
      ) : null}
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
      {/*
       * The AI layer was asked for and could not run. Saying so is the point: an empty `ai`
       * field on its own is indistinguishable from a model that had nothing to add, and the
       * user has no way to tell that the failure was ours. The scan was handed back, so say
       * that too rather than leaving them to work out whether they were charged.
       */}
      {result.aiStatus === "unavailable" ? (
        <section className="rounded-xl bg-amber-500/10 p-5 ring-1 ring-amber-500/30">
          <div className="flex items-center gap-2 text-sm font-black text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" /> AI analysis did not run
          </div>
          <p className="mt-2 text-sm leading-6">
            We could not reach a model for this scan, so only the deterministic report above was
            produced. Nothing was charged for the analysis and this scan was returned to your
            allowance — please try again shortly.
            {repairCredits
              ? ` The AI re-read of your resume did run and used ${repairCredits} credits.`
              : ""}
          </p>
        </section>
      ) : null}
      <ReportList title="What already works" items={result.report.strengths} />
      <p className="text-muted px-1 text-xs">
        {result.creditsSpent + repairCredits
          ? `${result.creditsSpent + repairCredits} credits used · `
          : ""}
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
          items.map((item, index) => (
            <li key={`${index}-${item}`} className="flex gap-2.5 text-sm leading-5">
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
