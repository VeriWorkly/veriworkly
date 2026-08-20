import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDownToLine, ExternalLink, Eye, Globe2, Lock, Save } from "lucide-react";
import { toast } from "sonner";
import { portfolioWorkspaceUrl, siteConfig } from "@/config/site";
import { isPremiumTemplate } from "@/lib/portfolio";
import { usePortfolioStore } from "@/store/portfolio-store";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { actionClass as action } from "./constants";
import { ImportMasterProfileModal } from "./ImportMasterProfileModal";

const isProd = process.env.NODE_ENV === "production";

export function EditorCommandBar() {
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Selected field by field: a bare `usePortfolioStore()` subscribes to the whole store,
  // so the command bar re-rendered on every keystroke anywhere in the editor.
  const slug = usePortfolioStore((state) => state.slug);
  const status = usePortfolioStore((state) => state.status);
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
            window.location.href = `${loginUrl}?callbackURL=${encodeURIComponent(window.location.href)}`;
          },
        },
      });
      return;
    }

    const isPremiumUser = billing.canPublish;

    if (isPremiumTemplate(content.templateId) && !isPremiumUser) {
      toast.error(
        `This is a Premium template. Upgrade to Creator Pro to publish it, or switch to a free template.`,
        {
          action: {
            label: "Upgrade",
            onClick: () => window.open("/pricing", "_blank"),
          },
        },
      );
      return;
    }

    try {
      const saved = await saveDraft();
      if (!saved && user) {
        toast.error("Save your latest changes before publishing.");
        return;
      }
      await publish();
      toast.success("Portfolio published successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to publish portfolio.";
      toast.error(errorMessage);
    }
  };

  const handleSave = async () => {
    try {
      await saveDraft();
      if (!user) {
        toast.success("Changes saved locally. Log in to sync to cloud.");
      } else {
        toast.success("Draft saved successfully!");
      }
    } catch {
      toast.error("Failed to save changes.");
    }
  };

  const { href: urlPath, display: urlDisplay } = portfolioWorkspaceUrl(slug, billing.canPublish);

  return (
    <>
      <header className="z-40 grid min-h-16 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/10 bg-[#171717] px-3 text-white sm:px-4">
        <Link className="flex items-center gap-2" href="/dashboard">
          <Image src="/veriworkly-logo.png" width={30} height={30} alt="VeriWorkly logo" priority />
          <span className="hidden text-sm font-bold sm:block">VeriWorkly</span>
        </Link>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-extrabold">Portfolio editor</p>
          <a
            className="mx-auto mt-0.5 flex w-fit max-w-full items-center gap-1 text-[11px] font-bold text-white/45"
            href={urlPath}
            target="_blank"
            rel="noreferrer"
          >
            <span className="truncate">{urlDisplay}</span>
            <ExternalLink size={10} aria-hidden="true" />
          </a>
        </div>
        <div className="flex items-center justify-end gap-1.5">
          <span className="hidden text-xs font-bold text-white/45 lg:block">{status}</span>
          <button
            className={`${action} border border-white/15 bg-white/8 hover:border-white/25`}
            onClick={() => setIsImportOpen(true)}
            title="Import career data from Master Profile"
            type="button"
          >
            <ArrowDownToLine size={14} aria-hidden="true" />
            <span className="hidden md:inline">Import Profile</span>
          </button>
          <Link
            className={`${action} border border-white/15 bg-white/8`}
            href={`/preview/${draft ? draft.id : "guest"}`}
            target="_blank"
          >
            <Eye size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Preview</span>
          </Link>
          <button
            className={`${action} border border-white/15 bg-white/8`}
            onClick={() => void handleSave()}
            type="button"
          >
            <Save size={14} aria-hidden="true" /> Save
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
    </>
  );
}
