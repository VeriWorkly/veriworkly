"use client";

import React from "react";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";

const Step3Visual = () => {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-lg backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="flex gap-4">
        <div className="flex flex-1 flex-col items-center justify-center border-r border-zinc-100 pr-4 text-center dark:border-zinc-900">
          <div className="relative mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <FileText className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            ATS PDF
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Download Ready</span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="mb-3 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-white shadow-md transition-transform dark:bg-white dark:text-zinc-950"
          >
            W
          </motion.div>
          <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            Live Portfolio
          </span>
          <span className="cursor-pointer text-[10px] font-semibold text-blue-500 hover:underline">
            alex.veriworkly.me
          </span>
        </div>
      </div>
    </div>
  );
};

export default Step3Visual;
