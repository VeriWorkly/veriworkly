import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Eye, Globe2, Save } from "lucide-react";
import { portfolioPublicUrl } from "@/config/site";
import { usePortfolioStore } from "@/store/portfolio-store";
import { actionClass as action } from "./constants";

export function EditorCommandBar() {
  const { slug, status, billing, publication, draft, saveDraft, publish } = usePortfolioStore();
  return (
    <header className="z-40 grid min-h-16 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/10 bg-[#171717] px-3 text-white sm:px-4">
      <Link className="flex items-center gap-2" href="/dashboard">
        <Image src="/veriworkly-logo.png" width={30} height={30} alt="VeriWorkly logo" priority />
        <span className="hidden text-sm font-black sm:block">VeriWorkly</span>
      </Link>
      <div className="min-w-0 text-center">
        <p className="truncate text-sm font-extrabold">Portfolio editor</p>
        <a
          className="mx-auto mt-0.5 flex w-fit max-w-full items-center gap-1 text-[11px] font-bold text-white/45"
          href={portfolioPublicUrl(slug)}
          target="_blank"
          rel="noreferrer"
        >
          <span className="truncate">{slug}.veriworkly.com</span>
          <ExternalLink size={10} aria-hidden="true" />
        </a>
      </div>
      <div className="flex items-center justify-end gap-1.5">
        <span className="hidden text-xs font-bold text-white/45 lg:block">{status}</span>
        {draft ? (
          <Link
            className={`${action} border border-white/15 bg-white/8`}
            href={`/preview/${draft.id}`}
            target="_blank"
          >
            <Eye size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Preview</span>
          </Link>
        ) : null}
        <button
          className={`${action} border border-white/15 bg-white/8`}
          onClick={() => void saveDraft()}
          type="button"
        >
          <Save size={14} aria-hidden="true" /> Save
        </button>
        <button
          className={`${action} bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:bg-[var(--color-accent-strong)]`}
          disabled={!billing.canPublish}
          onClick={() => void publish()}
          type="button"
        >
          <Globe2 size={14} aria-hidden="true" />{" "}
          {publication?.status === "LIVE" ? "Update live" : "Publish"}
        </button>
      </div>
    </header>
  );
}
