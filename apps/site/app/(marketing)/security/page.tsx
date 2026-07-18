import type { Metadata } from "next";
import { ArrowRight, Boxes, Clock3, FileWarning, Lock, ShieldAlert, Wrench } from "lucide-react";

import { GithubIcon } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

import InteractiveCTA from "@/features/marketing/cta/InteractiveCTA";
import { Reveal } from "@/components/marketing/Reveal";
import { SectionEyebrow } from "@/components/marketing/SectionEyebrow";
import { SecurityBoundaryDiagram } from "./components/SecurityBoundaryDiagram";

const pageUrl = `${siteConfig.url}/security`;
const pageOgImage = `${siteConfig.url}/og/security-page-og.png`;

const supportEmail = siteConfig.email;
const supportEmailHref = `mailto:${supportEmail}`;

const githubDiscussionsUrl = `${siteConfig.links.github}/discussions`;
const githubSecurityPolicyUrl = "https://github.com/VeriWorkly/veriworkly/blob/master/SECURITY.md";

export const metadata: Metadata = {
  title: "AI Security & Privacy Policy | VeriWorkly",
  description:
    "Learn how we secure your data: local-first browser storage, encrypted cloud sync, and stateless, privacy-first AI resume tailoring.",
  alternates: {
    canonical: pageUrl,
    languages: {
      "en-US": pageUrl,
    },
  },
  openGraph: {
    title: "Security & Encryption Policy | VeriWorkly",
    description:
      "Learn how we secure your resumes, web portfolios, and credentials using local-first storage and authenticated cloud encryption.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.shortName} Security Overview`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Security & Encryption Policy | VeriWorkly",
    description: "A deep dive into VeriWorkly's sandboxes, IndexedDB databases, and E2E security parameters.",
    images: [pageOgImage],
  },
};

const encryptionBoundaries = [
  {
    title: "Browser Sandbox",
    description:
      "All core files compile locally. Your credentials are never uploaded to a remote parsing backend during PDF generation.",
  },
  {
    title: "Cloud Backups",
    description:
      "If you register and log in, your Master Profile and sandbox documents are backed up and synchronized to our cloud. Connections are encrypted in transit via SSL/TLS and secured by Better Auth OTP.",
  },
  {
    title: "Public Portfolios & Subdomains",
    description:
      "Portfolios published to subdomains (e.g. username.veriworkly.com) are serveable publicly. Visitors' views are tracked in aggregate without using cookies.",
  },
];

const disclosureSteps = [
  {
    label: "You report",
    detail: `Send flaw details privately to ${supportEmail}. No public issue, no forum post.`,
    icon: FileWarning,
  },
  {
    label: "We acknowledge",
    detail: "Receipt confirmed within 24 hours, with a point of contact assigned to your report.",
    icon: Clock3,
  },
  {
    label: "We patch",
    detail: "Validated vulnerabilities are fixed and shipped before anything is made public.",
    icon: Wrench,
  },
  {
    label: "Disclosed together",
    detail: "Once resolved, we coordinate public disclosure and credit you, if you'd like.",
    icon: ShieldAlert,
  },
];

const SecurityPage = () => {
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    about: {
      "@type": "Thing",
      name: "Web application security and privacy",
    },
    name: "Security Policy | VeriWorkly",
    url: pageUrl,
    description:
      "Security architecture, sandbox boundaries, and responsible disclosure procedures.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />

      {/* Hero: dark surface housing the live encryption-boundary diagram, so the
          architecture is shown, not just described. */}
      <section className="relative w-full overflow-hidden bg-zinc-950 pt-32 pb-24 md:pt-40 md:pb-28">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(120,119,198,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,119,198,0.06)_1px,transparent_1px)] bg-size-[26px_26px] mask-[radial-gradient(ellipse_70%_60%_at_50%_0%,#000_60%,transparent_100%)]" />

        <div className="relative z-10 mx-auto grid max-w-350 gap-16 px-6 md:px-8 lg:grid-cols-12 lg:items-center lg:gap-12">
          <div className="lg:col-span-7">
            <Reveal>
              <SectionEyebrow icon={Lock} label="Security" />
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className="mt-6 text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] font-semibold tracking-tighter text-balance text-white">
                Sovereign security for your career records
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
                Local-first browser storage, decoupled document sandboxes, and cloud sync you opt
                into — never the other way around.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <a
                  href={supportEmailHref}
                  className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-8 text-base font-semibold text-zinc-950 shadow-md transition-all duration-300 hover:bg-blue-500 hover:text-white active:scale-[0.97]"
                >
                  Email Security Team
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </a>
                <a
                  href={githubSecurityPolicyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-14 items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 text-base font-medium text-zinc-200 backdrop-blur-md transition-colors hover:border-blue-400/40 hover:text-blue-300"
                >
                  Read SECURITY.md
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.2} className="lg:col-span-5">
            <SecurityBoundaryDiagram />
          </Reveal>
        </div>
      </section>

      {/* Encryption boundaries, laid out as a single indexed ledger rather than
          three disconnected cards. */}
      <section className="mx-auto w-full max-w-350 px-6 py-24 md:px-8 md:py-32">
        <div className="mb-12 max-w-2xl">
          <SectionEyebrow icon={Boxes} label="Data boundaries" />
          <h2 className="mt-6 font-sans text-4xl font-semibold tracking-tighter text-balance text-zinc-900 md:text-5xl dark:text-white">
            What lives where
          </h2>
        </div>

        <div className="divide-y divide-zinc-200 overflow-hidden rounded-4xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800/80 dark:bg-[#0c0c0c]">
          {encryptionBoundaries.map((boundary, idx) => (
            <Reveal
              key={boundary.title}
              delay={idx * 0.08}
              className="grid gap-4 p-8 md:grid-cols-[80px_1fr] md:items-baseline md:p-10"
            >
              <span className="font-mono text-sm font-bold text-blue-500">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {boundary.title}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  {boundary.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Responsible disclosure — a four-step timeline instead of a text block,
          so the process reads instantly. */}
      <section className="mx-auto w-full max-w-350 border-t border-zinc-200/40 px-6 py-24 md:px-8 md:py-32 dark:border-zinc-800/20">
        <div className="mb-14 max-w-2xl">
          <SectionEyebrow icon={ShieldAlert} label="Responsible disclosure" />
          <h2 className="mt-6 font-sans text-4xl font-semibold tracking-tighter text-balance text-zinc-900 md:text-5xl dark:text-white">
            Found a flaw? Here&apos;s exactly what happens next
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
            We investigate vulnerabilities proactively. Report privately, and we&apos;ll take it
            from there.
          </p>
        </div>

        <div className="relative grid gap-6 md:grid-cols-4">
          <div className="pointer-events-none absolute top-6 right-0 left-0 hidden h-px bg-zinc-200 md:block dark:bg-zinc-800" />
          {disclosureSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.label} delay={idx * 0.08} className="relative flex flex-col gap-4">
                <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-blue-500/30 bg-white text-blue-600 dark:bg-[#0c0c0c] dark:text-blue-400">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                    {step.label}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                    {step.detail}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.3} className="mt-12 flex flex-wrap gap-3">
          <a
            href={supportEmailHref}
            className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:bg-blue-600 active:scale-[0.97] dark:bg-white dark:text-zinc-950 dark:hover:bg-blue-500 dark:hover:text-white"
          >
            Email Security Report
          </a>
          <a
            href={githubDiscussionsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-zinc-200 px-6 text-sm font-semibold text-zinc-800 transition-colors hover:border-blue-500/30 hover:text-blue-600 dark:border-zinc-800 dark:text-zinc-200 dark:hover:text-blue-400"
          >
            <GithubIcon className="h-4 w-4" aria-hidden="true" />
            Open Discussions
          </a>
        </Reveal>
      </section>

      <InteractiveCTA />
    </>
  );
};

export default SecurityPage;
