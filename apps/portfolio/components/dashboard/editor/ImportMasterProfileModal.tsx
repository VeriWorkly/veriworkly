"use client";

import { useState } from "react";
import { ArrowDownToLine, Check, FileText, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import {
  mergeMasterProfileIntoPortfolio,
  projectToPortfolio,
  type MasterProfileData,
} from "@/lib/portfolio";
import { usePortfolioStore } from "@/store/portfolio-store";
import { veriworklyProductLinks } from "@/config/site";

interface ImportMasterProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportMasterProfileModal({ isOpen, onClose }: ImportMasterProfileModalProps) {
  const content = usePortfolioStore((state) => state.content);
  const user = usePortfolioStore((state) => state.user);
  const applyMasterProfileImport = usePortfolioStore((state) => state.applyMasterProfileImport);

  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<MasterProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<"fill-empty" | "replace">("fill-empty");

  const handleOpen = async () => {
    if (!user) {
      setError("Please log in to import your Master Profile.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authenticatedFetch("/profiles/master");
      if (!res.ok) {
        if (res.status === 404) {
          setError("No Master Profile found yet. Create one in Studio to get started.");
        } else {
          setError("Could not load Master Profile from server.");
        }
        return;
      }

      const json = (await res.json()) as { data?: MasterProfileData; content?: MasterProfileData };
      const master = json.data || json.content;
      if (!master || !master.basics) {
        setError("Your Master Profile is empty. Fill it in Studio first.");
        return;
      }

      setProfileData(master);
    } catch {
      setError("Failed to connect to backend service.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleApply = () => {
    if (!profileData) return;

    const projected = projectToPortfolio(profileData, { templateId: content.templateId });
    const merged = mergeMasterProfileIntoPortfolio(content, projected, importMode);

    applyMasterProfileImport(merged);
    toast.success(
      importMode === "replace"
        ? "Replaced portfolio with Master Profile data."
        : "Imported Master Profile! Populated empty fields and missing sections.",
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="border-line bg-panel max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="bg-accent/15 text-accent grid size-8 place-items-center rounded-lg">
              <ArrowDownToLine size={16} />
            </span>
            <h2 id="import-modal-title" className="text-base font-bold text-white">
              Import from Master Profile
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted rounded-lg p-1.5 transition hover:text-white"
            aria-label="Close dialog"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {!profileData && !loading && !error ? (
          <div className="py-6 text-center">
            <p className="text-muted text-sm leading-relaxed">
              Fetch your canonical career information (experience, projects, skills, education,
              etc.) from your Master Profile in Studio and populate your portfolio instantly.
            </p>
            <button
              onClick={() => void handleOpen()}
              className="bg-accent text-accent-ink hover:bg-accent-strong mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition"
              type="button"
            >
              <Sparkles size={14} /> Load Master Profile
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="text-accent mx-auto animate-spin" size={28} />
            <p className="text-muted mt-3 text-xs font-medium">Fetching your Master Profile...</p>
          </div>
        ) : null}

        {error ? (
          <div className="py-6 text-center">
            <p className="text-sm font-medium text-red-400">{error}</p>
            <div className="mt-5 flex justify-center gap-3">
              <a
                href={`${veriworklyProductLinks.studio}/profile/master`}
                target="_blank"
                rel="noreferrer"
                className="border-line hover:border-line-strong inline-flex items-center gap-2 rounded-xl border bg-white/5 px-4 py-2 text-xs font-bold text-white transition"
              >
                <FileText size={14} /> Open Master Profile in Studio
              </a>
              <button
                onClick={() => void handleOpen()}
                className="bg-accent text-accent-ink hover:bg-accent-strong rounded-xl px-4 py-2 text-xs font-bold transition"
                type="button"
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}

        {profileData ? (
          <div className="mt-5 space-y-5">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-bold text-white">
                {profileData.basics?.fullName || "Unnamed Profile"}
              </p>
              <p className="text-muted mt-0.5 text-xs">
                {profileData.basics?.headline || profileData.basics?.role || "No headline"} •{" "}
                {profileData.basics?.location || "No location"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/70">
                <span className="rounded-md bg-white/10 px-2 py-0.5">
                  {profileData.projects?.length || 0} projects
                </span>
                <span className="rounded-md bg-white/10 px-2 py-0.5">
                  {profileData.experience?.length || 0} experience
                </span>
                <span className="rounded-md bg-white/10 px-2 py-0.5">
                  {profileData.education?.length || 0} education
                </span>
                <span className="rounded-md bg-white/10 px-2 py-0.5">
                  {profileData.skills?.length || 0} skill groups
                </span>
                <span className="rounded-md bg-white/10 px-2 py-0.5">
                  {profileData.certificates?.length || 0} certificates
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold tracking-wider text-white/70 uppercase">
                Import Mode
              </label>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setImportMode("fill-empty")}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                    importMode === "fill-empty"
                      ? "border-accent bg-accent/10 text-white"
                      : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-bold text-white">Smart Import</span>
                    {importMode === "fill-empty" && <Check size={14} className="text-accent" />}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/60">
                    Skips sections you already filled. Only imports missing sections and fills blank
                    identity fields.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode("replace")}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                    importMode === "replace"
                      ? "border-accent bg-accent/10 text-white"
                      : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-bold text-white">Replace All</span>
                    {importMode === "replace" && <Check size={14} className="text-accent" />}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/60">
                    Overwrites portfolio sections and identity with Master Profile data (preserves
                    avatars/photos).
                  </p>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="border-line hover:border-line-strong rounded-xl border bg-white/5 px-4 py-2 text-xs font-bold text-white/80 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="bg-accent text-accent-ink hover:bg-accent-strong rounded-xl px-4 py-2 text-xs font-bold transition"
              >
                Apply Import
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
