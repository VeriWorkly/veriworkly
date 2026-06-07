import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Minus, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Build free and pay when your portfolio is ready to publish.",
};

const features = [
  ["Complete editor and private previews", true, true],
  ["Every current and future template", true, true],
  ["Autosave and draft recovery", true, true],
  ["Public VeriWorkly subdomain", false, true],
  ["Views and referrer analytics", false, true],
  ["SEO and social sharing controls", false, true],
  ["Hosted portfolio images", false, true],
  ["No ads or watermark", false, true],
] as const;

export default function PricingPage() {
  return (
    <main className="min-h-dvh bg-[var(--color-paper)]">
      <nav className="border-b border-[var(--color-line)] bg-white">
        <div className="brand-shell flex min-h-[68px] items-center justify-between">
          <Link className="flex items-center gap-3 text-sm font-black" href="/">
            <Image src="/veriworkly-logo.png" width={28} height={28} alt="" />
            Portfolio
          </Link>
          <Link className="flex items-center gap-2 text-sm font-extrabold" href="/">
            <ArrowLeft size={14} /> Back to overview
          </Link>
        </div>
      </nav>

      <header className="brand-shell grid gap-8 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-[var(--color-proof)] px-3 py-1.5 text-xs font-extrabold text-[var(--color-proof-ink)]">
            <Sparkles size={13} /> No deadline on your draft
          </p>
          <h1 className="mt-6 max-w-5xl text-[clamp(3.8rem,8vw,6rem)] leading-[.94] font-black tracking-[-.04em]">
            Build for free. Publish when it is ready.
          </h1>
        </div>
        <p className="border-t border-[var(--color-line-strong)] pt-5 text-sm leading-7 text-[var(--color-muted)]">
          Use the complete editor for as long as you need. Pro begins when you want a public address
          and audience insights.
        </p>
      </header>

      <section className="brand-shell grid gap-4 pb-16 lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)]">
        <Plan
          title="Draft"
          price="$0"
          note="Forever, no card required"
          href="/dashboard"
          action="Start a private draft"
        >
          Write, arrange, preview, and refine your complete portfolio.
        </Plan>
        <Plan
          featured
          title="Portfolio Pro"
          price="$12"
          suffix="monthly"
          note="Or $120 yearly"
          href="/billing"
          action="Publish with Pro"
        >
          Publish your site, host images, tune sharing, and see what gets attention.
        </Plan>
      </section>

      <section className="brand-shell pb-24">
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white">
          <div className="grid grid-cols-[minmax(0,1fr)_4rem_4rem] bg-[var(--color-ink)] px-4 py-4 text-xs font-extrabold text-white sm:grid-cols-[minmax(0,1fr)_9rem_9rem]">
            <span>What you get</span>
            <span className="text-center">Draft</span>
            <span className="text-center">Pro</span>
          </div>
          {features.map(([label, free, pro]) => (
            <div
              className="grid grid-cols-[minmax(0,1fr)_4rem_4rem] items-center border-b border-[var(--color-line)] px-4 py-4 text-sm last:border-0 sm:grid-cols-[minmax(0,1fr)_9rem_9rem]"
              key={label}
            >
              <span className="font-bold">{label}</span>
              <Feature enabled={free} />
              <Feature enabled={pro} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Plan({
  title,
  price,
  suffix,
  note,
  href,
  action,
  featured,
  children,
}: {
  title: string;
  price: string;
  suffix?: string;
  note: string;
  href: string;
  action: string;
  featured?: boolean;
  children: React.ReactNode;
}) {
  return (
    <article
      className={`flex min-h-[390px] flex-col rounded-[var(--radius-lg)] p-6 sm:p-8 ${featured ? "bg-[var(--color-accent)] text-white" : "border border-[var(--color-line)] bg-white"}`}
    >
      <p className="text-sm font-extrabold">{title}</p>
      <p className="mt-10 text-7xl font-black tracking-[-.04em]">{price}</p>
      <p className="mt-2 text-xs font-bold opacity-65">
        {suffix} {note}
      </p>
      <p className="mt-7 max-w-md text-sm leading-7 opacity-75">{children}</p>
      <Link
        className={`mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-5 text-sm font-extrabold ${featured ? "bg-white text-[var(--color-ink)]" : "bg-[var(--color-ink)] text-white"}`}
        href={href}
      >
        {action}
        <ArrowRight size={15} />
      </Link>
    </article>
  );
}
function Feature({ enabled }: { enabled: boolean }) {
  return (
    <span className="grid place-items-center text-[var(--color-muted)]">
      {enabled ? <Check size={15} className="text-[var(--color-accent)]" /> : <Minus size={14} />}
    </span>
  );
}
