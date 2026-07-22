"use client";

import React from "react";

const SkeletonLine = ({ width }: { width: string }) => (
  <div className={`h-2.5 rounded bg-zinc-200 dark:bg-zinc-800 ${width}`} />
);

const CoverLetterPreview = () => {
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
};

export default CoverLetterPreview;
