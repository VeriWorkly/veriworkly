"use client";
import { useState, type ReactNode } from "react";
import { FileText, Globe, Mail } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export type DocumentPreviewTabId = "resume" | "cover-letter" | "portfolio";

interface DocumentTab {
  id: DocumentPreviewTabId;
  label: string;
  shortLabel: string;
  icon: typeof FileText;
  urlLabel: string;
  color: string;
}

const tabs: DocumentTab[] = [
  {
    id: "resume",
    label: "ATS Resume PDF",
    shortLabel: "Resume",
    icon: FileText,
    urlLabel: "resume-gautam-raj.pdf",
    color: "text-blue-500 dark:text-blue-400",
  },
  {
    id: "cover-letter",
    label: "Cover Letter",
    shortLabel: "Cover Letter",
    icon: Mail,
    urlLabel: "cover-letter-acme-corp.pdf",
    color: "text-indigo-500 dark:text-indigo-400",
  },
  {
    id: "portfolio",
    label: "Live Web Portfolio",
    shortLabel: "Portfolio",
    icon: Globe,
    urlLabel: "gautam.veriworkly.me",
    color: "text-emerald-500 dark:text-emerald-400",
  },
];

interface DocumentPortfolioSwitcherProps {
  previews: Record<DocumentPreviewTabId, ReactNode>;
}

const DocumentPortfolioSwitcher = ({ previews }: DocumentPortfolioSwitcherProps) => {
  const [activeTab, setActiveTab] = useState<DocumentPreviewTabId>("resume");

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

        <div className="mt-10 flex justify-center sm:mt-12">
          <div className="relative inline-flex w-full max-w-md items-center justify-between gap-1 rounded-full border border-zinc-200/90 bg-zinc-100/90 p-1.5 shadow-2xs backdrop-blur-xl sm:w-auto sm:max-w-none sm:justify-center dark:border-white/10 dark:bg-zinc-900/90">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === activeTab;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors duration-200 select-none sm:flex-initial sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm ${
                    isActive
                      ? "text-zinc-950 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-tab-indicator"
                      className="absolute inset-0 rounded-full border border-black/5 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-800 dark:shadow-[0_2px_12px_rgba(0,0,0,0.5)]"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}

                  <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                    <Icon
                      className={`h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110 sm:h-4 sm:w-4 ${
                        isActive ? tab.color : "text-zinc-400 dark:text-zinc-500"
                      }`}
                      aria-hidden="true"
                    />

                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.shortLabel}</span>
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

            <div className="relative h-122.5 w-full overflow-hidden sm:h-125">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  className="h-full w-full"
                  exit={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
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
