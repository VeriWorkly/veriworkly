"use client";

import { motion } from "framer-motion";
import { Bot, FileText, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function GaplessBento() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 py-32 md:px-8 md:py-48">
      <div className="mb-24 flex flex-col justify-between gap-8 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <h2 className="font-sans text-4xl font-medium tracking-tighter text-balance text-zinc-950 md:text-6xl dark:text-white">
            A complete career workspace.
          </h2>
          <p className="mt-6 max-w-[50ch] text-lg text-zinc-600 dark:text-zinc-400">
            Everything you need to apply, built on a privacy-first engine that works directly in
            your browser.
          </p>
        </div>
      </div>

      <div className="grid grid-flow-dense auto-rows-[320px] grid-cols-1 gap-4 md:grid-cols-4">
        {/* Cell 1: 2x2 - Resume Engine */}
        <motion.div
          className="group relative col-span-1 flex flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-10 md:col-span-2 md:row-span-2"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
            <Bot className="h-6 w-6 text-white" />
          </div>

          <div className="relative z-10 mt-auto w-2/3">
            <h3 className="text-3xl font-medium tracking-tight text-white">The AI Resume Engine</h3>
            <p className="mt-4 leading-relaxed text-zinc-400">
              Build your master profile once. The AI automatically tailors your resume for specific
              job descriptions, optimizing for ATS systems instantly.
            </p>
          </div>

          {/* Interactive ATS Gauge Mockup */}
          <div className="absolute top-1/2 right-8 flex hidden h-64 w-64 -translate-y-1/2 flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-transform duration-700 ease-out group-hover:scale-105 md:flex">
            <div className="relative flex h-32 w-32 items-center justify-center">
              {/* Fake SVG ring */}
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  className="text-white/10"
                  strokeWidth="6"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  className="text-green-500"
                  strokeWidth="6"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "0 283" }}
                  whileInView={{ strokeDasharray: "277 283" }}
                  transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tracking-tighter text-white">
                  98<span className="text-lg text-zinc-400">%</span>
                </span>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              ATS Optimized
            </div>
          </div>
        </motion.div>

        {/* Cell 2: 2x1 - Cover Letters */}
        <motion.div
          className="group relative col-span-1 flex flex-col justify-end overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-100 p-8 md:col-span-2 md:row-span-1 dark:border-zinc-800 dark:bg-zinc-900/50"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* AI Text Highlight Mockup */}
          <div className="absolute top-8 right-8 hidden w-64 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:block dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-2 flex gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              <div className="font-mono text-[9px] font-medium tracking-widest text-blue-600 uppercase dark:text-blue-400">
                AI Tailoring
              </div>
            </div>
            <div className="space-y-1.5 text-xs leading-relaxed text-zinc-400 dark:text-zinc-600">
              I am thrilled to apply for the{" "}
              <span className="rounded bg-blue-100 px-1 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200">
                Senior React Developer
              </span>{" "}
              position at your company. My background in{" "}
              <span className="rounded bg-blue-100 px-1 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200">
                frontend architecture
              </span>{" "}
              perfectly aligns with your goals.
            </div>
          </div>

          <div className="absolute right-8 bottom-8 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-700 group-hover:scale-110 md:hidden dark:bg-zinc-950">
            <FileText className="h-5 w-5 text-zinc-900 dark:text-white" />
          </div>

          <div className="relative z-10 w-full md:w-1/2">
            <h3 className="text-2xl font-medium tracking-tight text-zinc-950 dark:text-white">
              Contextual Cover Letters
            </h3>
            <p className="mt-2 leading-relaxed text-zinc-600 dark:text-zinc-400">
              Generate perfectly toned cover letters that map your experience directly to the role
              requirements.
            </p>
          </div>
        </motion.div>

        {/* Cell 3: 1x1 - Custom Portfolios */}
        <motion.div
          className="group relative col-span-1 flex flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50 p-8 md:col-span-1 md:row-span-1 dark:border-zinc-800 dark:bg-zinc-900"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Mini Browser UI */}
          <div className="absolute -top-4 -right-12 h-32 w-48 rotate-12 transform rounded-lg border border-zinc-200 bg-white p-2 shadow-xl transition-transform duration-700 group-hover:-translate-x-4 group-hover:rotate-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-2 flex h-4 items-center gap-1 border-b border-zinc-100 dark:border-zinc-800">
              <div className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <div className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-900" />
              <div className="flex-1 space-y-1 pt-1">
                <div className="h-2 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
                <div className="h-2 w-2/3 rounded bg-zinc-100 dark:bg-zinc-900" />
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-auto">
            <h3 className="text-xl font-medium text-zinc-950 dark:text-white">Web Portfolios</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Publish instantly to a custom subdomain.
            </p>
          </div>
        </motion.div>

        {/* Cell 4: 1x1 - Privacy */}
        <motion.div
          className="group relative col-span-1 flex flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-white md:col-span-1 md:row-span-1"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="absolute top-8 right-8 flex h-16 w-16 items-center justify-center transition-transform duration-700 group-hover:scale-110">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl" />
            <ShieldCheck className="relative z-10 h-8 w-8 text-emerald-400" />
          </div>
          <div className="relative z-10 mt-auto">
            <h3 className="text-xl font-medium">Privacy First</h3>
            <p className="mt-2 text-sm text-zinc-400">No login required. Local storage only.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
