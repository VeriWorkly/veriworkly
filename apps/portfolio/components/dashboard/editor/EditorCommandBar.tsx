import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Eye, Globe2, Save } from "lucide-react";
import { toast } from "sonner";
import { portfolioPublicUrl } from "@/config/site";
import { usePortfolioStore } from "@/store/portfolio-store";
import { actionClass as action } from "./constants";

export function EditorCommandBar() {
  const { slug, status, billing, publication, draft, saveDraft, publish, content, user } =
    usePortfolioStore();

  const handlePublish = async () => {
    if (!user) {
      toast.error("Please log in to publish your portfolio.", {
        action: {
          label: "Log in",
          onClick: () => {
            const loginUrl =
              process.env.NODE_ENV === "development"
                ? "http://localhost:3001/login"
                : "https://app.veriworkly.com/login";
            window.location.href = `${loginUrl}?callbackURL=${encodeURIComponent(window.location.href)}`;
          },
        },
      });
      return;
    }

    const isPremiumTemplate = content.templateId === "nimbus" || content.templateId === "cipher";
    const isPremiumUser = billing.canPublish;

    if (isPremiumTemplate && !isPremiumUser) {
      toast.error(
        `"${content.templateId === "nimbus" ? "Nimbus" : "Cipher"}" is a Premium template. Upgrade to Portfolio Pro to publish it, or switch to a free template (Signal or Atelier).`,
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

  const urlPath = billing.canPublish
    ? portfolioPublicUrl(slug)
    : `https://portfolio.veriworkly.com/portfolio/${slug}`;

  const urlDisplay = billing.canPublish
    ? `${slug}.veriworkly.com`
    : `portfolio.veriworkly.com/portfolio/${slug}`;

  return (
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
          className={`${action} bg-accent text-(--color-accent-ink) hover:bg-(--color-accent-strong)`}
          onClick={() => void handlePublish()}
          type="button"
        >
          <Globe2 size={14} aria-hidden="true" />{" "}
          {publication?.status === "LIVE" ? "Update live" : "Publish"}
        </button>
      </div>
    </header>
  );
}
