"use client";

import { motion } from "framer-motion";
import { Bot, FileText, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function GaplessBento() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 py-32 md:px-8 md:py-48">
      <div className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="max-w-2xl">
          <h2 className="text-balance font-sans text-4xl font-medium tracking-tighter text-zinc-950 md:text-6xl dark:text-white">
            A complete career workspace.
          </h2>
          <p className="mt-6 max-w-[50ch] text-lg text-zinc-600 dark:text-zinc-400">
            Everything you need to apply, built on a privacy-first engine that works directly in your browser.
          </p>
        </div>
      </div>

      <div className="grid auto-rows-[320px] grid-cols-1 grid-flow-dense gap-4 md:grid-cols-4">
        {/* Cell 1: 2x2 - Resume Engine */}
        <motion.div
          className="group relative col-span-1 flex flex-col overflow-hidden rounded-3xl bg-zinc-950 p-10 md:col-span-2 md:row-span-2 border border-zinc-800"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md mb-8">
            <Bot className="h-6 w-6 text-white" />
          </div>
          
          <div className="mt-auto relative z-10 w-2/3">
            <h3 className="text-3xl font-medium text-white tracking-tight">
              The AI Resume Engine
            </h3>
            <p className="mt-4 text-zinc-400 leading-relaxed">
              Build your master profile once. The AI automatically tailors your resume for specific job descriptions, optimizing for ATS systems instantly.
            </p>
          </div>

          {/* Interactive ATS Gauge Mockup */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 h-64 w-64 rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-md p-6 flex flex-col items-center justify-center transition-transform duration-700 ease-out group-hover:scale-105 hidden md:flex">
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* Fake SVG ring */}
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-white/10" strokeWidth="6" />
                <motion.circle 
                  cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-green-500" strokeWidth="6" strokeLinecap="round"
                  initial={{ strokeDasharray: "0 283" }}
                  whileInView={{ strokeDasharray: "277 283" }}
                  transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white tracking-tighter">98<span className="text-lg text-zinc-400">%</span></span>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full text-xs font-medium">
              <CheckCircle2 className="w-4 h-4" />
              ATS Optimized
            </div>
          </div>
        </motion.div>

        {/* Cell 2: 2x1 - Cover Letters */}
        <motion.div
          className="group relative col-span-1 flex flex-col justify-end overflow-hidden rounded-3xl bg-zinc-100 p-8 md:col-span-2 md:row-span-1 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* AI Text Highlight Mockup */}
          <div className="absolute top-8 right-8 w-64 bg-white dark:bg-zinc-950 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 hidden sm:block">
            <div className="flex gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <div className="text-[9px] font-mono font-medium text-blue-600 dark:text-blue-400 uppercase tracking-widest">AI Tailoring</div>
            </div>
            <div className="text-xs text-zinc-400 dark:text-zinc-600 space-y-1.5 leading-relaxed">
              I am thrilled to apply for the <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200 px-1 rounded">Senior React Developer</span> position at your company. My background in <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200 px-1 rounded">frontend architecture</span> perfectly aligns with your goals.
            </div>
          </div>

          <div className="absolute right-8 bottom-8 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-zinc-950 transition-transform duration-700 group-hover:scale-110 md:hidden">
            <FileText className="h-5 w-5 text-zinc-900 dark:text-white" />
          </div>

          <div className="relative z-10 w-full md:w-1/2">
            <h3 className="text-2xl font-medium text-zinc-950 dark:text-white tracking-tight">Contextual Cover Letters</h3>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Generate perfectly toned cover letters that map your experience directly to the role requirements.
            </p>
          </div>
        </motion.div>

        {/* Cell 3: 1x1 - Custom Portfolios */}
        <motion.div
          className="group relative col-span-1 flex flex-col overflow-hidden rounded-3xl bg-zinc-50 p-8 border border-zinc-200 md:col-span-1 md:row-span-1 dark:bg-zinc-900 dark:border-zinc-800"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Mini Browser UI */}
          <div className="absolute -top-4 -right-12 w-48 h-32 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl p-2 transform rotate-12 transition-transform duration-700 group-hover:rotate-6 group-hover:-translate-x-4">
            <div className="h-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-1 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900" />
              <div className="flex-1 space-y-1 pt-1">
                <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-900 rounded" />
                <div className="w-2/3 h-2 bg-zinc-100 dark:bg-zinc-900 rounded" />
              </div>
            </div>
          </div>

          <div className="mt-auto relative z-10">
            <h3 className="text-xl font-medium text-zinc-950 dark:text-white">Web Portfolios</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Publish instantly to a custom subdomain.
            </p>
          </div>
        </motion.div>

        {/* Cell 4: 1x1 - Privacy */}
        <motion.div
          className="group relative col-span-1 flex flex-col overflow-hidden rounded-3xl bg-zinc-900 p-8 text-white md:col-span-1 md:row-span-1 border border-zinc-800"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="absolute right-8 top-8 w-16 h-16 flex items-center justify-center transition-transform duration-700 group-hover:scale-110">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl" />
            <ShieldCheck className="relative z-10 h-8 w-8 text-emerald-400" />
          </div>
          <div className="mt-auto relative z-10">
            <h3 className="text-xl font-medium">Privacy First</h3>
            <p className="mt-2 text-sm text-zinc-400">
              No login required. Local storage only.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
