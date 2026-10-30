"use client";

import { useState } from "react";
import { ArrowDownToLine, Check, FileText, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@veriworkly/ui";

import { authenticatedFetch } from "@/lib/authenticated-fetch";
import {
  mergeMasterProfileIntoPortfolio,
  projectToPortfolio,
  readMasterProfileResponse,
  type MasterProfileData,
} from "@/lib/portfolio";
import { usePortfolioStore } from "@/store/portfolio-store";
import { veriworklyProductLinks } from "@/config/site";

interface ImportMasterProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMPTY_PROFILE = "Your Master Profile is empty. Fill it in Studio first.";

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
      setError("Log in to import your Master Profile.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authenticatedFetch("/profiles/master");
      if (!res.ok) {
        // 404 means no profile row yet.
        setError(
          res.status === 404 ? EMPTY_PROFILE : "Could not load your Master Profile. Try again.",
        );
        return;
      }

      const master = readMasterProfileResponse(await res.json());
      if (!master) {
        setError(EMPTY_PROFILE);
        return;
      }

      setProfileData(master);
    } catch {
      setError("Could not reach VeriWorkly. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!profileData) return;

    const projected = projectToPortfolio(profileData, { templateId: content.templateId });
    const merged = mergeMasterProfileIntoPortfolio(content, projected, importMode);

    applyMasterProfileImport(merged);
    toast.success(
      importMode === "replace"
        ? "Replaced your portfolio with your Master Profile."
        : "Imported your Master Profile into the empty parts of your portfolio.",
    );
    onClose();
  };

  const modeClass = (active: boolean) =>
    `flex flex-col items-start rounded-xl border p-3 text-left transition ${
      active ? "border-accent bg-accent/10" : "border-line bg-paper-2 hover:border-line-strong"
    }`;

  const counts = profileData
    ? [
        [profileData.projects?.length, "projects"],
        [profileData.experience?.length, "experience"],
        [profileData.education?.length, "education"],
        [profileData.skills?.length, "skill groups"],
        [profileData.certificates?.length, "certificates"],
      ]
    : [];

  return (
    <Modal open={isOpen} onClose={onClose}>
      <Modal.Content className="workspace-theme bg-panel border-line text-ink max-h-[90dvh] max-w-lg overflow-y-auto">
        <Modal.Header className="border-line flex items-center gap-2.5 space-y-0 border-b pb-4">
          <span className="bg-accent/15 text-accent grid size-8 place-items-center rounded-lg">
            <ArrowDownToLine size={16} aria-hidden="true" />
          </span>
          <Modal.Title className="text-ink text-base">Import from Master Profile</Modal.Title>
          <button
            onClick={onClose}
            className="text-muted hover:text-ink ml-auto rounded-lg p-1.5 transition"
            aria-label="Close"
            type="button"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </Modal.Header>

        {!profileData && !loading && !error ? (
          <div className="py-6 text-center">
            <p className="text-muted text-sm leading-relaxed">
              Bring in your experience, projects, skills, education and more from your Master
              Profile in Studio.
            </p>
            <button
              onClick={() => void handleOpen()}
              className="bg-accent text-accent-ink hover:bg-accent-strong mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition"
              type="button"
            >
              <Sparkles size={14} aria-hidden="true" /> Load Master Profile
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="py-12 text-center" role="status">
            <Loader2 className="text-accent mx-auto animate-spin" size={28} aria-hidden="true" />
            <p className="text-muted mt-3 text-xs font-medium">Fetching your Master Profile...</p>
          </div>
        ) : null}

        {error ? (
          <div className="py-6 text-center">
            <p className="text-danger text-sm font-medium" role="alert">
              {error}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <a
                href={`${veriworklyProductLinks.studio}/profile/master`}
                target="_blank"
                rel="noreferrer"
                className="border-line hover:border-line-strong bg-paper-2 text-ink inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition"
              >
                <FileText size={14} aria-hidden="true" /> Open Master Profile in Studio
              </a>
              {user ? (
                <button
                  onClick={() => void handleOpen()}
                  className="bg-accent text-accent-ink hover:bg-accent-strong rounded-xl px-4 py-2 text-xs font-bold transition"
                  type="button"
                >
                  Retry
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {profileData ? (
          <div className="mt-5 space-y-5">
            <div className="border-line bg-paper-2 rounded-xl border p-4">
              <p className="text-ink text-xs font-bold">
                {profileData.basics?.fullName || "Unnamed profile"}
              </p>
              <p className="text-muted mt-0.5 text-xs">
                {profileData.basics?.headline || profileData.basics?.role || "No headline"} •{" "}
                {profileData.basics?.location || "No location"}
              </p>
              <div className="text-ink-soft mt-3 flex flex-wrap gap-2 text-[11px]">
                {counts.map(([count, label]) => (
                  <span key={label} className="bg-panel border-line rounded-md border px-2 py-0.5">
                    {count || 0} {label}
                  </span>
                ))}
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-muted mb-2 text-xs font-bold tracking-wider uppercase">
                Import mode
              </legend>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={importMode === "fill-empty"}
                  onClick={() => setImportMode("fill-empty")}
                  className={modeClass(importMode === "fill-empty")}
                >
                  <span className="flex w-full items-center justify-between">
                    <span className="text-ink text-xs font-bold">Smart import</span>
                    {importMode === "fill-empty" && (
                      <Check size={14} className="text-accent" aria-hidden="true" />
                    )}
                  </span>
                  <span className="text-muted mt-1 text-[11px] leading-relaxed">
                    Keeps everything you wrote, in your order. Fills empty sections and blank
                    profile fields, and adds missing sections at the end.
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={importMode === "replace"}
                  onClick={() => setImportMode("replace")}
                  className={modeClass(importMode === "replace")}
                >
                  <span className="flex w-full items-center justify-between">
                    <span className="text-ink text-xs font-bold">Replace all</span>
                    {importMode === "replace" && (
                      <Check size={14} className="text-accent" aria-hidden="true" />
                    )}
                  </span>
                  <span className="text-muted mt-1 text-[11px] leading-relaxed">
                    Replaces your sections and profile with your Master Profile. Keeps your photo
                    and pages.
                  </span>
                </button>
              </div>
            </fieldset>

            <div className="border-line flex justify-end gap-2.5 border-t pt-4">
              <button
                type="button"
                onClick={onClose}
                className="border-line hover:border-line-strong bg-panel text-ink rounded-xl border px-4 py-2 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="bg-accent text-accent-ink hover:bg-accent-strong rounded-xl px-4 py-2 text-xs font-bold transition"
              >
                Apply import
              </button>
            </div>
          </div>
        ) : null}
      </Modal.Content>
    </Modal>
  );
}
