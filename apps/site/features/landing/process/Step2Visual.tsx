"use client";

import React from "react";
import { motion } from "framer-motion";

const Step2Visual = () => {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-lg backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="border-zinc-150 flex items-center justify-between border-b pb-3 dark:border-zinc-900">
        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
          Role: React Architect
        </span>
        <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
          Match score: 98%
        </span>
      </div>
      <div className="space-y-3 text-xs text-zinc-500">
        <p className="leading-relaxed line-through opacity-30 dark:text-zinc-400">
          Managed front-end tasks and built interfaces.
        </p>
        <motion.div
          initial={{ opacity: 0, y: 10, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="relative overflow-hidden rounded-xl border border-blue-500/10 bg-blue-500/5 p-3 font-medium text-zinc-900 dark:text-white"
        >
          <div className="absolute top-0 left-0 h-full w-1 bg-blue-500" />
          <span className="text-blue-600 dark:text-blue-400">AI Optimized: </span>
          Led development of scalable React micro-frontends, accelerating platform load speed by
          35%.
        </motion.div>
      </div>
    </div>
  );
};

export default Step2Visual;
