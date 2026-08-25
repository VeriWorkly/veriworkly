import { Download, Sparkles } from "lucide-react";

import SkeletonLine from "./SkeletonLine";

const CoverLetterPreview = () => {
  return (
    <div className="flex h-full flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div>
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-3.5 sm:pb-4 dark:border-zinc-900">
          <div className="min-w-0">
            <span className="font-mono text-[9px] font-bold tracking-widest text-zinc-400 uppercase">
              Targeted Application
            </span>

            <h3 className="truncate text-sm font-bold text-zinc-900 sm:text-base dark:text-white">
              Veriworkly &middot; Staff Frontend Architect
            </h3>

            <p className="truncate text-[11px] text-zinc-500 sm:text-xs dark:text-zinc-400">
              Candidate: Gautam Raj &middot; San Francisco, CA
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold text-blue-600 sm:px-3 sm:py-1.5 sm:text-xs dark:text-blue-400">
            <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            AI Tailored
          </div>
        </div>

        <div className="mt-3.5 space-y-2.5 text-xs sm:mt-4 sm:space-y-3.5">
          <p className="font-bold text-zinc-800 dark:text-zinc-200">
            Dear Hiring Team at VeriWorkly,
          </p>

          <div className="space-y-1.5">
            <SkeletonLine width="w-full" animated />
            <SkeletonLine width="w-11/12" animated />
            <SkeletonLine width="w-4/5" animated />
          </div>

          <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 p-2.5 sm:p-3 dark:bg-blue-500/10">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Tailored Strengths for Role:
            </div>

            <div className="mt-2 space-y-1.5 pl-1.5 text-[11px] text-zinc-600 dark:text-zinc-300">
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-500">✓</span>
                <SkeletonLine width="w-10/12" animated />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-500">✓</span>
                <SkeletonLine width="w-3/4" animated />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <SkeletonLine width="w-full" animated />
            <SkeletonLine width="w-2/3" animated />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between border-t border-zinc-100 pt-3.5 sm:pt-4 dark:border-zinc-900">
          <div>
            <p className="text-[10px] text-zinc-400 sm:text-[11px]">Sincerely,</p>

            <p className="mt-0.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">Gautam Raj</p>
          </div>

          <span className="flex items-center gap-1.5 rounded-full bg-zinc-950 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs sm:px-4 sm:text-xs dark:bg-white dark:text-zinc-950">
            <Download className="h-3 w-3" />
            Export Letter
          </span>
        </div>
      </div>
    </div>
  );
};

export default CoverLetterPreview;
