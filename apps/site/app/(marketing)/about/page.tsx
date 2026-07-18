import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gem, GraduationCap, Rocket, Shield, Users } from "lucide-react";

import { principles } from "./data/principles";
import { siteConfig } from "@/config/site";

import InteractiveCTA from "@/features/marketing/cta/InteractiveCTA";
import { Reveal } from "@/components/marketing/Reveal";
import { SectionEyebrow } from "@/components/marketing/SectionEyebrow";
import { MasterProfileFlow } from "./components/MasterProfileFlow";

const pageUrl = `${siteConfig.url}/about`;
const pageOgImage = `${siteConfig.url}/og/about-page-og.png`;

export const metadata: Metadata = {
  title: `About Us: Privacy-First AI Career Tools | ${siteConfig.shortName}`,
  description:
    "We believe job seekers should own their data and use AI safely. VeriWorkly is a local-first, privacy-focused AI career workspace for resumes, cover letters, and portfolios.",
  alternates: {
    canonical: pageUrl,
    languages: {
      "en-US": pageUrl,
    },
  },
  openGraph: {
    title: `About Us: Privacy-First AI Career Tools | ${siteConfig.shortName}`,
    description:
      "We build career tools that put job seekers in control of their data and AI assistant usage. No paywalls, no sold profiles, no data locking.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: "About VeriWorkly Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `About Us: Privacy-First AI Career Tools | ${siteConfig.shortName}`,
    description:
      "Explore the open-source, AI-powered career workspace focused on data sovereignty and client-side security.",
    images: [pageOgImage],
  },
};

const principleIcons = [Shield, Gem, Rocket];

const productScope = [
  {
    title: "Document Studio",
    description:
      "Create ATS-friendly resumes and matched cover letters tailored to specific targets.",
  },
  {
    title: "Personal Portfolios",
    description:
      "Deploy responsive web portfolios hosted on subdomains with visitor view analytics.",
  },
  {
    title: "Link-in-Bio Cards",
    description: "Share your links and list digital services with very competitive transaction rates.",
  },
  {
    title: "Utility Docs",
    description: "Generate invoices and project agreements locally to manage your freelance operations.",
  },
];

const AboutPage = () => {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    sameAs: [siteConfig.links.github, siteConfig.links.twitter, siteConfig.links.linkedin],
    founder: {
      "@type": "Person",
      name: siteConfig.creator,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />

      {/* Manifesto hero — a deliberate dark opening, distinct from the product-demo
          heroes elsewhere on the site, because this page argues a position rather
          than sells a feature. */}
      <section className="relative w-full overflow-hidden bg-zinc-950 pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(120,119,198,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,119,198,0.07)_1px,transparent_1px)] bg-size-[26px_26px] mask-[radial-gradient(ellipse_65%_55%_at_50%_0%,#000_65%,transparent_100%)]" />
        <div className="pointer-events-none absolute top-0 left-1/2 h-105 w-full max-w-225 -translate-x-1/2 rounded-full bg-blue-500/15 blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-4xl px-6 md:px-8">
          <Reveal>
            <SectionEyebrow icon={Shield} label="Why VeriWorkly exists" className="mx-auto" />
          </Reveal>

          <Reveal delay={0.06}>
            <p className="mt-8 text-center text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.08] font-semibold tracking-tighter text-balance text-white">
              Your career history shouldn&apos;t be held hostage behind a subscription.
            </p>
          </Reveal>

          <Reveal delay={0.14}>
            <p className="mx-auto mt-8 max-w-2xl text-center text-lg leading-relaxed text-zinc-400">
              VeriWorkly is a private workspace for your resumes, cover letters, portfolios, and
              invoices. Build ready-to-use documents on your own terms — no paywalls, no sold
              profiles, no account traps.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-10 flex items-center justify-center gap-4">
              <span className="h-px w-10 bg-zinc-800" />
              <span className="text-sm font-medium text-zinc-500">
                — Gautam Raj, Founder of {siteConfig.shortName}
              </span>
              <span className="h-px w-10 bg-zinc-800" />
            </div>
          </Reveal>

          <Reveal delay={0.28}>
            <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href={siteConfig.links.app}
                className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-8 text-base font-semibold text-zinc-950 shadow-md transition-all duration-300 hover:bg-blue-500 hover:text-white active:scale-[0.97]"
              >
                Open Studio
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-14 items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 text-base font-medium text-zinc-200 backdrop-blur-md transition-colors hover:border-blue-400/40 hover:text-blue-300"
              >
                Message the Team
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* The trap vs. the alternative — one asymmetric editorial split instead of
          two identical cards. */}
      <section className="mx-auto w-full max-w-350 px-6 py-24 md:px-8 md:py-32">
        <div className="grid gap-px overflow-hidden rounded-4xl border border-zinc-200 bg-zinc-200 lg:grid-cols-[0.85fr_1.15fr] dark:border-zinc-800 dark:bg-zinc-800">
          <Reveal className="flex flex-col justify-center bg-zinc-50 p-8 md:p-10 dark:bg-[#0a0a0a]">
            <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase dark:text-zinc-600">
              The career software tax
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl dark:text-white">
              Free templates. Locked downloads.
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-500 dark:text-zinc-400">
              Most resume tools offer templates for free, guide you through writing your
              credentials, then lock your download behind a recurring subscription — or sell your
              profile to recruitment databases.
            </p>
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-red-500/15 bg-red-500/5 px-4 py-3">
              <span className="text-sm text-zinc-500 line-through decoration-red-400/60 dark:text-zinc-500">
                $23.95/mo
              </span>
              <span className="text-xs font-semibold text-red-500">just to export your own PDF</span>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="flex flex-col justify-center bg-white p-8 md:p-10 dark:bg-[#0c0c0c]">
            <p className="text-xs font-bold tracking-widest text-blue-500 uppercase">
              The VeriWorkly alternative
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl dark:text-white">
              Your professional history belongs to you.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-500 dark:text-zinc-400">
              Our editor compiles documents directly in your browser&apos;s memory using
              client-side engines. Your data is never held hostage, and you can export
              professional PDFs or publish static portfolios instantly.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-500 dark:text-zinc-400">
              We separate your master career records from your document layout sandboxes, so
              tailoring one resume never risks corrupting the source of truth behind all of them.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Principles — one anchor principle plus two supporting rows, instead of
          three matching boxes. */}
      <section className="mx-auto w-full max-w-350 border-t border-zinc-200/40 px-6 py-24 md:px-8 md:py-32 dark:border-zinc-800/20">
        <div className="mb-14 max-w-2xl">
          <SectionEyebrow icon={Gem} label="What we believe" />
          <h2 className="mt-6 font-sans text-4xl font-semibold tracking-tighter text-balance text-zinc-900 md:text-5xl dark:text-white">
            Three principles, non-negotiable
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal className="group flex flex-col justify-between rounded-4xl border border-zinc-200 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:border-blue-500/30 hover:shadow-[0_8px_40px_rgba(59,130,246,0.12)] md:p-10 dark:border-zinc-800/80 dark:bg-[#0c0c0c]">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                <Shield className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
              </span>
              <h3 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                {principles[0]?.title}
              </h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {principles[0]?.description}
              </p>
            </div>
            <span className="mt-8 font-mono text-xs tracking-wider text-zinc-400 uppercase dark:text-zinc-600">
              Principle 01
            </span>
          </Reveal>

          <div className="flex flex-col gap-6">
            {principles.slice(1).map((principle, idx) => {
              const Icon = principleIcons[idx + 1] ?? Shield;
              return (
                <Reveal
                  key={principle.title}
                  delay={0.08 + idx * 0.08}
                  className="flex items-start gap-5 rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:border-blue-500/30 dark:border-zinc-800/80 dark:bg-[#0c0c0c]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                    <Icon className="h-4.5 w-4.5" strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                      {principle.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                      {principle.description}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Four documents, one source of truth — a connected flow diagram instead
          of a plain four-column grid. */}
      <section className="mx-auto w-full max-w-350 border-t border-zinc-200/40 px-6 py-24 md:px-8 md:py-32 dark:border-zinc-800/20">
        <div className="mb-12 max-w-2xl">
          <SectionEyebrow icon={Rocket} label="One profile, four outputs" />
          <h2 className="mt-6 font-sans text-4xl font-semibold tracking-tighter text-balance text-zinc-900 md:text-5xl dark:text-white">
            Four documents, one source of truth
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
            Your career documents are connected assets. Every one of them pulls a snapshot from
            your Master Profile, then goes its own way.
          </p>
        </div>

        <Reveal>
          <MasterProfileFlow />
        </Reveal>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {productScope.map((item, idx) => (
            <Reveal
              key={item.title}
              delay={idx * 0.06}
              className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800"
            >
              <h3 className="font-semibold text-zinc-900 dark:text-white">{item.title}</h3>
              <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                {item.description}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Founder note — a signed letter, deliberately typographic and unlike any
          card pattern used elsewhere on the site. */}
      <section className="mx-auto w-full max-w-3xl border-t border-zinc-200/40 px-6 py-24 md:px-8 md:py-32 dark:border-zinc-800/20">
        <Reveal>
          <p className="font-mono text-xs tracking-widest text-blue-500 uppercase">
            A note from the founder
          </p>
          <p className="mt-6 text-2xl leading-normal font-medium text-balance text-zinc-800 md:text-3xl dark:text-zinc-100">
            I built VeriWorkly because I was tired of watching people pay recurring fees to
            download a PDF of their own résumé. Career tools should respect the fact that this is
            your data, your history, and your decision how it&apos;s used — not a growth lever for
            someone else&apos;s subscription metrics.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">
              GR
            </span>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">Gautam Raj</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Founder, {siteConfig.shortName}</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Programs — two tinted editorial banners instead of matching cards. */}
      <section className="mx-auto w-full max-w-350 border-t border-zinc-200/40 px-6 py-24 md:px-8 md:py-32 dark:border-zinc-800/20">
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal className="group relative flex flex-col justify-between overflow-hidden rounded-4xl border border-blue-500/15 bg-blue-500/4 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/30 md:p-10 dark:border-blue-500/10 dark:bg-blue-500/3">
            <div className="space-y-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                <Users className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                Affiliate Program
              </h3>
              <p className="max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                Promote user sovereignty in career documents and earn recurring commissions of 2%,
                3%, or 5%. Track conversions, clicks, and payouts inside your partner dashboard.
              </p>
            </div>
            <Link
              href="/affiliate"
              className="group/link mt-8 inline-flex w-fit items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Become an Affiliate
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover/link:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </Reveal>

          <Reveal
            delay={0.1}
            className="group relative flex flex-col justify-between overflow-hidden rounded-4xl border border-emerald-500/15 bg-emerald-500/4 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 md:p-10 dark:border-emerald-500/10 dark:bg-emerald-500/3"
          >
            <div className="space-y-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <GraduationCap className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                Student Ambassador
              </h3>
              <p className="max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                Represent VeriWorkly on your campus, help peers build their career identity, and
                earn free Portfolio Pro licenses, point boosters, and hackathon workshop
                sponsorships.
              </p>
            </div>
            <Link
              href="/ambassador"
              className="group/link mt-8 inline-flex w-fit items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Join Student Program
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover/link:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </Reveal>
        </div>
      </section>

      <InteractiveCTA />
    </>
  );
};

export default AboutPage;
