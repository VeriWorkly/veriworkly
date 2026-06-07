import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  ExternalLink,
  Eye,
  FileText,
  LayoutTemplate,
  MoveUpRight,
  Settings,
  Sparkles,
} from "lucide-react";
import { portfolioPublicUrl, veriworklyProductLinks } from "@/config/site";
import { parsePortfolioContent, type CloudPortfolioDraft } from "@/lib/portfolio";
import type { Billing, Publication } from "@/store/portfolio-store";

const primaryAction =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 text-xs font-extrabold text-[var(--color-accent-ink)] transition hover:-translate-y-0.5 hover:bg-[var(--color-accent-strong)]";
const secondaryAction =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-xs font-extrabold text-[var(--color-ink)] transition hover:-translate-y-0.5 hover:border-[var(--color-line-strong)]";

export type PortfolioDashboardData = {
  user: { name?: string | null; email?: string | null } | null;
  workspace: { draft?: unknown; publication?: Publication; billing?: Billing } | null;
  analytics: { totalViews?: number } | null;
};

export function PortfolioDashboardWorkspace({ data }: { data: PortfolioDashboardData }) {
  const draft = data.workspace?.draft as CloudPortfolioDraft | undefined;
  const content = draft ? parsePortfolioContent(draft.content) : null;
  const visibleSections = content?.sections.filter((section) => section.visible).length ?? 0;
  const projectCount =
    content?.sections.find((section) => section.type === "projects")?.items.length ?? 0;
  const completedIdentity = content
    ? [
        content.identity.name,
        content.identity.headline,
        content.identity.bio,
        content.identity.email,
      ].filter((value) => value.trim()).length
    : 0;
  const readiness = Math.round(((completedIdentity + Math.min(visibleSections, 4)) / 8) * 100);
  const publicUrl = draft ? portfolioPublicUrl(draft.slug) : null;
  const isLive = data.workspace?.publication?.status === "LIVE";

  return (
    <main className="surface-grid min-h-[calc(100dvh-4.25rem)] px-4 py-8 sm:px-6 sm:py-10 xl:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-xs font-extrabold text-[var(--color-accent)]">
              Your portfolio today
            </p>
            <h1 className="mt-2 max-w-4xl text-3xl font-black tracking-[-.04em] text-balance sm:text-4xl">
              Good {getTimeOfDay()}, {firstName(data.user?.name)}.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
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

        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Portfolio views"
            value={String(data.analytics?.totalViews ?? 0)}
            detail="All-time public views"
            icon={<Eye size={16} />}
          />
          <Metric
            label="Published sections"
            value={String(visibleSections)}
            detail={`${projectCount} project ${projectCount === 1 ? "story" : "stories"}`}
            icon={<LayoutTemplate size={16} />}
          />
          <Metric
            label="Readiness"
            value={`${readiness}%`}
            detail={readiness === 100 ? "Ready to share" : "Complete the remaining details"}
            icon={<Check size={16} />}
          />
          <Metric
            label="Publication"
            value={isLive ? "Live" : "Draft"}
            detail={draft ? `${draft.slug}.veriworkly.com` : "Create your first draft"}
            icon={<Sparkles size={16} />}
          />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,.55fr)]">
          <article className="overflow-hidden rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[0_30px_90px_-50px_rgba(0,0,0,0.45)]">
            <div className="grid min-h-[22rem] md:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="flex flex-col p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold text-[var(--color-muted)]">
                      Current portfolio
                    </p>
                    <h2 className="mt-2 text-3xl font-black tracking-[-.04em]">
                      {content?.identity.name || "Build your portfolio"}
                    </h2>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-[10px] font-extrabold ${isLive ? "bg-[var(--color-success-soft)] text-[var(--color-success)]" : "bg-[var(--color-warning-soft)] text-[var(--color-warning)]"}`}
                  >
                    {isLive ? "Published" : "Private draft"}
                  </span>
                </div>
                <p className="mt-5 max-w-xl text-sm leading-6 text-[var(--color-muted)]">
                  {content?.identity.headline ||
                    "Add your professional headline and strongest work to create a clear public profile."}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-8">
                  <Link className={primaryAction} href="/editor">
                    Open portfolio editor <ArrowRight size={13} />
                  </Link>
                  <Link className={secondaryAction} href="/settings">
                    Publishing settings <Settings size={13} />
                  </Link>
                </div>
              </div>
              <div className="relative overflow-hidden border-t border-[var(--color-line)] bg-[var(--color-accent)] p-6 text-[var(--color-accent-ink)] md:border-t-0">
                <div className="surface-grid absolute inset-0 opacity-20" />
                <div className="relative flex h-full flex-col">
                  <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[.12em] text-[var(--color-accent-ink)]/60 uppercase">
                    Portfolio health
                  </p>
                  <p className="mt-5 text-7xl font-black tracking-[-.04em] tabular-nums">
                    {readiness}
                    <span className="text-2xl text-[var(--color-accent-ink)]/45">%</span>
                  </p>
                  <div className="mt-auto space-y-3 pt-8 text-xs font-bold">
                    <HealthRow complete={completedIdentity === 4} label="Profile details" />
                    <HealthRow complete={visibleSections >= 2} label="Portfolio sections" />
                    <HealthRow
                      complete={Boolean(content?.seo.title && content?.seo.description)}
                      label="Search metadata"
                    />
                    <HealthRow complete={isLive} label="Public publishing" />
                  </div>
                </div>
              </div>
            </div>
          </article>

          <aside className="rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-[var(--color-muted)]">This week</p>
                <h2 className="mt-1 text-lg font-black tracking-[-.04em]">
                  Recommended next steps
                </h2>
              </div>
              <MoveUpRight size={16} className="text-[var(--color-accent)]" />
            </div>
            <div className="mt-5 space-y-1">
              <Task
                href="/editor"
                title={projectCount ? "Refine your strongest project" : "Add your first project"}
                detail="Clear proof gives visitors a reason to contact you."
              />
              <Task
                href="/settings"
                title="Review search preview"
                detail="Make the shared link explain what you do."
              />
              <Task
                href="/analytics"
                title="Check portfolio reach"
                detail="Review your recent view trend and referring sites."
              />
            </div>
          </aside>
        </section>

        <section className="mt-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold text-[var(--color-muted)]">Across VeriWorkly</p>
              <h2 className="mt-1 text-xl font-black tracking-[-.04em]">Your career workspace</h2>
            </div>
            <a
              className="text-xs font-extrabold text-[var(--color-accent)]"
              href={veriworklyProductLinks.studio}
            >
              Open Studio
            </a>
          </div>
          <div className="mt-4 grid gap-px overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-2">
            <ProductLink
              href={veriworklyProductLinks.studio}
              icon={<FileText size={17} />}
              title="Document builder"
              detail="Create and manage career documents"
            />
            <ProductLink
              href={veriworklyProductLinks.blog}
              icon={<BarChart3 size={17} />}
              title="Blog and guides"
              detail="Practical writing for better applications"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
      <div className="flex items-center justify-between text-[var(--color-muted)]">
        <p className="text-xs font-extrabold">{label}</p>
        <span className="grid size-8 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          {icon}
        </span>
      </div>
      <p className="mt-6 truncate text-3xl font-black tracking-[-.04em] tabular-nums">{value}</p>
      <p className="mt-2 truncate text-[11px] text-[var(--color-muted)]">{detail}</p>
    </article>
  );
}
function HealthRow({ complete, label }: { complete: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`grid size-4 place-items-center rounded-full ${complete ? "bg-[var(--color-accent-ink)] text-[var(--color-accent)]" : "bg-[var(--color-accent-ink)]/15"}`}
      >
        {complete ? <Check size={10} /> : null}
      </span>
      <span className={complete ? "" : "text-[var(--color-accent-ink)]/55"}>{label}</span>
    </div>
  );
}
function Task({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link
      className="group block rounded-[var(--radius-sm)] px-3 py-3 transition hover:bg-[var(--color-paper)]"
      href={href}
    >
      <span className="flex items-center justify-between gap-3 text-xs font-extrabold">
        {title}
        <ArrowRight
          size={12}
          className="text-[var(--color-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-accent)]"
        />
      </span>
      <span className="mt-1 block text-[11px] leading-5 text-[var(--color-muted)]">{detail}</span>
    </Link>
  );
}
function ProductLink({
  href,
  icon,
  title,
  detail,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <a
      className="group flex min-h-32 items-start gap-4 bg-[var(--color-panel)] p-5 transition hover:bg-[var(--color-paper)]"
      href={href}
    >
      <span className="grid size-10 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3 text-sm font-extrabold">
          {title}
          <ExternalLink size={12} className="text-[var(--color-muted)]" />
        </span>
        <span className="mt-2 block text-xs leading-5 text-[var(--color-muted)]">{detail}</span>
      </span>
    </a>
  );
}
function firstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] || "there";
}
function getTimeOfDay() {
  const hour = new Date().getHours();
  return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}
