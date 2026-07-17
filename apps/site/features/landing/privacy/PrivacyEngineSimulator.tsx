"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, Lock, UserCheck } from "lucide-react";

export default function PrivacyEngineSimulator() {
  const [activeEngine, setActiveEngine] = useState<"local" | "cloud">("local");

  return (
    <div className="group relative w-full max-w-lg rounded-[2.5rem] border border-zinc-200 bg-white p-8 shadow-md dark:border-zinc-800/80 dark:bg-[#080808]">
      {/* Header Toggle */}
      <div className="flex rounded-full border border-zinc-200/60 bg-zinc-100 p-1.5 dark:border-zinc-800/50 dark:bg-zinc-900">
        <button
          onClick={() => setActiveEngine("local")}
          className={`flex-1 rounded-full py-2.5 text-xs font-bold tracking-tight transition-all duration-200 ease-out active:scale-[0.97] ${
            activeEngine === "local"
              ? "bg-zinc-950 text-white shadow-sm dark:bg-white dark:text-zinc-950"
              : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          VeriWorkly Local-First
        </button>
        <button
          onClick={() => setActiveEngine("cloud")}
          className={`flex-1 rounded-full py-2.5 text-xs font-bold tracking-tight transition-all duration-200 ease-out active:scale-[0.97] ${
            activeEngine === "cloud"
              ? "bg-zinc-950 text-white shadow-sm dark:bg-white dark:text-zinc-950"
              : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Traditional Resume SaaS
        </button>
      </div>

      {/* Simulation Canvas */}
      <div className="relative mt-8 flex h-72 w-full items-center justify-center overflow-hidden rounded-3xl border border-zinc-100 bg-zinc-50 p-8 dark:border-zinc-900 dark:bg-zinc-950">
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--accent-glow)_0%,transparent_70%)] opacity-[0.03]"
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
            {/* User Device Node */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-zinc-200 bg-white shadow-xs transition-transform group-hover:scale-105 dark:border-zinc-800 dark:bg-zinc-900">
                <UserCheck className="h-6 w-6 text-zinc-900 dark:text-white" strokeWidth={1.5} />
              </div>
              <span className="font-mono text-[9px] font-bold tracking-widest text-zinc-400 uppercase">
                Your Device
              </span>
            </div>

            {/* Flow Connection Line */}
            <div className="relative mx-4 h-2 flex-1">
              <div className="absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              {activeEngine === "local" ? (
                <motion.div
                  className="absolute top-1/2 left-0 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"
                  animate={{ left: ["0%", "100%", "0%"] }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              ) : (
                <motion.div
                  className="absolute top-1/2 left-0 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]"
                  animate={{ left: "100%" }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              )}
            </div>

            {/* Destination Node */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-zinc-200 bg-white shadow-xs transition-transform group-hover:scale-105 dark:border-zinc-800 dark:bg-zinc-900">
                {activeEngine === "local" ? (
                  <Lock className="h-6 w-6 text-emerald-500" strokeWidth={1.5} />
                ) : (
                  <Database className="h-6 w-6 text-red-500" strokeWidth={1.5} />
                )}
              </div>
              <span className="font-mono text-[9px] font-bold tracking-widest text-zinc-400 uppercase">
                {activeEngine === "local" ? "IndexedDB Vault" : "Central DB"}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Secure Badge Status */}
        <div className="absolute inset-x-6 bottom-6 flex justify-center">
          <span
            className={`rounded-full border px-4 py-1.5 font-mono text-[11px] font-semibold transition-all ${
              activeEngine === "local"
                ? "border-emerald-500/10 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                : "border-red-500/10 bg-red-500/5 text-red-600 dark:text-red-400"
            }`}
          >
            {activeEngine === "local"
              ? "✓ Data remains inside your browser sandbox"
              : "⚠ Personal info is transmitted to cloud servers"}
          </span>
        </div>
      </div>

      {/* Technical Specifications */}
      <div className="mt-6 space-y-3 border-t border-zinc-100 pt-6 font-mono text-xs dark:border-zinc-900">
        <div className="flex justify-between border-b border-zinc-100/60 pb-2 dark:border-zinc-900">
          <span className="text-zinc-400">Security Vault</span>
          <span
            className={activeEngine === "local" ? "font-bold text-emerald-500" : "text-zinc-500"}
          >
            {activeEngine === "local" ? "Client sandboxed vault" : "HTTPS / SSL only"}
          </span>
        </div>
        <div className="flex justify-between border-b border-zinc-100/60 pb-2 dark:border-zinc-900">
          <span className="text-zinc-400">Database location</span>
          <span
            className={activeEngine === "local" ? "font-bold text-emerald-500" : "text-zinc-500"}
          >
            {activeEngine === "local" ? "IndexedDB local-first" : "Postgres server cluster"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">Data tracking</span>
          <span
            className={
              activeEngine === "local" ? "font-bold text-emerald-500" : "font-bold text-red-500"
            }
          >
            {activeEngine === "local" ? "None" : "Identifiable tracking logs"}
          </span>
        </div>
      </div>
    </div>
  );
}
