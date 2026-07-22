"use client";

import React from "react";
import { motion } from "framer-motion";

const Step1Visual = () => {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-lg backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="flex items-center gap-3">
        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
        <span className="font-mono text-[10px] tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
          Extracting Resume PDF...
        </span>
      </div>
      <div className="space-y-3 font-mono text-[11px]">
        <div className="border-zinc-150 flex justify-between border-b pb-2 dark:border-zinc-900">
          <span className="text-zinc-400">Name:</span>
          <span className="font-medium text-zinc-800 dark:text-zinc-200">Alex Rivera</span>
        </div>
        <div className="border-zinc-150 flex justify-between border-b pb-2 dark:border-zinc-900">
          <span className="text-zinc-400">Target:</span>
          <span className="font-medium text-zinc-800 dark:text-zinc-200">React Architect</span>
        </div>
        <div className="flex justify-between pb-1">
          <span className="text-zinc-400">Parsing status:</span>
          <span className="animate-pulse font-semibold text-emerald-500">Running OCR...</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="relative h-1.5 overflow-hidden rounded bg-blue-500/20">
          <motion.div
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 h-full w-1/3 bg-blue-500 bg-linear-to-r from-transparent via-white/40 to-transparent"
          />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-900">
        <span className="font-mono text-[11px] tracking-tight text-zinc-400 dark:text-zinc-500">
          Structured Profile
        </span>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          Parsed
        </span>
      </div>
    </div>
  );
};

export default Step1Visual;
