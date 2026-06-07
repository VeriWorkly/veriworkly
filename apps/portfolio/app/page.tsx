import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ExternalLink, MousePointer2, Sparkles } from "lucide-react";
import { TemplateFrame } from "@/components/TemplateFrame";

const action =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-5 text-sm font-extrabold transition duration-200 hover:-translate-y-0.5";

export default function HomePage() {
  return (
    <main className="bg-[var(--color-paper)]">
      <nav className="sticky top-0 z-50 border-b border-[var(--color-line)] bg-[var(--color-paper-glass)] backdrop-blur-xl">
        <div className="brand-shell flex min-h-[68px] items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 text-sm font-black tracking-[-.03em]">
            <Image src="/veriworkly-logo.png" width={28} height={28} alt="" priority />
            Portfolio
          </Link>
          <div className="flex items-center gap-6 text-sm font-bold">
            <a className="hidden sm:block" href="#templates">
              Templates
            </a>
            <Link className="hidden sm:block" href="/pricing">
              Pricing
            </Link>
            <Link className={`${action} bg-[var(--color-ink)] text-white`} href="/dashboard">
              Build yours <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </nav>

      <section className="brand-shell grid min-h-[calc(100dvh-68px)] items-center gap-12 py-14 lg:grid-cols-[minmax(0,.88fr)_minmax(34rem,1.12fr)] lg:py-20">
        <div className="reveal">
          <p className="inline-flex items-center gap-2 rounded-full bg-[var(--color-proof)] px-3 py-1.5 text-xs font-extrabold text-[var(--color-proof-ink)]">
            <Sparkles size={13} /> Your work, ready to be chosen
          </p>
          <h1 className="mt-6 max-w-3xl text-[clamp(3.8rem,8vw,6rem)] leading-[.94] font-black tracking-[-.04em]">
            A portfolio that makes the case for you.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--color-muted)]">
            Shape your strongest work into a clear, credible website. Edit visually, publish on your
            VeriWorkly address, and understand what gets attention.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className={`${action} bg-[var(--color-accent)] text-white`} href="/dashboard">
              Create your portfolio <ArrowRight size={16} />
            </Link>
            <a
              className={`${action} border border-[var(--color-line-strong)] bg-white`}
              href="#templates"
            >
              See live templates
            </a>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-[var(--color-muted)]">
            {["Draft free", "No code required", "Switch templates anytime"].map((item) => (
              <span className="flex items-center gap-2" key={item}>
                <Check size={13} className="text-[var(--color-accent)]" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="reveal reveal-delay relative min-h-[540px] overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-ink)] p-3 shadow-[0_8px_0_var(--color-accent)] sm:p-5">
          <div className="proof-grid absolute inset-0 opacity-50" />
          <div className="relative flex items-center justify-between px-1 pb-4 text-white">
            <span className="flex items-center gap-2 text-xs font-extrabold">
              <span className="size-2 rounded-full bg-[var(--color-proof)]" /> Live portfolio
              preview
            </span>
            <span className="text-[10px] font-bold text-white/55">alex.veriworkly.com</span>
          </div>
          <div className="relative h-[480px] overflow-hidden rounded-[var(--radius-md)] bg-white">
            <iframe
              className="size-full border-0"
              title="Portfolio template preview"
              src="/templates/signal/preview"
              tabIndex={-1}
            />
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--color-line)] bg-white">
        <div className="brand-shell grid gap-px bg-[var(--color-line)] md:grid-cols-3">
          <Proof
            title="Edit with the result in view"
            copy="Structure, content, and a responsive live website stay together while you work."
          />
          <Proof
            title="Build proof, not filler"
            copy="Projects, experience, writing, testimonials, and services each get a purposeful composition."
          />
          <Proof
            title="Know what earns attention"
            copy="Privacy-first analytics show views and discovery sources after you publish."
          />
        </div>
      </section>

      <section className="bg-[var(--color-ink)] px-4 text-white sm:px-6" id="templates">
        <TemplateFrame />
      </section>

      <section className="brand-shell py-20 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
          <div>
            <p className="text-sm font-extrabold text-[var(--color-accent)]">
              From scattered work to a clear story
            </p>
            <h2 className="mt-4 max-w-4xl text-[clamp(3rem,6vw,5.5rem)] leading-[.96] font-black tracking-[-.04em]">
              Your next opportunity should see your best work first.
            </h2>
          </div>
          <div className="border-t border-[var(--color-line-strong)] pt-6">
            <p className="text-sm leading-7 text-[var(--color-muted)]">
              Start with a private draft. Publish only when the story, details, and presentation are
              ready.
            </p>
            <Link
              className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[var(--color-accent)]"
              href="/pricing"
            >
              View simple pricing <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-accent)] text-white">
        <div className="brand-shell flex min-h-[360px] flex-col justify-between gap-10 py-14 sm:py-16">
          <MousePointer2 size={30} />
          <div className="flex flex-wrap items-end justify-between gap-8">
            <h2 className="max-w-4xl text-[clamp(3.2rem,7vw,6rem)] leading-[.94] font-black tracking-[-.04em]">
              Make your work easier to choose.
            </h2>
            <Link className={`${action} bg-white text-[var(--color-ink)]`} href="/dashboard">
              Start building <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="brand-shell flex min-h-24 flex-wrap items-center justify-between gap-5 text-sm text-[var(--color-muted)]">
        <Link className="font-black text-[var(--color-ink)]" href="/">
          VeriWorkly Portfolio
        </Link>
        <div className="flex gap-5 font-bold">
          <a href="#templates">Templates</a>
          <Link href="/pricing">Pricing</Link>
          <Link href="/dashboard">Workspace</Link>
        </div>
      </footer>
    </main>
  );
}

function Proof({ title, copy }: { title: string; copy: string }) {
  return (
    <article className="bg-white px-6 py-8 sm:px-8 sm:py-10">
      <h2 className="text-lg font-black tracking-[-.03em]">{title}</h2>
      <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--color-muted)]">{copy}</p>
    </article>
  );
}
