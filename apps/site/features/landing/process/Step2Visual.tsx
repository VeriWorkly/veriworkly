"use client";

import { motion } from "framer-motion";

const Step2Visual = () => {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-zinc-200/90 bg-zinc-50/90 p-5 shadow-xs backdrop-blur-md sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/90">
      <div className="flex items-center justify-between border-b border-zinc-200/70 pb-3 dark:border-zinc-800">
        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
          Role: React Architect
        </span>

        <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-blue-700 dark:text-blue-400">
          Match score: 98%
        </span>
      </div>

      <div className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400">
        <p className="leading-relaxed line-through opacity-40">
          Managed front-end tasks and built interfaces.
        </p>

        <motion.div
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          initial={{ opacity: 0, y: 10, filter: "blur(2px)" }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-blue-50/90 p-3 font-medium text-zinc-900 shadow-2xs dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-white"
        >
          <div className="absolute top-0 left-0 h-full w-1 bg-blue-500" />
          <span className="font-semibold text-blue-700 dark:text-blue-400">AI Optimized: </span>
          Led development of scalable React micro-frontends, accelerating platform load speed by
          35%.
        </motion.div>
      </div>
    </div>
  );
};

export default Step2Visual;
