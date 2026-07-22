"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Globe, Mail } from "lucide-react";
import ResumePreview from "./ResumePreview";
import CoverLetterPreview from "./CoverLetterPreview";
import PortfolioPreview from "./PortfolioPreview";

type TabId = "resume" | "cover-letter" | "portfolio";

const tabs: { id: TabId; label: string; icon: typeof FileText; urlLabel: string }[] = [
  { id: "resume", label: "ATS Resume PDF", icon: FileText, urlLabel: "resume-alex-rivera.pdf" },
  { id: "cover-letter", label: "Cover Letter", icon: Mail, urlLabel: "cover-letter-acme-corp.pdf" },
  { id: "portfolio", label: "Live Web Portfolio", icon: Globe, urlLabel: "alex.veriworkly.me" },
];

const previews: Record<TabId, React.ReactNode> = {
  resume: <ResumePreview />,
  "cover-letter": <CoverLetterPreview />,
  portfolio: <PortfolioPreview />,
};

const DocumentPortfolioSwitcher = () => {
  const [activeTab, setActiveTab] = useState<TabId>("resume");
  const activeMeta = tabs.find((tab) => tab.id === activeTab)!;

  return (
    <section className="relative w-full overflow-hidden bg-white py-32 md:py-48 dark:bg-zinc-950/20">
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
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                    isActive
                      ? "text-zinc-900 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-tab-indicator"
                      className="absolute inset-0 rounded-full bg-zinc-100 dark:bg-zinc-800"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-4xl">
          <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-3 border-b border-zinc-100 bg-zinc-50/80 px-6 py-3.5 dark:border-zinc-900 dark:bg-zinc-900/50">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3 w-3 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3 w-3 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="mx-auto flex max-w-xs items-center gap-2 rounded-md bg-white px-3 py-1 text-xs font-medium text-zinc-500 shadow-xs dark:bg-zinc-950 dark:text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {activeMeta.urlLabel}
              </div>
            </div>

            <div className="relative min-h-95">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  {previews[activeTab]}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DocumentPortfolioSwitcher;
