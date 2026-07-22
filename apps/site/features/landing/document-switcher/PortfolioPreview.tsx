"use client";

import React from "react";
import { FileText, Globe, Layers } from "lucide-react";

const PortfolioPreview = () => {
  return (
    <div className="flex h-full flex-col p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-linear-to-br from-blue-500 to-cyan-400" />
          <div>
            <p className="text-sm font-bold text-zinc-900 dark:text-white">Alex Rivera</p>
            <p className="text-xs text-zinc-400">React Architect</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Published
        </span>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[Layers, FileText, Globe].map((Icon, index) => (
          <div
            key={index}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-100 bg-zinc-50/60 dark:border-zinc-900 dark:bg-zinc-950/50"
          >
            <Icon className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
            <div className="h-1.5 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-5 dark:border-zinc-900">
        <span className="font-mono text-[11px] font-semibold text-blue-500">
          alex.veriworkly.me
        </span>
        <span className="text-[10px] text-zinc-400">Custom subdomain, included free</span>
      </div>
    </div>
  );
};

export default PortfolioPreview;
