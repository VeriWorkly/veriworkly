import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Cpu,
  Database,
  GitBranch,
  Lock,
  ShieldCheck,
  Terminal,
  UploadCloud,
} from "lucide-react";
import { GithubIcon } from "@veriworkly/ui";
import { siteConfig } from "@/config/site";
import InteractiveCTA from "@/features/marketing/cta/InteractiveCTA";
import { Reveal } from "@/components/marketing/Reveal";
import { SectionEyebrow } from "@/components/marketing/SectionEyebrow";
import PipelineTimeline from "@/features/how-it-works/PipelineTimeline";

const pageUrl = `${siteConfig.url}/how-it-works`;
const pageOgImage = `${siteConfig.url}/og/how-it-works-page-og.png`;

export const metadata: Metadata = {
  title: `How It Works: Privacy-First AI Career Builder | ${siteConfig.shortName}`,
  description:
    "Learn how our local-first storage, client-side WebAssembly compilers, privacy-first AI copywriting engine, and secure cloud sync protect your data.",
  alternates: {
    canonical: pageUrl,
    languages: {
      "en-US": pageUrl,
    },
  },
  openGraph: {
    title: `How It Works: Privacy-First AI Career Builder | ${siteConfig.shortName}`,
    description:
      "A deep dive into local browser databases, offline compilers, stateless AI credit engines, and secure cloud synchronization.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: "VeriWorkly Platform Architecture",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `How It Works: Privacy-First AI Career Builder | ${siteConfig.shortName}`,
    description:
      "Explore how browser databases, offline compilers, and stateless AI engines let you control your career credentials.",
    images: [pageOgImage],
  },
};

const steps = [
  {
    step: "01",
    title: "Local browser storage",
    description:
      "Your documents are saved inside your browser's private database (IndexedDB). No text leaves your machine by default, allowing you to use the editors, templates, and features without registering an account.",
    tags: ["IndexedDB", "No account needed", "Offline capable"],
  },
  {
    step: "02",
    title: "Document sandbox",
    description:
      "Your Master Profile holds your background records. When you start a document, the editor pulls a snapshot from your profile. Changes inside templates remain sandboxed and will not overwrite your master records.",
    tags: ["Snapshot isolation", "Non-destructive edits"],
  },
  {
    step: "03",
    title: "Browser compilers",
    description:
      "When you download a resume or cover letter PDF, the compilation happens inside your browser tab using WebAssembly. Your personal facts are never processed on external servers.",
    tags: ["WebAssembly", "Client-side render", "Zero server round-trip"],
  },
  {
    step: "04",
    title: "Secure cloud backups",
    description:
      "If you register and log in, your Master Profile and sandbox documents are backed up and synchronized in the cloud. Your account is secured using passwordless OTP credentials.",
    tags: ["Opt-in only", "Better Auth OTP", "TLS in transit"],
  },
  {
    step: "05",
    title: "Subdomain routing",
    description:
      "Publishing a portfolio pushes metadata to our edge router. The system dynamically maps visitors (e.g. name.veriworkly.com) and displays your web portfolio page without cookies.",
    tags: ["Edge routing", "No cookies", "Instant publish"],
  },
];

const pipelineNodes = [
  { label: "Browser", icon: Database },
  { label: "Sandbox", icon: ShieldCheck },
  { label: "Compiler", icon: Cpu },
  { label: "Cloud", icon: Lock },
  { label: "Subdomain", icon: UploadCloud },
];

const HowItWorksPage = () => {
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Build a Sovereign Career Portfolio",
    description:
      "Step-by-step overview of local-first editing, browser compilers, and optional cloud sync.",
    step: steps.map((s, idx) => ({
      "@type": "HowToStep",
      position: idx + 1,
      name: s.title,
      text: s.description,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />

      <section className="w-full bg-[#f3f4f6] p-2 md:p-3 lg:p-4 dark:bg-black">
        <div className="relative flex w-full flex-col items-center overflow-hidden rounded-4xl border border-black/5 bg-white px-6 pt-28 pb-20 text-center md:pt-32 md:pb-24 dark:border-white/5 dark:bg-[#080808]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(120,119,198,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,119,198,0.05)_1px,transparent_1px)] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] bg-size-[24px_24px]" />
          <div className="pointer-events-none absolute top-0 left-1/2 h-105 w-full max-w-225 -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-500/15" />

          <Reveal className="relative z-10 flex max-w-3xl flex-col items-center">
            <SectionEyebrow icon={Terminal} label="Architecture" className="mb-6" />

            <h1 className="text-4xl font-semibold tracking-tighter text-balance text-zinc-900 sm:text-5xl md:text-6xl dark:text-white">
              Privacy built into the architecture
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
              We use browser security sandboxes to protect your data. Five stages, from the
              keystroke to the published page.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
              <Link
                href={siteConfig.links.app}
                className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-zinc-950 px-8 text-base font-semibold text-white shadow-md transition-all duration-300 hover:bg-blue-600 active:scale-[0.97] dark:bg-white dark:text-zinc-950 dark:hover:bg-blue-500 dark:hover:text-white"
              >
                Open Editor
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/about"
                className="inline-flex h-14 items-center justify-center rounded-full border border-black/10 bg-white/70 px-8 text-base font-medium text-zinc-800 backdrop-blur-md transition-colors hover:border-blue-500/30 hover:text-blue-600 dark:border-white/10 dark:bg-black/40 dark:text-zinc-200 dark:hover:text-blue-400"
              >
                Read Our Story
              </Link>
            </div>
          </Reveal>

          <Reveal
            delay={0.15}
            className="relative z-10 mt-16 flex w-full max-w-3xl flex-wrap items-center justify-center gap-x-2 gap-y-6"
          >
            {pipelineNodes.map((node, idx) => {
              const Icon = node.icon;
              const isLast = idx === pipelineNodes.length - 1;
              return (
                <div key={node.label} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-2">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-blue-600 shadow-sm dark:border-zinc-800 dark:bg-[#0c0c0c] dark:text-blue-400">
                      <Icon className="h-4.5 w-4.5" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {node.label}
                    </span>
                  </div>
                  {!isLast && (
                    <ArrowRight
                      className="mb-5 h-3.5 w-3.5 shrink-0 text-zinc-300 dark:text-zinc-700"
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            })}
          </Reveal>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 py-24 md:px-8 md:py-32">
        <PipelineTimeline steps={steps} />
      </section>

      <section className="mx-auto w-full max-w-350 border-t border-zinc-200/40 px-6 py-24 md:px-8 md:py-32 dark:border-zinc-800/20">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <Reveal>
            <SectionEyebrow icon={GitBranch} label="Open and auditable" />
            <h2 className="mt-6 text-2xl font-semibold tracking-tight text-balance text-zinc-900 md:text-3xl dark:text-white">
              A privacy statement is only as good as the code that executes it
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-500 dark:text-zinc-400">
              Because VeriWorkly is open-source, developers, job seekers, and security engineers can
              audit our database settings, compile parameters, and routing scripts. Run the entire
              platform locally, inspect the configuration, or self-host your own database endpoints.
            </p>
            <Link
              href={siteConfig.links.github}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:bg-blue-600 active:scale-[0.97] dark:bg-white dark:text-zinc-950 dark:hover:bg-blue-500 dark:hover:text-white"
            >
              <GithubIcon className="h-4 w-4" aria-hidden="true" />
              Explore GitHub Repository
            </Link>
          </Reveal>

          <Reveal
            delay={0.1}
            className="overflow-hidden rounded-3xl border border-zinc-800 bg-[#0a0a0a]"
          >
            <div className="flex items-center gap-1.5 border-b border-zinc-800 px-5 py-3.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              <span className="ml-2.5 font-mono text-[11px] text-zinc-500">SECURITY.md</span>
            </div>
            <div className="space-y-2.5 p-6 font-mono text-[12.5px] leading-relaxed text-zinc-400">
              <p>
                <span className="text-emerald-400">license</span>: MIT
              </p>
              <p>
                <span className="text-emerald-400">storage</span>: indexeddb, client-side
              </p>
              <p>
                <span className="text-emerald-400">compiler</span>: wasm, in-browser
              </p>
              <p>
                <span className="text-emerald-400">auth</span>: better-auth, otp, no passwords
              </p>
              <p>
                <span className="text-emerald-400">disclosure</span>: private-report, 24h ack
              </p>
              <p className="text-zinc-600"># fork it, self-host it, read every line</p>
            </div>
          </Reveal>
        </div>
      </section>

      <InteractiveCTA />
    </>
  );
};

export default HowItWorksPage;
