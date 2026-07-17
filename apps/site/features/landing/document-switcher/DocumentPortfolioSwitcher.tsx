"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Globe, Layers, Mail } from "lucide-react";

type TabId = "resume" | "cover-letter" | "portfolio";

const tabs: { id: TabId; label: string; icon: typeof FileText; urlLabel: string }[] = [
  { id: "resume", label: "ATS Resume PDF", icon: FileText, urlLabel: "resume-alex-rivera.pdf" },
  { id: "cover-letter", label: "Cover Letter", icon: Mail, urlLabel: "cover-letter-acme-corp.pdf" },
  { id: "portfolio", label: "Live Web Portfolio", icon: Globe, urlLabel: "alex.veriworkly.me" },
];

const SkeletonLine = ({ width }: { width: string }) => (
  <div className={`h-2.5 rounded bg-zinc-200 dark:bg-zinc-800 ${width}`} />
);

function ResumePreview() {
  return (
    <div className="flex h-full flex-col p-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-bold text-zinc-900 dark:text-white">Alex Rivera</p>
          <p className="text-xs text-zinc-400">React Architect &middot; San Francisco, CA</p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          ATS score 99.9%
        </span>
      </div>

      <div className="mt-6 space-y-5">
        <div className="space-y-2">
          <p className="font-mono text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
            Experience
          </p>
          <SkeletonLine width="w-3/4" />
          <SkeletonLine width="w-1/2" />
        </div>
        <div className="space-y-2">
          <p className="font-mono text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
            Skills
          </p>
          <div className="flex flex-wrap gap-2">
            {["React", "TypeScript", "Systems Design"].map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-zinc-200 px-2.5 py-1 text-[10px] font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-5 dark:border-zinc-900">
        <span className="font-mono text-[10px] text-zinc-400">Unlocked, no paywall</span>
        <span className="rounded-full bg-zinc-950 px-4 py-2 text-[11px] font-bold text-white dark:bg-white dark:text-zinc-950">
          Download PDF
        </span>
      </div>
    </div>
  );
}

function CoverLetterPreview() {
  return (
    <div className="flex h-full flex-col p-8">
      <span className="w-fit rounded-full bg-blue-500/10 px-3 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400">
        Tailored to Acme Corp
      </span>

      <div className="mt-6 space-y-4 text-sm text-zinc-500 dark:text-zinc-400">
        <p className="font-semibold text-zinc-800 dark:text-zinc-200">Dear Hiring Manager,</p>
        <div className="space-y-2">
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-2/3" />
        </div>
        <div className="space-y-2">
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-4/5" />
        </div>
      </div>

      <div className="mt-auto border-t border-zinc-100 pt-5 dark:border-zinc-900">
        <p className="text-xs text-zinc-400">Sincerely,</p>
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Alex Rivera</p>
      </div>
    </div>
  );
}

function PortfolioPreview() {
  return (
    <div className="flex h-full flex-col p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-linear-to-br from-blue-500 to-cyan-400" />
          <div>
            <p className="text-sm font-bold text-zinc-900 dark:text-white">Alex Rivera</p>
            <p className="text-xs text-zinc-400">React Architect</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Published
        </span>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[Layers, FileText, Globe].map((Icon, index) => (
          <div
            key={index}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-100 bg-zinc-50/60 dark:border-zinc-900 dark:bg-zinc-950/50"
          >
            <Icon className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
            <div className="h-1.5 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-5 dark:border-zinc-900">
        <span className="font-mono text-[11px] font-semibold text-blue-500">
          alex.veriworkly.me
        </span>
        <span className="text-[10px] text-zinc-400">Custom subdomain, included free</span>
      </div>
    </div>
  );
}

const previews: Record<TabId, React.ReactNode> = {
  resume: <ResumePreview />,
  "cover-letter": <CoverLetterPreview />,
  portfolio: <PortfolioPreview />,
};

export default function DocumentPortfolioSwitcher() {
  const [activeTab, setActiveTab] = useState<TabId>("resume");
  const activeMeta = tabs.find((tab) => tab.id === activeTab)!;

  return (
    <section className="relative w-full overflow-hidden bg-zinc-50/30 py-32 md:py-48 dark:bg-zinc-950/20">
      <div className="mx-auto max-w-350 px-6 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-sans text-4xl font-semibold tracking-tighter text-balance text-zinc-900 md:text-5xl lg:text-6xl dark:text-white">
            One Master Profile, three outputs
          </h2>
          <p className="mx-auto mt-6 max-w-[52ch] text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
            Everything is generated from the same source of truth. Switch tabs to see the ATS
            resume, matching cover letter, and live web portfolio side by side.
          </p>
        </div>

        <div className="mt-12 flex justify-center">
          <div className="relative inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-zinc-200 bg-white p-1.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-pressed={isActive}
                  className={`relative z-10 flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold tracking-tight transition-colors duration-300 active:scale-[0.97] sm:text-sm ${
                    isActive
                      ? "text-white dark:text-zinc-950"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="doc-tab-highlight"
                      className="absolute inset-0 -z-10 rounded-full bg-zinc-950 shadow-sm dark:bg-white"
                      transition={{ type: "spring", stiffness: 350, damping: 32 }}
                    />
                  )}
                  <tab.icon className="h-3.5 w-3.5" strokeWidth={2} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative mx-auto mt-10 w-full max-w-2xl overflow-hidden rounded-4xl border border-zinc-200 bg-linear-to-b from-white to-zinc-50 shadow-[0_30px_90px_-50px_rgba(0,0,0,0.45)] dark:border-zinc-800 dark:from-[#0a0a0a] dark:to-[#050505]">
          <div className="flex items-center gap-1.5 border-b border-zinc-100 px-6 py-4 dark:border-zinc-900">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
            <span className="ml-2.5 truncate font-mono text-[10px] text-zinc-400 dark:text-zinc-600">
              {activeMeta.urlLabel}
            </span>
          </div>

          <div className="relative h-95">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, filter: "blur(3px)", scale: 0.98 }}
                animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                exit={{ opacity: 0, filter: "blur(3px)", scale: 0.98 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="absolute inset-0"
              >
                {previews[activeTab]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
