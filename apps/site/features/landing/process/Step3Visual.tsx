"use client";

import { motion } from "framer-motion";
import { FileText } from "lucide-react";

const Step3Visual = () => {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-zinc-200/90 bg-zinc-50/90 p-5 shadow-xs backdrop-blur-md sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/90">
      <div className="flex gap-4">
        <div className="flex flex-1 flex-col items-center justify-center border-r border-zinc-200/70 pr-4 text-center dark:border-zinc-800">
          <div className="relative mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <FileText className="h-5 w-5" strokeWidth={1.5} />
          </div>

          <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
            ATS PDF
          </span>

          <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
            Download Ready
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <motion.div
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.05 }}
            className="mb-2.5 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-white shadow-md transition-transform dark:bg-white dark:text-zinc-950"
          >
            W
          </motion.div>

          <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
            Live Portfolio
          </span>

          <span className="cursor-pointer text-[10px] font-semibold text-blue-600 hover:underline dark:text-blue-400">
            gautam.veriworkly.me
          </span>
        </div>
      </div>
    </div>
  );
};

export default Step3Visual;
