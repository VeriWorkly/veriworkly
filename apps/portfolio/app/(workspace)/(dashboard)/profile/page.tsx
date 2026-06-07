import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, Mail, MapPin, UserRound } from "lucide-react";
import { veriworklyProductLinks } from "@/config/site";
import { parsePortfolioContent, type CloudPortfolioDraft } from "@/lib/portfolio";
import { fetchServerApiData } from "@/lib/server-api";
import type { PortfolioWorkspaceBootstrap } from "@/store/portfolio-store";

export const metadata: Metadata = { title: "Profile", robots: { index: false, follow: false } };
const primaryAction =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 text-xs font-extrabold text-[var(--color-accent-ink)] transition hover:-translate-y-0.5 hover:bg-[var(--color-accent-strong)]";
const secondaryAction =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-xs font-extrabold text-[var(--color-ink)] transition hover:-translate-y-0.5";

export default async function ProfilePage() {
  const [user, workspace] = await Promise.all([
    fetchServerApiData<PortfolioWorkspaceBootstrap["user"]>("/users/me"),
    fetchServerApiData<PortfolioWorkspaceBootstrap["workspace"]>("/portfolios/me"),
  ]);
  const draft = workspace?.draft as CloudPortfolioDraft | undefined;
  const content = draft ? parsePortfolioContent(draft.content) : null;

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-7 sm:px-6 sm:py-9 xl:px-10">
      <header>
        <p className="text-xs font-extrabold text-[var(--color-accent)]">Public identity</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">
          Make the person behind the work clear.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
          Review the public details used by your portfolio and manage your complete VeriWorkly
          profile in Studio.
        </p>
      </header>
      <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="rounded-[var(--radius-lg)] bg-[var(--color-panel)] p-6 shadow-[0_4px_0_var(--color-line-strong)] sm:p-8">
          <div className="flex flex-wrap items-start gap-5">
            <span className="grid size-16 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-soft)] text-xl font-black text-[var(--color-accent)]">
              <UserRound size={25} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-black tracking-[-.04em]">
                {content?.identity.name || user?.name || "Your profile"}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--color-muted)]">
                {content?.identity.headline ||
                  "Add a professional headline in the portfolio editor."}
              </p>
            </div>
          </div>
          <div className="mt-8 grid gap-px overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2">
            <Detail
              icon={<Mail size={14} />}
              label="Public email"
              value={content?.identity.email || user?.email || "Not set"}
            />
            <Detail
              icon={<MapPin size={14} />}
              label="Location"
              value={content?.identity.location || "Not set"}
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link className={primaryAction} href="/editor">
              Edit portfolio identity <ArrowRight size={13} />
            </Link>
            <a className={secondaryAction} href={`${veriworklyProductLinks.studio}/profile`}>
              Manage full profile <ExternalLink size={13} />
            </a>
          </div>
        </article>
        <aside className="rounded-[var(--radius-lg)] bg-[var(--color-accent)] p-6 text-[var(--color-accent-ink)]">
          <p className="text-xs font-extrabold text-[var(--color-accent-ink)]/60">Profile system</p>
          <h2 className="mt-3 text-xl font-black tracking-[-.04em]">
            Keep the source of truth in Studio.
          </h2>
          <p className="mt-3 text-xs leading-6 text-[var(--color-accent-ink)]/65">
            Your Studio profile stores broader career information. The portfolio editor controls
            only what visitors see publicly.
          </p>
          <a
            className="mt-8 inline-flex items-center gap-2 text-xs font-extrabold"
            href={`${veriworklyProductLinks.studio}/profile/master`}
          >
            Open master profile <ExternalLink size={12} />
          </a>
        </aside>
      </section>
    </main>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-[var(--color-paper)] p-4">
      <p className="flex items-center gap-2 text-[10px] font-extrabold tracking-[.1em] text-[var(--color-muted)] uppercase">
        {icon}
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-bold">{value}</p>
    </div>
  );
}
