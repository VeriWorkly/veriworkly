import { CheckCircle2, Download } from "lucide-react";

import SkeletonLine from "./SkeletonLine";

const ResumePreview = () => {
  return (
    <div className="flex h-full flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div>
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-3.5 sm:pb-4 dark:border-zinc-900">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold tracking-tight text-zinc-900 sm:text-lg dark:text-white">
              Gautam Raj
            </h3>

            <p className="truncate text-[11px] font-medium text-zinc-500 sm:text-xs dark:text-zinc-400">
              Senior React Architect &middot; San Francisco, CA
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[9px] text-zinc-400 sm:mt-1.5 sm:gap-2 sm:text-[10px]">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                gautam@veriworkly.com
              </span>

              <span>&middot;</span>
              <span className="font-semibold text-blue-500">gautam.veriworkly.me</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-600 sm:px-3 sm:py-1.5 sm:text-xs dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            ATS 99.9%
          </div>
        </div>

        <div className="mt-3 space-y-1.5 sm:mt-4 sm:space-y-2">
          <p className="font-mono text-[9px] font-bold tracking-widest text-zinc-400 uppercase">
            Professional Summary
          </p>

          <div className="space-y-1.5">
            <SkeletonLine width="w-full" animated />
            <SkeletonLine width="w-4/5" animated />
          </div>
        </div>

        <div className="mt-3 space-y-1.5 sm:mt-4 sm:space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[9px] font-bold tracking-widest text-zinc-400 uppercase">
              Experience
            </p>
            <span className="font-mono text-[9px] font-medium text-zinc-400 sm:text-[10px]">
              2023 – Present
            </span>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-2.5 sm:p-3 dark:border-zinc-900 dark:bg-zinc-900/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Staff Frontend Engineer
              </span>
              <span className="font-mono text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                VeriWorkly Corp
              </span>
            </div>

            <div className="mt-2 space-y-1.5 pl-1.5">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="h-1 w-1 shrink-0 rounded-full bg-blue-500" />
                <SkeletonLine width="w-11/12" animated />
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="h-1 w-1 shrink-0 rounded-full bg-blue-500" />
                <SkeletonLine width="w-4/5" animated />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-1.5 sm:mt-4 sm:space-y-2">
          <p className="font-mono text-[9px] font-bold tracking-widest text-zinc-400 uppercase">
            Core Competencies
          </p>

          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            {["React 19", "TypeScript", "Next.js", "TailwindCSS", "System Design"].map((skill) => (
              <span
                key={skill}
                className="rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[9px] font-medium text-zinc-600 shadow-2xs sm:px-2 sm:text-[10px] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between border-t border-zinc-100 pt-3.5 sm:mt-4 sm:pt-4 dark:border-zinc-900">
        <span className="font-mono text-[10px] text-zinc-400">Unlocked ATS PDF &middot; Free</span>

        <span className="flex items-center gap-1.5 rounded-full bg-zinc-950 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs sm:px-4 sm:text-xs dark:bg-white dark:text-zinc-950">
          <Download className="h-3 w-3" />
          Download PDF
        </span>
      </div>
    </div>
  );
};

export default ResumePreview;
