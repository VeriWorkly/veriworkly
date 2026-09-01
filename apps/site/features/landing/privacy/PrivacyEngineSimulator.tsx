"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, Lock, UserCheck } from "lucide-react";

const PrivacyEngineSimulator = () => {
  const [activeEngine, setActiveEngine] = useState<"local" | "cloud">("local");

  return (
    <div className="group relative w-full max-w-lg rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:rounded-[2.5rem] sm:p-7 lg:p-8 dark:border-zinc-800/80 dark:bg-[#080808]">
      <div className="flex rounded-full border border-zinc-200/70 bg-zinc-100 p-1 dark:border-zinc-800/60 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setActiveEngine("local")}
          className={`flex-1 rounded-full py-2 text-[11px] font-bold tracking-tight transition-all duration-200 ease-out select-none active:scale-[0.97] sm:py-2.5 sm:text-xs ${
            activeEngine === "local"
              ? "bg-zinc-950 text-white shadow-xs dark:bg-white dark:text-zinc-950"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          VeriWorkly Local-First
        </button>

        <button
          type="button"
          onClick={() => setActiveEngine("cloud")}
          className={`flex-1 rounded-full py-2 text-[11px] font-bold tracking-tight transition-all duration-200 ease-out select-none active:scale-[0.97] sm:py-2.5 sm:text-xs ${
            activeEngine === "cloud"
              ? "bg-zinc-950 text-white shadow-xs dark:bg-white dark:text-zinc-950"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Traditional Resume SaaS
        </button>
      </div>

      <div className="relative mt-6 flex h-64 w-full items-center justify-center overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 sm:mt-8 sm:h-72 sm:rounded-3xl sm:p-8 dark:border-zinc-900 dark:bg-zinc-950">
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--accent-glow)_0%,transparent_70%)] opacity-[0.04]"
          style={
            {
              "--accent-glow": activeEngine === "local" ? "#10b981" : "#ef4444",
            } as React.CSSProperties
          }
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeEngine}
            initial={{ opacity: 0, filter: "blur(3px)", scale: 0.98 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(3px)", scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="relative z-10 flex w-full max-w-sm items-center justify-between"
          >
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-xs transition-transform group-hover:scale-105 sm:h-16 sm:w-16 sm:rounded-3xl dark:border-zinc-800 dark:bg-zinc-900">
                <UserCheck
                  className="h-5 w-5 text-zinc-900 sm:h-6 sm:w-6 dark:text-white"
                  strokeWidth={1.5}
                />
              </div>

              <span className="font-mono text-[8px] font-bold tracking-widest text-zinc-400 uppercase sm:text-[9px]">
                Your Device
              </span>
            </div>

            <div className="relative mx-3 h-2 flex-1 sm:mx-4">
              <div className="absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2 rounded-full bg-zinc-200 dark:bg-zinc-800" />

              {activeEngine === "local" ? (
                <motion.div
                  className="absolute top-1/2 left-0 h-2 w-2 -translate-y-1/2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"
                  animate={{ left: ["0%", "100%", "0%"] }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              ) : (
                <motion.div
                  className="absolute top-1/2 left-0 h-2 w-2 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]"
                  animate={{ left: "100%" }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              )}
            </div>

            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-xs transition-transform group-hover:scale-105 sm:h-16 sm:w-16 sm:rounded-3xl dark:border-zinc-800 dark:bg-zinc-900">
                {activeEngine === "local" ? (
                  <Lock className="h-5 w-5 text-emerald-500 sm:h-6 sm:w-6" strokeWidth={1.5} />
                ) : (
                  <Database className="h-5 w-5 text-red-500 sm:h-6 sm:w-6" strokeWidth={1.5} />
                )}
              </div>

              <span className="font-mono text-[8px] font-bold tracking-widest text-zinc-400 uppercase sm:text-[9px]">
                {activeEngine === "local" ? "LocalStorage" : "Central DB"}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-x-4 bottom-4 flex justify-center sm:inset-x-6 sm:bottom-6">
          <span
            className={`truncate rounded-full border px-3 py-1 font-mono text-[10px] font-semibold transition-all sm:px-4 sm:py-1.5 sm:text-[11px] ${
              activeEngine === "local"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/15 dark:bg-emerald-500/5 dark:text-emerald-400"
                : "border-red-500/20 bg-red-500/10 text-red-700 dark:border-red-500/15 dark:bg-red-500/5 dark:text-red-400"
            }`}
          >
            {activeEngine === "local"
              ? "✓ Data remains inside your browser sandbox"
              : "⚠ Personal info transmitted to cloud servers"}
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-2.5 border-t border-zinc-100 pt-5 font-mono text-[11px] sm:mt-6 sm:space-y-3 sm:pt-6 sm:text-xs dark:border-zinc-900">
        <div className="flex justify-between border-b border-zinc-100/70 pb-2 dark:border-zinc-900">
          <span className="text-zinc-500 dark:text-zinc-400">Security Vault</span>

          <span
            className={
              activeEngine === "local"
                ? "font-bold text-emerald-600 dark:text-emerald-400"
                : "text-zinc-600 dark:text-zinc-400"
            }
          >
            {activeEngine === "local" ? "Client sandboxed vault" : "HTTPS / SSL only"}
          </span>
        </div>

        <div className="flex justify-between border-b border-zinc-100/70 pb-2 dark:border-zinc-900">
          <span className="text-zinc-500 dark:text-zinc-400">Database location</span>

          <span
            className={
              activeEngine === "local"
                ? "font-bold text-emerald-600 dark:text-emerald-400"
                : "text-zinc-600 dark:text-zinc-400"
            }
          >
            {activeEngine === "local" ? "LocalStorage local-first" : "Postgres server cluster"}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">Data tracking</span>
          <span
            className={
              activeEngine === "local"
                ? "font-bold text-emerald-600 dark:text-emerald-400"
                : "font-bold text-red-600 dark:text-red-400"
            }
          >
            {activeEngine === "local" ? "None" : "Identifiable tracking logs"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PrivacyEngineSimulator;
