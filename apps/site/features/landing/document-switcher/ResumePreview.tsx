"use client";

import React from "react";

const SkeletonLine = ({ width }: { width: string }) => (
  <div className={`h-2.5 rounded bg-zinc-200 dark:bg-zinc-800 ${width}`} />
);

const ResumePreview = () => {
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
};

export default ResumePreview;
