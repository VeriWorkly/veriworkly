import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDownToLine, ExternalLink, Eye, Globe2, Lock, Save } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@veriworkly/ui";
import { portfolioWorkspaceUrl, siteConfig } from "@/config/site";
import { isPremiumTemplate } from "@/lib/portfolio";
import { issuesFromDetails, publishIssues, type PublishIssue } from "@/lib/portfolio-limits";
import {
  hasPortfolioAccess,
  isPortfolioPubliclyVisible,
  upgradeHref,
} from "@/lib/portfolio-status";
import { saveStatusLabel, usePortfolioStore } from "@/store/portfolio-store";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { actionClass as action } from "./constants";
import { ImportMasterProfileModal } from "./ImportMasterProfileModal";

const isProd = process.env.NODE_ENV === "production";

export interface EditorCommandBarProps {
  /** Opens the page, section and field a publish checklist entry points at. */
  onJump: (issue: PublishIssue) => void;
}

export function EditorCommandBar({ onJump }: EditorCommandBarProps) {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [issues, setIssues] = useState<PublishIssue[]>([]);

  // Selected field by field: a bare `usePortfolioStore()` subscribes to the whole store,
  // so the command bar re-rendered on every keystroke anywhere in the editor.
  const status = usePortfolioStore((state) => state.status);
  const saveIssue = usePortfolioStore((state) => state.saveIssue);
  const billing = usePortfolioStore((state) => state.billing);
  const publication = usePortfolioStore((state) => state.publication);
  const draft = usePortfolioStore((state) => state.draft);
  const content = usePortfolioStore((state) => state.content);
  const user = usePortfolioStore((state) => state.user);
  const saveDraft = usePortfolioStore((state) => state.saveDraft);
  const publish = usePortfolioStore((state) => state.publish);
  const { isAdmin } = useWorkspace();

  // Publishing is blocked in production for everyone except the admin — this mirrors the
  // server's hard block in PortfolioController.publish, which is the actual enforcement point.
  // This client-side check only exists to avoid a doomed save+publish round trip and to make the
  // state visible in the UI.
  const publishingDisabledInProd = isProd && !isAdmin;

  const handlePublish = async () => {
    if (publishingDisabledInProd) {
      toast.error("Publishing is disabled in production right now. It's available in development.");
      return;
    }

    if (!user) {
      toast.error("Please log in to publish your portfolio.", {
        action: {
          label: "Log in",
          onClick: () => {
            const loginUrl = `${siteConfig.links.app}/login`;
            // Studio's login, another app's origin: a full page load is the only way there.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.href = `${loginUrl}?callbackURL=${encodeURIComponent(window.location.href)}`;
          },
        },
      });
      return;
    }

    if (isPremiumTemplate(content.templateId) && !hasPortfolioAccess(billing)) {
      toast.error(
        "This is a premium template. Creator Pro, the Job Hunter Bundle or a pass publishes it, or switch to Signal or Atelier.",
        {
          action: {
            label: "See plans",
            onClick: () => window.open(upgradeHref(content.templateId), "_blank"),
          },
        },
      );
      return;
    }

    // What the server's publish check would refuse, listed with a way to each gap (P-036).
    const missing = publishIssues(content);
    if (missing.length) {
      setIssues(missing);
      return;
    }

    // `publish` saves first and reports whichever step failed.
    const result = await publish();
    if (result.ok) toast.success("Portfolio published.");
    else if (result.status === 400 && result.details?.length)
      setIssues(issuesFromDetails(content, result.details));
    else toast.error(result.message);
  };

  const handleSave = async () => {
    const result = await saveDraft();
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  };

  // The preview renders the last saved draft, so save first (P-032). The tab is opened before
  // the save so the browser still counts it as the click's own popup.
  const handlePreview = async () => {
    const tab = window.open("about:blank", "_blank");
    const result = await saveDraft();
    const href = `/preview/${(result.draft ?? draft)?.id ?? "guest"}`;
    if (!result.ok) {
      toast.error(`The preview shows your last saved version. ${result.message}`);
    }
    if (tab) tab.location.href = href;
    else window.open(href, "_blank");
  };

  // Only a site that resolves is linked, at the address it is live on (P-031).
  const live =
    publication && isPortfolioPubliclyVisible(publication.status)
      ? portfolioWorkspaceUrl(publication.subdomain)
      : null;
  const statusText = saveStatusLabel(status, saveIssue);

  return (
    <>
      <header className="z-40 grid min-h-16 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/10 bg-[#171717] px-3 text-white sm:px-4">
        <Link className="flex items-center gap-2" href="/dashboard">
          <Image src="/veriworkly-logo.png" width={30} height={30} alt="VeriWorkly logo" priority />
          <span className="hidden text-sm font-bold sm:block">VeriWorkly</span>
        </Link>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-extrabold">Portfolio editor</p>
          <p
            aria-live="polite"
            title={statusText}
            className={`mt-0.5 truncate text-[11px] font-bold ${
              status === "Not saved" || status === "Conflict" ? "text-red-300" : "text-white/55"
            }`}
          >
            {statusText}
          </p>
          {live ? (
            <a
              className="mx-auto flex w-fit max-w-full items-center gap-1 text-[11px] font-bold text-white/45"
              href={live.href}
              target="_blank"
              rel="noreferrer"
            >
              <span className="truncate">{live.display}</span>
              <ExternalLink size={10} aria-hidden="true" />
            </a>
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-1.5">
          <button
            className={`${action} border border-white/15 bg-white/8 hover:border-white/25`}
            onClick={() => setIsImportOpen(true)}
            title="Import career data from Master Profile"
            aria-label="Import Profile"
            type="button"
          >
            <ArrowDownToLine size={14} aria-hidden="true" />
            <span className="hidden md:inline">Import Profile</span>
          </button>
          <button
            className={`${action} border border-white/15 bg-white/8`}
            onClick={() => void handlePreview()}
            aria-label="Save and preview"
            type="button"
          >
            <Eye size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Preview</span>
          </button>
          <button
            className={`${action} border border-white/15 bg-white/8`}
            onClick={() => void handleSave()}
            aria-label="Save"
            type="button"
          >
            <Save size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            className={`${action} bg-accent text-(--color-accent-ink) hover:bg-(--color-accent-strong) disabled:cursor-not-allowed disabled:opacity-50`}
            onClick={() => void handlePublish()}
            disabled={publishingDisabledInProd}
            title={
              publishingDisabledInProd
                ? "Publishing is disabled in production right now."
                : undefined
            }
            type="button"
          >
            {publishingDisabledInProd ? (
              <Lock size={14} aria-hidden="true" />
            ) : (
              <Globe2 size={14} aria-hidden="true" />
            )}{" "}
            {publication?.status === "LIVE" ? "Update live" : "Publish"}
          </button>
        </div>
      </header>
      <ImportMasterProfileModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
      <Modal open={issues.length > 0} onClose={() => setIssues([])}>
        <Modal.Content className="workspace-theme bg-panel border-line text-ink">
          <Modal.Header>
            <Modal.Title>A few things before you publish</Modal.Title>
            <Modal.Description className="text-muted">
              Your site needs these to go live. Fix them, then publish again.
            </Modal.Description>
          </Modal.Header>
          <ul className="mt-4 grid gap-2">
            {issues.map((issue, index) => (
              <li
                key={`${issue.sectionId}-${index}`}
                className="border-line flex items-center justify-between gap-3 rounded-lg border p-3 text-xs font-bold"
              >
                <span>{issue.message}</span>
                <button
                  className="text-accent shrink-0 font-extrabold"
                  onClick={() => {
                    setIssues([]);
                    onJump(issue);
                  }}
                  type="button"
                >
                  Go there
                </button>
              </li>
            ))}
          </ul>
        </Modal.Content>
      </Modal>
    </>
  );
}
