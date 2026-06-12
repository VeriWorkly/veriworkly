import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import type { CloudPortfolioDraft } from "@/lib/portfolio";
import { portfolioPublicUrl } from "@/config/site";

const primaryAction =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-xs font-extrabold text-accent-ink transition hover:-translate-y-0.5 hover:bg-accent-strong";
const secondaryAction =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line bg-panel px-4 text-xs font-extrabold text-ink transition hover:-translate-y-0.5 hover:border-line-strong";

export interface DashboardHeaderProps {
  userName?: string | null;
  draft?: CloudPortfolioDraft | null;
}

export function DashboardHeader({ userName, draft }: DashboardHeaderProps) {
  const publicUrl = draft ? portfolioPublicUrl(draft.slug) : null;

  return (
    <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div>
        <p className="text-accent text-xs font-extrabold">Your portfolio today</p>
        <h1 className="mt-2 max-w-4xl text-3xl font-black tracking-[-.04em] text-balance sm:text-4xl">
          Good {getTimeOfDay()}, {firstName(userName)}.
        </h1>
        <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
          Keep your public story sharp, see what is earning attention, and know exactly what to
          improve next.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {publicUrl ? (
          <a className={secondaryAction} href={publicUrl} target="_blank" rel="noreferrer">
            View live site <ExternalLink size={13} />
          </a>
        ) : null}
        <Link className={primaryAction} href="/editor">
          Continue editing <ArrowRight size={14} />
        </Link>
      </div>
    </header>
  );
}

function firstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] || "there";
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}
