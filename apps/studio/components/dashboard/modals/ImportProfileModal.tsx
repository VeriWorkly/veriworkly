"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, Loader2, Lock, AlertCircle } from "lucide-react";
import { Button, Modal, Input, TextArea, Checkbox, Badge } from "@veriworkly/ui";
import { toast } from "sonner";

import { useSessionUser } from "@/store/session-user";
import { fetchApiData } from "@/utils/fetchApiData";
import { linkGithubAccount, signInHref } from "@/lib/sign-in";
import { extractResumeFile, getAtsQuota } from "@/features/ats/ats-api";
import { describePaidActionError } from "@/features/credits/credit-errors";
import { getDocumentEditorPath } from "@/features/documents/core/routes";
import { listDocuments } from "@/features/documents/services/document-workspace-service";
import {
  FREE_DOCUMENTS_PER_TYPE,
  freeLimitMessage,
} from "@/features/documents/services/document-limit";
import type { BillingSummary } from "@/features/billing/types";
import ConfirmDialog from "@/components/modals/ConfirmDialog";

/** Said under the "Replace" option and again before it runs: the curated profile is overwritten. */
export const REPLACE_MASTER_NOTICE =
  "Overwrites your current Master Profile with what the import reads. This cannot be undone.";

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const GithubIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

interface QuotaDetails {
  /** A subscription or pass (the server's paid predicate); credit packs alone are not. */
  isPaid: boolean;
  /** No limit at all (a paid LinkedIn import); `limit` and `remaining` are then null. */
  unlimited: boolean;
  remaining: number | null;
  limit: number | null;
  resetsInSeconds: number;
  connectedUsername: string | null;
  /** GitHub only: whether a GitHub login is linked, whatever GitHub answers about its token. */
  hasGithubAccount?: boolean;
}

/** Said before linking: the server keeps one GitHub account per user, for good. */
export const GITHUB_LINK_NOTICE =
  "You can link one GitHub account. It can't be changed or removed later.";

/** What the GitHub import reads, by plan, as `importFromGithub` enforces it. */
export function githubImportNote(isPaid: boolean) {
  return isPaid
    ? "You can import any public GitHub profile by username."
    : "Free accounts import from the GitHub account linked to them.";
}

/**
 * Whether a free account can import its own GitHub profile: no GitHub login linked, one linked
 * but unreadable (its token no longer works), or ready.
 */
export function githubImportState(quota: QuotaDetails) {
  if (quota.connectedUsername) return "ready";
  return quota.hasGithubAccount === false ? "needs-sign-in" : "unreadable";
}

/** The allowance line, from the server's own figures (V-197): paid GitHub has a real daily cap. */
export function importAllowanceLabel(tab: "linkedin" | "github", quota: QuotaDetails) {
  if (quota.unlimited) return "No import limit";
  if (quota.isPaid) return `${quota.remaining} / ${quota.limit} left today`;
  return `${quota.remaining} / ${quota.limit} left · rolling ${tab === "linkedin" ? "30 days" : "24 hours"}`;
}

interface QuotaResponse {
  github: QuotaDetails;
  linkedin: QuotaDetails;
}

interface ImportedDocument {
  id: string;
  type: "RESUME" | "COVER_LETTER";
}

/**
 * The LinkedIn import is an AI conversion billed at the resume-conversion price
 * (`profileImportService`), so the form says what it costs and what the user has. `short` when
 * the balance cannot cover it: the server would answer 402 before running anything.
 */
export function linkedinImportCostNote(cost: number | null, available: number | null) {
  if (cost === null) return { text: "Uses AI credits", short: false };

  return {
    text:
      available === null ? `Uses ${cost} credits` : `Uses ${cost} credits · you have ${available}`,
    short: available !== null && available < cost,
  };
}

export function ImportProfileModal({
  open,
  onClose,
  initialProvider = "linkedin",
}: {
  open: boolean;
  onClose: () => void;
  initialProvider?: "linkedin" | "github";
}) {
  const router = useRouter();
  const isLoggedIn = Boolean(useSessionUser()?.email);

  const [activeTab, setActiveTab] = useState<"linkedin" | "github">(initialProvider);
  const [replaceMaster, setReplaceMaster] = useState(false);
  // Which import waits for the user to confirm replacing their Master Profile.
  const [confirmReplace, setConfirmReplace] = useState<"linkedin" | "github" | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");

  // GitHub state
  const [githubInput, setGithubInput] = useState("");

  // LinkedIn state
  const [linkedinText, setLinkedinText] = useState("");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quota states
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  // Only to name a credit-pack buyer as a paying customer; limits come from `quota`.
  const [accessTier, setAccessTier] = useState<BillingSummary["access"]["tier"] | null>(null);
  const [creditsAvailable, setCreditsAvailable] = useState<number | null>(null);
  const [importCost, setImportCost] = useState<number | null>(null);
  // An import makes a new resume, so a free account that already has one is told before it
  // pastes or uploads anything, not by the server's 402 after. Counted on mount too: the hosts
  // mount this modal already open.
  const [resumeCount, setResumeCount] = useState(() => (open ? listDocuments("RESUME").length : 0));

  // Sync state during rendering instead of useEffect to avoid synchronous setState inside effects.
  // Resets *all* per-session state on every reopen (not just activeTab) so a previous
  // session's partially-filled form/quota never leaks into the next time the modal opens.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setActiveTab(initialProvider);
      setGithubInput("");
      setLinkedinText("");
      setReplaceMaster(false);
      setQuota(null);
      setAccessTier(null);
      setCreditsAvailable(null);
      setImportCost(null);
      setResumeCount(listDocuments("RESUME").length);
    }
  }

  useEffect(() => {
    if (!open || !isLoggedIn) return;

    let active = true;
    const fetchQuota = async () => {
      try {
        const data = await fetchApiData<QuotaResponse>("/profiles/import/quota");
        if (!active) return;
        setQuota(data);
        // Prefill the GitHub field with the connected username, but only if the user
        // hasn't already typed something — checked via functional update so this
        // effect doesn't need `githubInput` as a dependency (which would otherwise
        // re-fire this network request on every keystroke while the modal is open).
        setGithubInput((current) =>
          current ? current : (data?.github?.connectedUsername ?? current),
        );
      } catch (error) {
        if (!active) return;
        toast.error(
          `Could not load your import allowance: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    };

    void fetchQuota();
    // A failed read leaves the badge out rather than guessing "Free" for a paying customer.
    void fetchApiData<BillingSummary>("/billing/me")
      .then((billing) => {
        if (!active) return;
        setAccessTier(billing.access.tier);
        setCreditsAvailable(billing.credits.available);
      })
      .catch(() => undefined);
    // The price is said only once known; without it the note still says credits are spent.
    void getAtsQuota()
      .then((ats) => {
        if (active) setImportCost(ats.pricing?.resumeConversionCredits ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [open, isLoggedIn]);

  if (!open) return null;

  const currentTabQuota = quota ? quota[activeTab] : null;
  const isPaidUser = currentTabQuota?.isPaid ?? false;
  // Paid GitHub has a real daily cap too, so the block follows the quota, not the plan.
  const isTabBlocked =
    currentTabQuota !== null && !currentTabQuota.unlimited && (currentTabQuota.remaining ?? 1) <= 0;
  const atDocumentLimit = quota !== null && !isPaidUser && resumeCount >= FREE_DOCUMENTS_PER_TYPE;
  const linkedinCost = linkedinImportCostNote(importCost, creditsAvailable);
  const accessBadge = isPaidUser
    ? "Subscription or pass"
    : accessTier === "credits"
      ? "Credits customer"
      : accessTier === "free"
        ? "Free"
        : null;

  // Handle PDF Upload & Extraction
  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file exported from LinkedIn.");
      return;
    }

    setUploadingPdf(true);
    setLoadingStep("Reading PDF text content...");
    try {
      const { text } = await extractResumeFile(file);
      setLinkedinText(text);
      toast.success("LinkedIn PDF parsed successfully! Check the pasted text below.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to read PDF file.");
    } finally {
      setUploadingPdf(false);
      setLoadingStep("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Submit GitHub Import
  const handleGithubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubInput.trim()) {
      toast.error("Please enter a GitHub username or profile link.");
      return;
    }

    if (replaceMaster) setConfirmReplace("github");
    else void runGithubImport();
  };

  const runGithubImport = async () => {
    setLoading(true);
    setLoadingStep("Fetching your GitHub profile...");
    try {
      const doc = await fetchApiData<ImportedDocument>("/profiles/import/github", {
        method: "POST",
        body: JSON.stringify({
          usernameOrUrl: githubInput.trim(),
          replaceMaster,
        }),
      });

      toast.success("GitHub profile imported successfully!");
      onClose();
      // Notify library components
      window.dispatchEvent(new Event("storage"));
      router.push(getDocumentEditorPath(doc.type, doc.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "GitHub import failed.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  // Submit LinkedIn Import
  const handleLinkedinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedinText.trim()) {
      toast.error("Please paste profile text or upload a LinkedIn PDF.");
      return;
    }

    if (replaceMaster) setConfirmReplace("linkedin");
    else void runLinkedinImport();
  };

  const runLinkedinImport = async () => {
    setLoading(true);
    setLoadingStep("Parsing LinkedIn details via AI...");
    try {
      const doc = await fetchApiData<ImportedDocument>("/profiles/import/linkedin", {
        method: "POST",
        body: JSON.stringify({
          profileText: linkedinText.trim(),
          replaceMaster,
        }),
      });

      toast.success("LinkedIn profile parsed successfully!");
      onClose();
      // Notify library components
      window.dispatchEvent(new Event("storage"));
      router.push(getDocumentEditorPath(doc.type, doc.id));
    } catch (error) {
      const failure = describePaidActionError(error, "LinkedIn import failed.");
      toast.error(
        failure.message,
        failure.buyCredits
          ? { action: { label: "Open billing", onClick: () => router.push("/billing") } }
          : undefined,
      );
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  // Format resets remaining time
  const formatResetsTime = (seconds: number) => {
    if (seconds <= 0) return "soon";
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  return (
    // Escape and the backdrop wait for an import in flight, like the close button: closing
    // mid-import would still open the imported document when the request lands.
    <Modal open={open} onClose={loading || uploadingPdf ? () => undefined : onClose}>
      <Modal.Content
        titleId="import-profile-title"
        className="w-full max-w-xl overflow-hidden rounded-2xl p-0"
        descriptionId="import-profile-description"
      >
        {/* Header */}
        <div className="border-border/70 from-card to-background flex items-start justify-between border-b bg-linear-to-r p-5 sm:p-6">
          <div>
            <span className="text-accent text-xs font-bold tracking-[0.2em] uppercase">Import</span>
            <h2
              id="import-profile-title"
              className="mt-1.5 flex items-center gap-2 text-2xl font-black tracking-tight"
            >
              Import from Profile
            </h2>
            <p id="import-profile-description" className="text-muted mt-1 text-xs">
              Turn your LinkedIn or GitHub profile into a new resume you can edit.
            </p>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            aria-label="Close import profile modal"
            className="text-muted hover:bg-card flex h-8 w-8 items-center justify-center rounded-lg transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Guest Mode Redirect */}
        {!isLoggedIn ? (
          <div className="space-y-4 p-6 text-center">
            <div className="bg-accent/10 text-accent mx-auto flex h-12 w-12 items-center justify-center rounded-2xl">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold">Authentication required</h3>
            <p className="text-muted mx-auto max-w-sm text-xs leading-5">
              Imports create a resume in your account. Sign in to import a LinkedIn or GitHub
              profile.
            </p>
            <div className="pt-2">
              <Button size="sm" variant="primary" onClick={() => router.push(signInHref())}>
                Sign in to VeriWorkly
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Selectors */}
            <div
              role="tablist"
              aria-label="Import source"
              className="border-border/60 bg-card/40 flex border-b px-4 pt-2"
            >
              <button
                type="button"
                role="tab"
                id="import-tab-linkedin"
                aria-selected={activeTab === "linkedin"}
                aria-controls="import-tab-panel"
                disabled={loading}
                onClick={() => setActiveTab("linkedin")}
                className={`focus-visible:ring-accent/40 flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-semibold transition outline-none focus-visible:ring-2 ${
                  activeTab === "linkedin"
                    ? "border-accent text-accent"
                    : "text-muted-foreground hover:text-foreground border-transparent"
                }`}
              >
                <LinkedinIcon className="h-4 w-4" />
                LinkedIn
              </button>
              <button
                type="button"
                role="tab"
                id="import-tab-github"
                aria-selected={activeTab === "github"}
                aria-controls="import-tab-panel"
                disabled={loading}
                onClick={() => setActiveTab("github")}
                className={`focus-visible:ring-accent/40 flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-semibold transition outline-none focus-visible:ring-2 ${
                  activeTab === "github"
                    ? "border-accent text-accent"
                    : "text-muted-foreground hover:text-foreground border-transparent"
                }`}
              >
                <GithubIcon className="h-4 w-4" />
                GitHub
              </button>
            </div>

            {/* Quota Indicators */}
            {quota && (
              <div className="border-border/60 bg-card/20 flex items-center justify-between border-b px-6 py-2.5 text-xs">
                <div className="text-muted-foreground flex items-center gap-1">
                  <span>Imports:</span>
                  {accessBadge ? (
                    <Badge
                      className={`rounded border-none px-1.5 py-0.5 text-xs font-bold ${accessBadge === "Free" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}`}
                    >
                      {accessBadge}
                    </Badge>
                  ) : null}
                </div>

                {currentTabQuota ? (
                  <span
                    className={`font-semibold ${(currentTabQuota.remaining ?? 1) > 0 ? "text-accent" : "text-destructive"}`}
                  >
                    {importAllowanceLabel(activeTab, currentTabQuota)}
                  </span>
                ) : null}
              </div>
            )}

            <div
              role="tabpanel"
              id="import-tab-panel"
              aria-labelledby={`import-tab-${activeTab}`}
              className="p-6"
            >
              {/* Limit Blocked View */}
              {atDocumentLimit ? (
                <div className="border-destructive/20 bg-destructive/5 text-destructive space-y-2 rounded-xl border p-4">
                  <div className="flex gap-2">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold">You already have a resume</h4>
                      <p className="text-muted-foreground mt-1 text-xs leading-5">
                        An import creates a new resume. {freeLimitMessage("RESUME")}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button size="sm" variant="primary" onClick={() => router.push("/billing")}>
                      See plans
                    </Button>
                  </div>
                </div>
              ) : isTabBlocked ? (
                <div className="border-destructive/20 bg-destructive/5 text-destructive space-y-2 rounded-xl border p-4">
                  <div className="flex gap-2">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold">Limit reached</h4>
                      <p className="text-muted-foreground mt-1 text-xs leading-5">
                        {activeTab === "linkedin"
                          ? "Without a subscription or pass, LinkedIn imports are limited to one every 30 days."
                          : "Without a subscription or pass, GitHub imports are limited to one every 24 hours."}{" "}
                        A subscription or pass lifts this limit.
                      </p>
                    </div>
                  </div>
                  {currentTabQuota && currentTabQuota.resetsInSeconds > 0 && (
                    <p className="text-muted-foreground pt-1 text-xs">
                      Quota resets in:{" "}
                      <span className="text-foreground font-bold">
                        {formatResetsTime(currentTabQuota.resetsInSeconds)}
                      </span>
                    </p>
                  )}
                  <div className="pt-2">
                    <Button size="sm" variant="primary" onClick={() => router.push("/billing")}>
                      See plans
                    </Button>
                  </div>
                </div>
              ) : (
                /* Main Forms */
                <div className="space-y-5">
                  {activeTab === "linkedin" ? (
                    <form onSubmit={handleLinkedinSubmit} className="space-y-4">
                      {/* LinkedIn Upload PDF */}
                      <div>
                        <p
                          id="linkedin-pdf-option"
                          className="text-muted-foreground mb-2 block text-xs font-bold uppercase"
                        >
                          Option 1: Upload LinkedIn Profile PDF
                        </p>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="application/pdf"
                          onChange={handlePdfUpload}
                          className="hidden"
                          disabled={loading || uploadingPdf}
                        />
                        <button
                          type="button"
                          aria-describedby="linkedin-pdf-option"
                          disabled={loading || uploadingPdf}
                          onClick={() => fileInputRef.current?.click()}
                          className="border-border hover:border-accent/40 bg-card/40 group flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed py-6 transition"
                        >
                          {uploadingPdf ? (
                            <Loader2 className="text-accent h-8 w-8 animate-spin" />
                          ) : (
                            <Upload className="text-muted group-hover:text-accent h-8 w-8 transition" />
                          )}
                          <span className="mt-2 text-xs font-bold">
                            {uploadingPdf ? "Reading file..." : "Upload Profile PDF"}
                          </span>
                          <span className="text-muted-foreground mt-1 text-xs">
                            Go to LinkedIn &gt; More &gt; Save to PDF, then upload here.
                          </span>
                        </button>
                      </div>

                      {/* Divider */}
                      <div className="text-muted-foreground flex items-center gap-3 py-1 text-xs font-bold uppercase">
                        <div className="bg-border/80 h-px flex-1"></div>
                        <span>or</span>
                        <div className="bg-border/80 h-px flex-1"></div>
                      </div>

                      {/* Paste Text */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="linkedin-paste"
                          className="text-muted-foreground block text-xs font-bold uppercase"
                        >
                          Option 2: Paste LinkedIn Profile Text
                        </label>
                        <TextArea
                          id="linkedin-paste"
                          value={linkedinText}
                          onChange={(e) => setLinkedinText(e.target.value)}
                          placeholder="Select all on your LinkedIn profile page (Ctrl+A / Cmd+A), copy, and paste the entire raw text here..."
                          disabled={loading || uploadingPdf}
                          className="min-h-36 font-sans text-xs"
                        />
                      </div>

                      <p
                        className={`text-xs font-semibold ${linkedinCost.short ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        {linkedinCost.text}
                        {linkedinCost.short ? (
                          <>
                            {" "}
                            · not enough credits.{" "}
                            <button
                              type="button"
                              className="text-accent underline"
                              onClick={() => router.push("/billing")}
                            >
                              Buy credits
                            </button>
                          </>
                        ) : null}
                      </p>

                      <div className="border-border/60 flex items-center justify-between gap-4 border-t pt-2">
                        <Checkbox
                          id="replace-master-linkedin"
                          checked={replaceMaster}
                          onCheckedChange={setReplaceMaster}
                          label="Replace my Master Profile with this data"
                          disabled={loading || uploadingPdf}
                        />
                        <span className="sr-only">{REPLACE_MASTER_NOTICE}</span>

                        <Button
                          type="submit"
                          size="sm"
                          variant="primary"
                          disabled={
                            loading || uploadingPdf || !linkedinText.trim() || linkedinCost.short
                          }
                          className="gap-2"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>{loadingStep || "Parsing..."}</span>
                            </>
                          ) : (
                            <span>Import &amp; Parse</span>
                          )}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleGithubSubmit} className="space-y-4">
                      {/* GitHub input */}
                      <div className="space-y-2">
                        <label
                          htmlFor="github-username"
                          className="text-muted-foreground block text-xs font-bold uppercase"
                        >
                          GitHub Username or URL
                        </label>
                        <div className="relative">
                          <Input
                            id="github-username"
                            value={githubInput}
                            onChange={(e) => setGithubInput(e.target.value)}
                            placeholder={
                              !isPaidUser && currentTabQuota?.connectedUsername
                                ? currentTabQuota.connectedUsername
                                : "e.g., torvalds or https://github.com/torvalds"
                            }
                            disabled={loading || !isPaidUser}
                            className="pr-10"
                          />
                          {!isPaidUser && (
                            <span className="text-muted-foreground absolute top-3 right-3 cursor-not-allowed">
                              <Lock className="h-4 w-4" />
                            </span>
                          )}
                        </div>

                        {!isPaidUser &&
                        currentTabQuota &&
                        githubImportState(currentTabQuota) !== "ready" ? (
                          <div className="flex gap-2 rounded-xl border border-amber-500/10 bg-amber-500/5 p-3 text-xs leading-5 text-amber-500">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                              {githubImportState(currentTabQuota) === "needs-sign-in" ? (
                                <>
                                  <p className="font-bold">Link your GitHub account</p>
                                  <p className="text-muted-foreground mt-0.5 text-xs">
                                    Your account has no GitHub login, so there is no GitHub profile
                                    of yours to read. Link GitHub to import your own profile, use
                                    LinkedIn import, or get a subscription or pass to import any
                                    public GitHub profile.
                                  </p>
                                  <p className="mt-1 text-xs font-semibold">{GITHUB_LINK_NOTICE}</p>
                                </>
                              ) : (
                                <>
                                  <p className="font-bold">Your GitHub account could not be read</p>
                                  <p className="text-muted-foreground mt-0.5 text-xs">
                                    Your account is linked to GitHub, but GitHub did not let us read
                                    your profile. Reconnect GitHub, use LinkedIn import, or get a
                                    subscription or pass to import any public GitHub profile.
                                  </p>
                                </>
                              )}
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() =>
                                    void linkGithubAccount().catch((error: unknown) =>
                                      toast.error(
                                        error instanceof Error
                                          ? error.message
                                          : "Linking GitHub could not start.",
                                      ),
                                    )
                                  }
                                >
                                  {githubImportState(currentTabQuota) === "needs-sign-in"
                                    ? "Link GitHub"
                                    : "Reconnect GitHub"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setActiveTab("linkedin")}
                                >
                                  Use LinkedIn import
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => router.push("/billing")}
                                >
                                  See plans
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-xs leading-5">
                            {currentTabQuota || isPaidUser
                              ? githubImportNote(isPaidUser)
                              : "Checking your GitHub sign-in..."}
                          </p>
                        )}
                      </div>

                      <div className="border-border/60 flex items-center justify-between gap-4 border-t pt-2">
                        <Checkbox
                          id="replace-master-github"
                          checked={replaceMaster}
                          onCheckedChange={setReplaceMaster}
                          label="Replace my Master Profile with this data"
                          disabled={loading}
                        />
                        <span className="sr-only">{REPLACE_MASTER_NOTICE}</span>

                        <Button
                          type="submit"
                          size="sm"
                          variant="primary"
                          disabled={loading || !githubInput.trim()}
                          className="gap-2"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>{loadingStep || "Importing..."}</span>
                            </>
                          ) : (
                            <span>Import &amp; Parse</span>
                          )}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </Modal.Content>

      <ConfirmDialog
        tone="warning"
        open={confirmReplace !== null}
        title="Replace your Master Profile?"
        description={REPLACE_MASTER_NOTICE}
        confirmLabel="Replace and import"
        onClose={() => setConfirmReplace(null)}
        onConfirm={() => {
          const target = confirmReplace;

          setConfirmReplace(null);
          if (target === "linkedin") void runLinkedinImport();
          if (target === "github") void runGithubImport();
        }}
      />
    </Modal>
  );
}
