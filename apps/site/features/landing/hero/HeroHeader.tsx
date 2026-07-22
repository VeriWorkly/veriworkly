"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Fingerprint,
  Sparkles,
  Check,
  MoreHorizontal,
  FileText,
  Briefcase,
  Globe,
  Layout,
  Wand2,
  Type,
} from "lucide-react";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { siteConfig } from "@/config/site";

export const HeroHeader = () => {
  return (
    <div className="w-full bg-[#f3f4f6] p-2 md:p-3 lg:p-4 dark:bg-[#000000]">
      <div className="relative flex w-full flex-col items-center justify-center overflow-hidden rounded-4xl border border-black/5 bg-white pt-32 pb-24 shadow-sm lg:rounded-[2.5rem] lg:pt-40 lg:pb-32 dark:border-white/5 dark:bg-[#080808]">
        <div className="pointer-events-auto absolute inset-0 z-0 flex justify-center opacity-70 mix-blend-multiply dark:opacity-40 dark:mix-blend-screen">
          <BackgroundRippleEffect rows={25} cols={50} cellSize={64} />
        </div>

        <div className="pointer-events-none absolute top-0 left-1/2 h-150 w-full max-w-250 -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-500/15" />
        <div className="pointer-events-none absolute bottom-0 left-0 z-10 h-[40%] w-full bg-linear-to-t from-white via-white/80 to-transparent dark:from-[#080808] dark:via-[#080808]/80" />

        <div className="relative z-20 container mx-auto flex max-w-6xl flex-col items-center px-4 text-center">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute top-[10%] left-[5%] hidden items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-2 text-sm text-blue-600 backdrop-blur-md lg:flex dark:text-blue-400"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span>Resume AI</span>
          </motion.div>

          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="pointer-events-none absolute top-[15%] right-[5%] hidden items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-2 text-sm text-blue-600 backdrop-blur-md lg:flex dark:text-blue-400"
          >
            <Briefcase className="h-4 w-4" aria-hidden="true" />
            <span>Cover Letter</span>
          </motion.div>

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="pointer-events-none absolute top-[45%] left-[12%] hidden items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-2 text-sm text-blue-600 backdrop-blur-md lg:flex dark:text-blue-400"
          >
            <Globe className="h-4 w-4" aria-hidden="true" />
            <span>Portfolio Builder</span>
          </motion.div>

          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            className="pointer-events-none absolute top-[48%] right-[10%] hidden items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-2 text-sm text-blue-600 backdrop-blur-md lg:flex dark:text-blue-400"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>AI CV</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="pointer-events-auto mb-10 flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-4 py-2 text-sm font-medium text-gray-800 shadow-sm backdrop-blur-md transition-transform hover:scale-[1.02] dark:border-white/10 dark:bg-black/50 dark:text-gray-200 dark:hover:bg-black"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20">
              <Check
                className="h-3 w-3 text-blue-600 dark:text-blue-400"
                strokeWidth={3}
                aria-hidden="true"
              />
            </div>
            Privacy-First Document & Portfolio Workspace
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            className="pointer-events-auto flex flex-col items-center text-center text-[clamp(3.5rem,8vw,7.5rem)] leading-[0.9] font-semibold tracking-tighter"
          >
            <span className="block text-gray-400 dark:text-gray-600">The future</span>
            <span className="block text-gray-400 dark:text-gray-600">of your career</span>
            <span className="mt-4 flex flex-wrap items-center justify-center gap-x-3 text-gray-900 sm:gap-x-5 dark:text-white">
              is{" "}
              <span className="relative flex items-center gap-2">
                <Fingerprint
                  className="h-[clamp(3rem,7vw,6.5rem)] w-[clamp(3rem,7vw,6.5rem)] text-blue-500 drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]"
                  strokeWidth={1}
                  aria-hidden="true"
                />
                human
              </span>{" "}
              +{" "}
              <span className="relative flex items-center gap-2">
                <Sparkles
                  className="h-[clamp(3rem,7vw,6.5rem)] w-[clamp(3rem,7vw,6.5rem)] text-cyan-500 drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]"
                  strokeWidth={1}
                  aria-hidden="true"
                />
                AI
              </span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="pointer-events-auto mt-8 max-w-2xl text-lg leading-relaxed font-medium text-balance text-gray-500 dark:text-gray-400"
          >
            Build ATS-proof resumes, targeted cover letters, and live web portfolios in minutes.
            Free forever, privacy-first, and zero login required.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="pointer-events-auto mt-10 flex flex-col items-center gap-4 sm:flex-row"
          >
            <Link
              href={siteConfig.links.app}
              className="group relative flex h-14 items-center justify-center rounded-full border border-blue-500/40 bg-[#0A0A0A] px-10 text-base font-medium text-white shadow-[0_0_30px_rgba(59,130,246,0.2)] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:border-blue-400 hover:shadow-[0_0_40px_rgba(59,130,246,0.4)] active:scale-[0.97]"
            >
              Start Building Free
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="pointer-events-auto relative z-20 mt-24 -mb-32 grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 lg:-mb-48"
          >
            <div className="group flex flex-col justify-between rounded-4xl border border-black/5 bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_8px_40px_rgba(59,130,246,0.12)] md:translate-y-8 md:hover:translate-y-6 dark:border-white/10 dark:bg-[#111]">
              <div>
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10">
                      <FileText className="h-4 w-4 text-blue-500" aria-hidden="true" />
                    </div>
                    Resume Strength
                  </h3>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 transition-colors group-hover:bg-blue-50 dark:bg-white/5 dark:group-hover:bg-blue-900/30">
                    <MoreHorizontal
                      className="h-4 w-4 text-gray-400 group-hover:text-blue-500"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <div className="mb-3 flex h-3.5 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner dark:bg-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "85%" }}
                    transition={{ duration: 1, delay: 0.8, ease: [0.23, 1, 0.32, 1] }}
                    className="h-full rounded-full bg-linear-to-r from-blue-400 to-blue-600"
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Score: 85/100</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">Top 15%</span>
                </div>
              </div>
              <div className="mt-8 rounded-[1.25rem] border border-gray-100 bg-[#FAFAFA] p-4 text-left transition-colors group-hover:border-blue-100 group-hover:bg-blue-50/50 dark:border-white/5 dark:bg-white/5 dark:group-hover:border-blue-900/30 dark:group-hover:bg-blue-900/10">
                <div className="mb-1 text-xs font-medium tracking-wider text-gray-400 uppercase">
                  Status
                </div>
                <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                  ATS Optimized
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 1.2, bounce: 0.5 }}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
                  >
                    <Check
                      className="h-3 w-3 text-green-600 dark:text-green-400"
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                  </motion.div>
                </div>
              </div>
            </div>

            <div className="group flex flex-col justify-between rounded-4xl border border-black/5 bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-6 hover:shadow-[0_8px_40px_rgba(59,130,246,0.12)] md:-translate-y-4 md:hover:-translate-y-6 dark:border-white/10 dark:bg-[#111]">
              <div>
                <div className="mb-3 flex items-center gap-2 text-left text-sm font-semibold text-gray-500">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10">
                    <Briefcase className="h-4 w-4 text-blue-500" aria-hidden="true" />
                  </div>
                  Cover Letter
                </div>
                <div className="mb-6 flex items-center justify-between">
                  <div className="text-[2rem] leading-none font-bold tracking-tight text-gray-900 dark:text-white">
                    Generated
                  </div>
                  <motion.div
                    whileHover={{ rotate: 15, scale: 1.1 }}
                    className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-blue-50 text-blue-600 shadow-sm transition-all group-hover:bg-blue-500 group-hover:text-white group-hover:shadow-blue-500/25 dark:bg-blue-500/10 dark:text-blue-400"
                  >
                    <Check className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
                  </motion.div>
                </div>
              </div>
              <div className="mt-4 rounded-[1.25rem] bg-[#0A0A0A] p-5 text-left text-white shadow-lg transition-transform duration-300 ease-out group-hover:scale-[1.03] dark:border dark:border-white/5 dark:bg-[#1A1A1A]">
                <div className="mb-1.5 text-xs font-medium tracking-wider text-gray-400 uppercase">
                  Target Role
                </div>
                <div className="text-lg font-semibold">Senior React Developer</div>
                <div className="mt-3 flex w-fit items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-sm text-blue-400">
                  <span className="flex" aria-label="5 out of 5 stars">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8 + i * 0.1, type: "spring" }}
                        aria-hidden="true"
                      >
                        ★
                      </motion.span>
                    ))}
                  </span>
                  <span className="ml-1 font-medium">98% Match</span>
                </div>
              </div>
            </div>

            <div className="group flex flex-col justify-between rounded-4xl border border-black/5 bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_8px_40px_rgba(59,130,246,0.12)] md:translate-y-12 md:hover:translate-y-10 dark:border-white/10 dark:bg-[#111]">
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10">
                      <Globe className="h-4 w-4 text-blue-500" aria-hidden="true" />
                    </div>
                    Live Portfolio
                  </h3>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 transition-colors group-hover:bg-blue-50 dark:bg-white/5 dark:group-hover:bg-blue-900/30">
                    <MoreHorizontal
                      className="h-4 w-4 text-gray-400 group-hover:text-blue-500"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-left transition-colors group-hover:bg-white group-hover:shadow-sm dark:border-white/5 dark:bg-white/5 dark:group-hover:bg-white/10">
                  <div className="h-11 w-11 shrink-0 rounded-full bg-linear-to-br from-blue-400 to-indigo-600 shadow-inner" />
                  <div className="flex-1 overflow-hidden">
                    <div className="truncate font-semibold text-gray-900 dark:text-white">
                      Alex Developer
                    </div>
                    <div className="truncate text-sm text-gray-500">alex.dev/portfolio</div>
                  </div>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between rounded-[1.25rem] border border-blue-100 bg-blue-50/50 p-5 transition-colors group-hover:bg-blue-50 dark:border-blue-500/10 dark:bg-blue-500/5 dark:group-hover:bg-blue-500/10">
                <div className="text-left">
                  <div className="mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                    Total Views
                  </div>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">+2,405</div>
                </div>
                <div className="h-10 w-20 opacity-40 transition-opacity group-hover:opacity-100">
                  <svg
                    viewBox="0 0 100 30"
                    className="h-full w-full stroke-blue-500 drop-shadow-[0_2px_4px_rgba(59,130,246,0.3)]"
                    fill="none"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <motion.path
                      d="M0 25 Q 15 25, 25 20 T 50 15 T 75 10 T 100 5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.5, ease: "easeInOut", delay: 1 }}
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="group flex flex-col justify-between rounded-4xl border border-black/5 bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_8px_40px_rgba(59,130,246,0.12)] md:translate-y-8 md:hover:translate-y-6 dark:border-white/10 dark:bg-[#111]">
              <div>
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10">
                      <Sparkles className="h-4 w-4 text-blue-500" aria-hidden="true" />
                    </div>
                    AI Smart Writer
                  </h3>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 transition-colors group-hover:bg-blue-50 dark:bg-white/5 dark:group-hover:bg-blue-900/30">
                    <MoreHorizontal
                      className="h-4 w-4 text-gray-400 group-hover:text-blue-500"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <div className="relative mt-4 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5">
                  <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/50 to-transparent transition-transform duration-1000 group-hover:translate-x-full dark:via-white/5"></div>
                  <div className="mb-2 flex items-center gap-2">
                    <Wand2 className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      Generating Summary...
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-white/10"></div>
                    <div className="h-2 w-4/5 rounded-full bg-gray-200 dark:bg-white/10"></div>
                    <div className="h-2 w-5/6 rounded-full bg-gray-200 dark:bg-white/10"></div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Powered by GenAI</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <Type className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="group flex flex-col justify-between rounded-4xl border border-black/5 bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-6 hover:shadow-[0_8px_40px_rgba(59,130,246,0.12)] md:-translate-y-4 md:hover:-translate-y-6 dark:border-white/10 dark:bg-[#111]">
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10">
                      <Fingerprint className="h-4 w-4 text-blue-500" aria-hidden="true" />
                    </div>
                    ATS Friendly
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-green-100 bg-green-50 p-3 dark:border-green-900/20 dark:bg-green-900/10">
                    <span className="text-sm font-medium text-green-900 dark:text-green-300">
                      Parse Rate
                    </span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                      99.9%
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-white/5 dark:bg-white/5">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Keyword Match
                    </span>
                    <span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      Excellent
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="group flex flex-col justify-between rounded-4xl border border-black/5 bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_8px_40px_rgba(59,130,246,0.12)] md:translate-y-12 md:hover:translate-y-10 dark:border-white/10 dark:bg-[#111]">
              <div>
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10">
                      <Layout className="h-4 w-4 text-blue-500" aria-hidden="true" />
                    </div>
                    Premium Templates
                  </h3>
                </div>
                <div className="my-4 flex justify-center">
                  <div className="relative h-24 w-full max-w-50">
                    <div className="absolute top-0 left-0 h-20 w-16 -rotate-6 rounded-lg border border-gray-200 bg-white shadow-sm transition-transform group-hover:-translate-x-2 group-hover:-rotate-12 dark:border-white/10 dark:bg-gray-800"></div>
                    <div className="absolute top-2 left-1/2 z-10 h-24 w-20 -translate-x-1/2 rounded-lg border border-gray-200 bg-white shadow-md transition-transform group-hover:-translate-y-2 dark:border-white/10 dark:bg-gray-900"></div>
                    <div className="absolute top-0 right-0 h-20 w-16 rotate-6 rounded-lg border border-gray-200 bg-white shadow-sm transition-transform group-hover:translate-x-2 group-hover:rotate-12 dark:border-white/10 dark:bg-gray-800"></div>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.25rem] bg-gray-100 p-3.5 text-center transition-colors group-hover:bg-blue-50 dark:bg-white/5 dark:group-hover:bg-blue-900/20">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Explore Gallery
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
