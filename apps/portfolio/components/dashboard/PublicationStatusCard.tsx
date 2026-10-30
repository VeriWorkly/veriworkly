"use client";

import { useState, useSyncExternalStore } from "react";
import { ExternalLink, Globe2 } from "lucide-react";
import { toast } from "sonner";

import { portfolioWorkspaceUrl, siteConfig } from "@/config/site";
import { planLabel, publicationNotice } from "@/lib/portfolio-status";
import { usePortfolioStore } from "@/store/portfolio-store";

const TONES = {
  live: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  offline: "bg-danger-soft text-danger",
  draft: "bg-warning-soft text-warning",
} as const;

const action =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-3 text-xs font-extrabold text-ink transition hover:border-line-strong disabled:opacity-60";

/**
 * Dates in the user's own locale. The server has no idea of it, so the server pass and the
 * hydrating render print the ISO day and the locale format follows once React runs in the browser.
 */
function useFormatDate() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (iso: string) =>
    mounted ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "long" }) : iso.slice(0, 10);
}

/** The site's state and what the owner can do about it, on the dashboard and in Settings. */
export function PublicationStatusCard() {
  const publication = usePortfolioStore((state) => state.publication);
  const billing = usePortfolioStore((state) => state.billing);
  const user = usePortfolioStore((state) => state.user);
  const publish = usePortfolioStore((state) => state.publish);
  const [pending, setPending] = useState(false);
  const formatDate = useFormatDate();

  const notice = publicationNotice(publication, billing, formatDate);
  const online = notice.tone === "live" || notice.tone === "warning";
  const address = publication ? portfolioWorkspaceUrl(publication.subdomain) : null;

  const runPublish = async () => {
    setPending(true);
    const result = await publish();
    setPending(false);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  };

  return (
    <section
      aria-label="Site status"
      className="border-line bg-panel flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4"
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${TONES[notice.tone]}`}
          >
            {notice.label}
          </span>
          {user ? (
            <span className="text-muted text-[11px] font-bold">Plan: {planLabel(billing)}</span>
          ) : null}
        </div>
        <p className="text-sm leading-6">{notice.detail}</p>
        {online && address ? (
          <a
            className="text-accent inline-flex items-center gap-1 text-xs font-extrabold"
            href={address.href}
            target="_blank"
            rel="noreferrer"
          >
            {address.display} <ExternalLink size={11} aria-hidden="true" />
          </a>
        ) : null}
        {notice.planEnds ? <p className="text-muted text-xs">{notice.planEnds}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {notice.action === "publish" || notice.action === "republish" ? (
          <button
            className={action}
            onClick={() => void runPublish()}
            disabled={pending}
            type="button"
          >
            <Globe2 size={13} aria-hidden="true" />
            {pending ? "Publishing..." : notice.action === "publish" ? "Publish" : "Republish"}
          </button>
        ) : null}
        {notice.action === "renew" ? (
          <a className={action} href={`${siteConfig.links.app}/billing`}>
            Renew your plan
          </a>
        ) : null}
        {notice.action === "support" ? (
          <a className={action} href="mailto:info@veriworkly.com">
            Contact support
          </a>
        ) : null}
      </div>
    </section>
  );
}
