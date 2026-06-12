import Link from "next/link";
import { ArrowRight, Settings } from "lucide-react";
import { HealthRow } from "./HealthRow";

const primaryAction =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-xs font-extrabold text-accent-ink transition hover:-translate-y-0.5 hover:bg-accent-strong";
const secondaryAction =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line bg-panel px-4 text-xs font-extrabold text-ink transition hover:-translate-y-0.5 hover:border-line-strong";

export interface DashboardStatusProps {
  portfolioName: string;
  isLive: boolean;
  headline: string;
  readiness: number;
  completedIdentity: number;
  visibleSections: number;
  hasSeo: boolean;
}

export function DashboardStatus({
  portfolioName,
  isLive,
  headline,
  readiness,
  completedIdentity,
  visibleSections,
  hasSeo,
}: DashboardStatusProps) {
  return (
    <article className="border-line bg-panel overflow-hidden rounded-[2rem] border shadow-[0_30px_90px_-50px_rgba(0,0,0,0.45)]">
      <div className="grid min-h-[22rem] md:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-col p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-muted text-xs font-extrabold">Current portfolio</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-.04em]">{portfolioName}</h2>
            </div>
            <span
              className={`px-2.5 py-1 text-[10px] font-extrabold ${isLive ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}
            >
              {isLive ? "Published" : "Private draft"}
            </span>
          </div>
          <p className="text-muted mt-5 max-w-xl text-sm leading-6">{headline}</p>
          <div className="mt-auto flex flex-wrap gap-2 pt-8">
            <Link className={primaryAction} href="/editor">
              Open portfolio editor <ArrowRight size={13} />
            </Link>
            <Link className={secondaryAction} href="/settings">
              Publishing settings <Settings size={13} />
            </Link>
          </div>
        </div>
        <div className="border-line bg-accent text-accent-ink relative overflow-hidden border-t p-6 md:border-t-0">
          <div className="surface-grid absolute inset-0 opacity-20" />
          <div className="relative flex h-full flex-col">
            <p className="text-accent-ink/60 font-[family-name:var(--font-mono)] text-[10px] tracking-[.12em] uppercase">
              Portfolio health
            </p>
            <p className="mt-5 text-7xl font-black tracking-[-.04em] tabular-nums">
              {readiness}
              <span className="text-accent-ink/45 text-2xl">%</span>
            </p>
            <div className="mt-auto space-y-3 pt-8 text-xs font-bold">
              <HealthRow complete={completedIdentity === 4} label="Profile details" />
              <HealthRow complete={visibleSections >= 2} label="Portfolio sections" />
              <HealthRow complete={hasSeo} label="Search metadata" />
              <HealthRow complete={isLive} label="Public publishing" />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
