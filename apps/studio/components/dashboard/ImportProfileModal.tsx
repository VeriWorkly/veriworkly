"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, FileText, Upload, Loader2, Lock, AlertCircle, CheckCircle } from "lucide-react";
import { Button, Modal, Input, TextArea, Checkbox, Badge } from "@veriworkly/ui";
import { toast } from "sonner";

import { useUserStore } from "@/store/useUserStore";
import { fetchApiData } from "@/utils/fetchApiData";
import { extractResumeFile } from "@/features/ats/ats-api";
import { getDocumentEditorPath } from "@/features/documents/core/routes";

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

interface QuotaDetails {
  isPaid: boolean;
  remaining: number;
  limit: number;
  resetsInSeconds: number;
  connectedUsername: string | null;
}

interface QuotaResponse {
  github: QuotaDetails;
  linkedin: QuotaDetails;
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
  const { isLoggedIn, user } = useUserStore();

  const [activeTab, setActiveTab] = useState<"linkedin" | "github">(initialProvider);
  const [replaceMaster, setReplaceMaster] = useState(false);
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
  const [fetchingQuota, setFetchingQuota] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveTab(initialProvider);
    }
  }, [open, initialProvider]);

  // Fetch Quota Status
  const fetchQuota = async () => {
    if (!isLoggedIn) return;
    setFetchingQuota(true);
    try {
      const data = await fetchApiData<QuotaResponse>("/profiles/import/quota");
      setQuota(data);
      // Pre-fill GitHub username for free users if connected
      if (data?.github?.connectedUsername && !githubInput) {
        setGithubInput(data.github.connectedUsername);
      }
    } catch (error) {
      console.error("Failed to fetch import quota:", error);
    } finally {
      setFetchingQuota(false);
    }
  };

  useEffect(() => {
    if (open && isLoggedIn) {
      fetchQuota();
    }
  }, [open, isLoggedIn]);

  if (!open) return null;

  const currentTabQuota = quota ? quota[activeTab] : null;
  const isPaidUser = currentTabQuota?.isPaid ?? false;
  const isTabBlocked = !isPaidUser && currentTabQuota !== null && currentTabQuota.remaining <= 0;

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
      const text = await extractResumeFile(file);
      setLinkedinText(text);
      toast.success("LinkedIn PDF parsed successfully! Check the pasted text below.");
    } catch (error: any) {
      toast.error(error.message || "Failed to read PDF file.");
    } finally {
      setUploadingPdf(false);
      setLoadingStep("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Submit GitHub Import
  const handleGithubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubInput.trim()) {
      toast.error("Please enter a GitHub username or profile link.");
      return;
    }

    setLoading(true);
    setLoadingStep("Fetching details from GitHub API...");
    try {
      const doc = await fetchApiData<any>("/profiles/import/github", {
        method: "POST",
        body: JSON.stringify({
          usernameOrUrl: githubInput.trim(),
          replaceMaster,
        }),
      });

      setLoadingStep("Parsing profile via AI...");
      toast.success("GitHub profile imported successfully!");
      onClose();
      // Notify library components
      window.dispatchEvent(new Event("storage"));
      router.push(getDocumentEditorPath(doc.type, doc.id));
    } catch (error: any) {
      toast.error(error.message || "GitHub import failed.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  // Submit LinkedIn Import
  const handleLinkedinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedinText.trim()) {
      toast.error("Please paste profile text or upload a LinkedIn PDF.");
      return;
    }

    setLoading(true);
    setLoadingStep("Parsing LinkedIn details via AI...");
    try {
      const doc = await fetchApiData<any>("/profiles/import/linkedin", {
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
    } catch (error: any) {
      toast.error(error.message || "LinkedIn import failed.");
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
    <Modal open={open} onClose={onClose}>
      <Modal.Content
        titleId="import-profile-title"
        className="w-full max-w-xl overflow-hidden p-0 rounded-2xl"
        descriptionId="import-profile-description"
      >
        {/* Header */}
        <div className="border-border/70 bg-gradient-to-r from-card to-background flex items-start justify-between border-b p-5 sm:p-6">
          <div>
            <span className="text-accent text-[10px] font-bold tracking-[0.2em] uppercase">AI Import</span>
            <h2 id="import-profile-title" className="mt-1.5 text-2xl font-black tracking-tight flex items-center gap-2">
              Import from Profile
            </h2>
            <p id="import-profile-description" className="text-muted mt-1 text-xs">
              Convert your profile page or experience history directly to a premium resume.
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
          <div className="p-6 text-center space-y-4">
            <div className="bg-accent/10 text-accent mx-auto flex h-12 w-12 items-center justify-center rounded-2xl">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold">Authentication required</h3>
            <p className="text-muted max-w-sm mx-auto text-xs leading-5">
              Profile parsing requires backend AI compute resources. Sign in to import LinkedIn or GitHub profiles.
            </p>
            <div className="pt-2">
              <Button size="sm" variant="primary" onClick={() => router.push("/login")}>
                Sign in to VeriWorkly
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Selectors */}
            <div className="border-border/60 bg-card/40 flex border-b px-4 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setActiveTab("linkedin")}
                className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-semibold transition outline-none ${
                  activeTab === "linkedin"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <LinkedinIcon className="h-4 w-4" />
                LinkedIn
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => setActiveTab("github")}
                className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-semibold transition outline-none ${
                  activeTab === "github"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <GithubIcon className="h-4 w-4" />
                GitHub
              </button>
            </div>

            {/* Quota Indicators */}
            {quota && (
              <div className="border-border/60 bg-card/20 border-b px-6 py-2.5 flex items-center justify-between text-[11px]">
                <div className="text-muted-foreground flex items-center gap-1">
                  <span>Usage quota:</span>
                  {isPaidUser ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-bold py-0.5 px-1.5 rounded text-[10px]">
                      Creator Pro (Unlimited)
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/10 text-amber-500 border-none font-bold py-0.5 px-1.5 rounded text-[10px]">
                      Free Plan
                    </Badge>
                  )}
                </div>

                {!isPaidUser && currentTabQuota && (
                  <span className={`font-semibold ${currentTabQuota.remaining > 0 ? "text-accent" : "text-destructive"}`}>
                    {currentTabQuota.remaining} / {currentTabQuota.limit} left this {activeTab === "linkedin" ? "month" : "day"}
                  </span>
                )}
              </div>
            )}

            <div className="p-6">
              {/* Limit Blocked View */}
              {isTabBlocked ? (
                <div className="border-destructive/20 bg-destructive/5 text-destructive rounded-xl border p-4 space-y-2">
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold">Limit reached</h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-5">
                        {activeTab === "linkedin"
                          ? "LinkedIn profile imports are limited to once a month for free accounts."
                          : "GitHub profile imports are limited to once a day for free accounts."}
                        {" "}Upgrade to a premium plan to remove all limits immediately.
                      </p>
                    </div>
                  </div>
                  {currentTabQuota && currentTabQuota.resetsInSeconds > 0 && (
                    <p className="text-[10px] text-muted-foreground pt-1">
                      Quota resets in: <span className="font-bold text-foreground">{formatResetsTime(currentTabQuota.resetsInSeconds)}</span>
                    </p>
                  )}
                  <div className="pt-2">
                    <Button size="sm" variant="primary" onClick={() => router.push("/billing")}>
                      Upgrade Plan
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
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
                          Option 1: Upload LinkedIn Profile PDF
                        </label>
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
                          disabled={loading || uploadingPdf}
                          onClick={() => fileInputRef.current?.click()}
                          className="border-dashed border-2 border-border hover:border-accent/40 bg-card/40 flex flex-col items-center justify-center w-full rounded-2xl py-6 transition group"
                        >
                          {uploadingPdf ? (
                            <Loader2 className="h-8 w-8 text-accent animate-spin" />
                          ) : (
                            <Upload className="h-8 w-8 text-muted group-hover:text-accent transition" />
                          )}
                          <span className="text-xs font-bold mt-2">
                            {uploadingPdf ? "Reading file..." : "Upload Profile PDF"}
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-1">
                            Go to LinkedIn &gt; More &gt; Save to PDF, then upload here.
                          </span>
                        </button>
                      </div>

                      {/* Divider */}
                      <div className="flex items-center gap-3 text-muted-foreground text-[10px] font-bold uppercase py-1">
                        <div className="h-px bg-border/80 flex-1"></div>
                        <span>or</span>
                        <div className="h-px bg-border/80 flex-1"></div>
                      </div>

                      {/* Paste Text */}
                      <div className="space-y-1.5">
                        <label htmlFor="linkedin-paste" className="block text-xs font-bold text-muted-foreground uppercase">
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

                      <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-4">
                        <Checkbox
                          id="replace-master-linkedin"
                          checked={replaceMaster}
                          onCheckedChange={setReplaceMaster}
                          label="Replace my Master Profile with this data"
                          disabled={loading || uploadingPdf}
                        />

                        <Button
                          type="submit"
                          size="sm"
                          variant="primary"
                          disabled={loading || uploadingPdf || !linkedinText.trim()}
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
                        <label htmlFor="github-username" className="block text-xs font-bold text-muted-foreground uppercase">
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
                            <span className="absolute right-3 top-3 text-muted-foreground cursor-not-allowed">
                              <Lock className="h-4 w-4" />
                            </span>
                          )}
                        </div>

                        {!isPaidUser && (
                          <div className="bg-amber-500/5 text-amber-500 border border-amber-500/10 rounded-xl p-3 flex gap-2 text-xs leading-5">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">Free Plan Restriction</p>
                              <p className="text-muted-foreground text-[11px] mt-0.5">
                                You can only import your own connected GitHub profile ({currentTabQuota?.connectedUsername || "Connecting..."}). Upgrade to a paid plan to import any profile.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-4">
                        <Checkbox
                          id="replace-master-github"
                          checked={replaceMaster}
                          onCheckedChange={setReplaceMaster}
                          label="Replace my Master Profile with this data"
                          disabled={loading}
                        />

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
    </Modal>
  );
}
