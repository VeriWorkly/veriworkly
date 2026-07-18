import Link from "next/link";
import {
  ArrowRight,
  Check,
  Database,
  FileText,
  Globe,
  KeyRound,
  Layers,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { GithubIcon, LinkedInIcon } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";
import { Reveal } from "@/components/marketing/Reveal";

const cellBase = "relative flex flex-col justify-between bg-white p-7 md:p-8 dark:bg-[#0c0c0c]";

export function CapabilityMosaic() {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-4xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-6 dark:border-zinc-800 dark:bg-zinc-800">
      {/* Document Studio — wide showcase tile with a live control-rail mockup */}
      <Reveal className={`${cellBase} lg:col-span-4`}>
        <div>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <FileText className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h3 className="mt-5 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Document Studio
          </h3>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Write and format ATS-friendly resumes and cover letters, with strict layout
            compilation that outputs parser-friendly text markup.
          </p>
        </div>

        <div className="mt-8 space-y-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-5 dark:border-zinc-900 dark:bg-white/5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Margin scale</span>
            <span className="font-mono text-zinc-700 dark:text-zinc-300">0.85x</span>
          </div>
          <div className="relative h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div className="h-full w-[62%] rounded-full bg-blue-500" />
            <div className="absolute top-1/2 left-[62%] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-500 bg-white dark:bg-[#0c0c0c]" />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {["Inter / Source Serif", "Söhne / IBM Plex", "Local PDF export"].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-[#0c0c0c] dark:text-zinc-400"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Web Portfolios — miniature browser chrome */}
      <Reveal delay={0.06} className={`${cellBase} lg:col-span-2`}>
        <div>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <Globe className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h3 className="mt-5 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Web Portfolios
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Publish a fast, responsive site mapped to your own subdomain.
          </p>
        </div>
        <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-white/5">
            <span className="h-2 w-2 rounded-full bg-red-400/70" />
            <span className="h-2 w-2 rounded-full bg-amber-400/70" />
            <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
            <span className="ml-1.5 truncate font-mono text-[10px] text-zinc-400">
              alex.veriworkly.com
            </span>
          </div>
          <div className="space-y-1.5 bg-white p-3 dark:bg-[#080808]">
            <div className="h-1.5 w-3/4 rounded-full bg-zinc-200 dark:bg-white/10" />
            <div className="h-1.5 w-1/2 rounded-full bg-zinc-200 dark:bg-white/10" />
          </div>
        </div>
      </Reveal>

      {/* Link Cards */}
      <Reveal delay={0.1} className={`${cellBase} lg:col-span-2`}>
        <div>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h3 className="mt-5 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Link Cards
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            One clean link aggregator for your social profiles and services.
          </p>
        </div>
        <div className="mt-6 space-y-2">
          {["Book a call", "Read my writing", "View resume PDF"].map((label) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-300"
            >
              {label}
              <ArrowRight className="h-3 w-3 text-zinc-400" aria-hidden="true" />
            </div>
          ))}
        </div>
      </Reveal>

      {/* Master Profile Sandbox */}
      <Reveal delay={0.14} className={`${cellBase} lg:col-span-2`}>
        <div>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <RefreshCcw className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h3 className="mt-5 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Master Profile Sandbox
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Central database of facts. Documents are decoupled snapshots.
          </p>
        </div>
        <div className="mt-6 flex items-center justify-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
            <Database className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="h-px w-8 bg-zinc-300 dark:bg-zinc-700" />
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div className="h-px w-8 bg-zinc-300 dark:bg-zinc-700" />
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </Reveal>

      {/* Data Ingestors */}
      <Reveal delay={0.18} className={`${cellBase} sm:col-span-2 lg:col-span-2`}>
        <div>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <Database className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h3 className="mt-5 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Data Ingestors
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Import your existing profile details with zero manual typing.
          </p>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-[#080808] dark:text-zinc-300">
            <LinkedInIcon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-[#080808] dark:text-zinc-300">
            <GithubIcon className="h-4 w-4" aria-hidden="true" />
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-700" aria-hidden="true" />
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <FileText className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </Reveal>

      {/* Security & Open Sovereignty — wide capability strip */}
      <Reveal delay={0.22} className={`${cellBase} lg:col-span-4`}>
        <div>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <ShieldCheck className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h3 className="mt-5 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Security &amp; Open Sovereignty
          </h3>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Host your own server, audit code parameters, and own your database files.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-2.5">
          {[
            { icon: Database, label: "Client-side IndexedDB" },
            { icon: KeyRound, label: "Better Auth OTP sign-in" },
            { icon: Check, label: "Open-source MIT core" },
            { icon: Sparkles, label: "Developer API keys" },
          ].map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-300"
            >
              <item.icon className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
              {item.label}
            </span>
          ))}
        </div>
      </Reveal>

      {/* CTA tile */}
      <Reveal
        delay={0.26}
        className="flex flex-col justify-between bg-blue-500/5 p-7 md:p-8 lg:col-span-2 dark:bg-blue-500/6"
      >
        <div className="space-y-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
            <ArrowRight className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Create your profile
          </h3>
          <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Start building without registering. Upload a file or connect GitHub to import data.
          </p>
        </div>
        <Link
          href={siteConfig.links.app}
          className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Start Building
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      </Reveal>
    </div>
  );
}
