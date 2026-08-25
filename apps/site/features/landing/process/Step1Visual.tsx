"use client";

import { motion } from "framer-motion";

const Step1Visual = () => {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-zinc-200/90 bg-zinc-50/90 p-5 shadow-xs backdrop-blur-md sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/90">
      <div className="flex items-center gap-2.5">
        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />

        <span className="font-mono text-[10px] font-bold tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
          Extracting Resume PDF...
        </span>
      </div>

      <div className="space-y-2.5 font-mono text-[11px]">
        <div className="flex justify-between border-b border-zinc-200/70 pb-2 dark:border-zinc-800">
          <span className="text-zinc-500 dark:text-zinc-400">Name:</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">Gautam Raj</span>
        </div>

        <div className="flex justify-between border-b border-zinc-200/70 pb-2 dark:border-zinc-800">
          <span className="text-zinc-500 dark:text-zinc-400">Target:</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">React Architect</span>
        </div>

        <div className="flex justify-between pb-0.5">
          <span className="text-zinc-500 dark:text-zinc-400">Parsing status:</span>
          <span className="animate-pulse font-semibold text-emerald-600 dark:text-emerald-400">
            Running OCR...
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="relative h-1.5 overflow-hidden rounded-full bg-blue-500/20">
          <motion.div
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 h-full w-1/3 rounded-full bg-blue-500 bg-linear-to-r from-transparent via-white/50 to-transparent"
          />
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between border-t border-zinc-200/70 pt-3.5 dark:border-zinc-800">
        <span className="font-mono text-[11px] font-medium tracking-tight text-zinc-500 dark:text-zinc-400">
          Structured Profile
        </span>

        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
          Parsed
        </span>
      </div>
    </div>
  );
};

export default Step1Visual;
