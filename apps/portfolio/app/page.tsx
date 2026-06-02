import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, CirclePlay, LayoutTemplate, MoveUpRight, Sparkles } from "lucide-react";
import { TemplateFrame } from "@/components/TemplateFrame";

const shell = "mx-auto w-[min(1240px,calc(100%-48px))] max-sm:w-[min(100%-32px,1240px)]";
const cta =
  "inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full bg-[var(--color-accent)] px-5 text-sm font-extrabold text-[var(--color-accent-ink)] transition-transform duration-150 hover:-translate-y-0.5";

export default function HomePage() {
  return (
    <main className="bg-[var(--color-paper)]">
      <nav className="border-b border-[var(--color-line)] bg-[var(--color-paper)]">
        <div className={`${shell} flex min-h-[72px] items-center justify-between gap-4`}>
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-sm font-extrabold tracking-[-.03em] whitespace-nowrap"
          >
            <Image src="/veriworkly-logo.png" width={28} height={28} alt="" /> VeriWorkly Portfolio
          </Link>
          <div className="flex items-center gap-6 text-sm font-bold">
            <a className="max-sm:hidden" href="#templates">
              Templates
            </a>
            <a className="max-sm:hidden" href="#workflow">
              Workflow
            </a>
            <Link href="/dashboard" className={cta}>
              Start building <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </nav>

      <section
        className={`${shell} grid min-h-[650px] grid-cols-[minmax(0,1fr)_minmax(260px,360px)] items-end gap-14 py-20 max-[860px]:grid-cols-1 max-[860px]:gap-10 max-sm:min-h-0 max-sm:py-14`}
      >
        <div>
          <p className="flex items-center gap-2 text-xs font-extrabold tracking-[.14em] text-[var(--color-accent)] uppercase">
            <Sparkles size={14} /> Portfolio studio
          </p>
          <h1 className="mt-5 max-w-[820px] text-[clamp(4rem,8vw,7.25rem)] leading-[.94] font-semibold tracking-[-.1em] max-sm:text-[clamp(3.5rem,17vw,5.5rem)]">
            Your work.
            <br />
            <span className="text-[var(--color-accent)]">Presented with intent.</span>
          </h1>
          <p className="mt-7 max-w-[620px] text-lg leading-8 text-[var(--color-muted)]">
            Build a portfolio that reads clearly, looks considered, and stays easy to update. Start
            with a complete template, then shape every section in one focused workspace.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/dashboard" className={cta}>
              Create your portfolio <ArrowRight size={16} />
            </Link>
            <a
              className="inline-flex items-center gap-2 text-sm font-extrabold whitespace-nowrap"
              href="#templates"
            >
              <CirclePlay size={17} /> Explore templates
            </a>
          </div>
        </div>
        <aside className="border-t-2 border-[var(--color-ink)] pb-2">
          <p className="py-4 text-xs font-extrabold tracking-[.12em] uppercase">
            Built for a faster edit
          </p>
          {[
            "Guided section-specific fields",
            "Live preview while you write",
            "A publish-ready subdomain",
          ].map((item, index) => (
            <div
              className="grid grid-cols-[34px_1fr] border-t border-[var(--color-line)] py-4"
              key={item}
            >
              <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-accent)]">
                0{index + 1}
              </span>
              <p className="text-sm leading-5 font-bold">{item}</p>
            </div>
          ))}
        </aside>
      </section>

      <section
        className="bg-[var(--color-ink)] px-6 text-[var(--color-panel)] max-sm:px-4"
        id="templates"
      >
        <TemplateFrame />
      </section>

      <section className={`${shell} py-24 max-sm:py-16`} id="workflow">
        <div className="grid grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-16 max-[860px]:grid-cols-1 max-[860px]:gap-8">
          <div>
            <p className="text-xs font-extrabold tracking-[.14em] text-[var(--color-accent)] uppercase">
              A focused workflow
            </p>
            <h2 className="mt-4 text-[clamp(2.8rem,5vw,4.7rem)] leading-[.98] font-semibold tracking-[-.085em]">
              Edit less.
              <br />
              Show more.
            </h2>
            <p className="mt-5 max-w-sm text-base leading-7 text-[var(--color-muted)]">
              The studio keeps the work visible and the forms compact. You always know which part of
              the portfolio you are shaping.
            </p>
          </div>
          <div className="border-t border-[var(--color-line)]">
            {[
              {
                Icon: LayoutTemplate,
                title: "Pick a complete direction",
                copy: "Preview realistic templates with projects, experience, services, skills, writing, and testimonials already represented.",
              },
              {
                Icon: Sparkles,
                title: "Work section by section",
                copy: "Use a compact studio with dedicated tabs instead of one endless form.",
              },
              {
                Icon: MoveUpRight,
                title: "Publish when it reads well",
                copy: "Preview privately, then publish the finished portfolio on your VeriWorkly subdomain.",
              },
            ].map(({ Icon, title, copy }) => (
              <article
                className="grid grid-cols-[44px_minmax(0,1fr)] gap-4 border-b border-[var(--color-line)] py-6"
                key={title}
              >
                <span className="grid size-10 place-items-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                  <Icon size={17} />
                </span>
                <div>
                  <h3 className="text-lg font-bold tracking-[-.03em]">{title}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--color-muted)]">
                    {copy}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-accent-soft)]">
        <div
          className={`${shell} grid grid-cols-[minmax(0,1fr)_320px] items-center gap-10 py-20 max-[760px]:grid-cols-1 max-sm:py-14`}
        >
          <div>
            <p className="flex items-center gap-2 text-xs font-extrabold tracking-[.12em] text-[var(--color-accent)] uppercase">
              <Check size={15} /> Draft for free
            </p>
            <h2 className="mt-4 max-w-3xl text-[clamp(2.8rem,5vw,4.8rem)] leading-[.98] font-semibold tracking-[-.085em]">
              Build privately. Publish when it feels right.
            </h2>
          </div>
          <article className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-panel)] p-6">
            <p className="text-sm font-extrabold">Portfolio Pro</p>
            <p className="mt-4 text-4xl font-extrabold tracking-[-.08em]">
              $12
              <span className="ml-1 text-sm tracking-normal text-[var(--color-muted)]">
                / month
              </span>
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
              One published subdomain and privacy-first portfolio analytics.
            </p>
            <Link className={`${cta} mt-5`} href="/billing">
              See plans <ArrowRight size={15} />
            </Link>
          </article>
        </div>
      </section>

      <footer
        className={`${shell} flex min-h-[88px] items-center justify-between gap-4 text-sm text-[var(--color-muted)] max-sm:flex-col max-sm:items-start max-sm:justify-center`}
      >
        <Link className="font-extrabold text-[var(--color-ink)]" href="/">
          VeriWorkly Portfolio
        </Link>
        <p>A sharper home for your work.</p>
        <Link className="font-extrabold text-[var(--color-ink)]" href="/dashboard">
          Open studio
        </Link>
      </footer>
    </main>
  );
}
