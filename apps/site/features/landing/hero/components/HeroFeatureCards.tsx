import {
  Type,
  Check,
  Globe,
  Wand2,
  Layout,
  Sparkles,
  FileText,
  Briefcase,
  Fingerprint,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

/**
 * The scores, match percentages and view counts in these cards are illustrative - they
 * show what the interface looks like, not anything measured. They are captioned as
 * such below, following the same convention as ReportPreview on /ats-checker: a
 * fabricated number rendered without a label reads as a product fact.
 */
export const HeroFeatureCards = () => {
  return (
    <motion.figure
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.7, delay: 0.45, ease: [0.23, 1, 0.32, 1] }}
      className="pointer-events-auto relative z-20 mt-10 -mb-16 grid w-full max-w-5xl grid-cols-1 gap-3.5 sm:mt-14 sm:-mb-24 sm:grid-cols-2 sm:gap-4 md:-mb-28 lg:mt-20 lg:-mb-36 lg:grid-cols-3 lg:gap-5.5"
    >
      <div className="group flex flex-col justify-between rounded-3xl border border-black/5 bg-white p-4.5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_8px_32px_rgba(59,130,246,0.12)] sm:p-5 lg:translate-y-4 lg:p-6 lg:hover:translate-y-2 dark:border-white/10 dark:bg-[#111]">
        <div>
          <div className="mb-3.5 flex items-center justify-between sm:mb-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-900 sm:text-sm dark:text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 sm:h-8 sm:w-8 dark:bg-blue-500/10">
                <FileText className="h-3.5 w-3.5 text-blue-500 sm:h-4 sm:w-4" aria-hidden="true" />
              </div>
              Resume Strength
            </h3>

            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-50 transition-colors group-hover:bg-blue-50 sm:h-8 sm:w-8 dark:bg-white/5 dark:group-hover:bg-blue-900/30">
              <MoreHorizontal
                className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-500 sm:h-4 sm:w-4"
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="mb-2.5 flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner sm:h-3 dark:bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "85%" }}
              transition={{ duration: 1, delay: 0.8, ease: [0.23, 1, 0.32, 1] }}
              className="h-full rounded-full bg-linear-to-r from-blue-400 to-blue-600"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 sm:text-sm">
            <span>Score: 85/100</span>
            <span className="font-medium text-blue-600 dark:text-blue-400">Top 15%</span>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-100 bg-[#FAFAFA] p-3 text-left transition-colors group-hover:border-blue-100 group-hover:bg-blue-50/50 sm:mt-6 sm:p-3.5 dark:border-white/5 dark:bg-white/5 dark:group-hover:border-blue-900/30 dark:group-hover:bg-blue-900/10">
          <div className="mb-0.5 text-[10px] font-medium tracking-wider text-gray-400 uppercase sm:text-xs">
            Status
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 sm:text-sm dark:text-white">
            ATS Optimized
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 1.2, bounce: 0.5 }}
              className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-green-100 sm:h-5 sm:w-5 dark:bg-green-900/30"
            >
              <Check
                strokeWidth={3}
                aria-hidden="true"
                className="h-2.5 w-2.5 text-green-600 sm:h-3 sm:w-3 dark:text-green-400"
              />
            </motion.div>
          </div>
        </div>
      </div>

      <div className="group flex flex-col justify-between rounded-3xl border border-black/5 bg-white p-4.5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_8px_32px_rgba(59,130,246,0.12)] sm:p-5 lg:-translate-y-2 lg:p-6 lg:hover:-translate-y-4 dark:border-white/10 dark:bg-[#111]">
        <div>
          <div className="mb-2 flex items-center gap-2 text-left text-xs font-semibold text-gray-500 sm:text-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 sm:h-8 sm:w-8 dark:bg-blue-500/10">
              <Briefcase className="h-3.5 w-3.5 text-blue-500 sm:h-4 sm:w-4" aria-hidden="true" />
            </div>
            Cover Letter
          </div>

          <div className="mb-4 flex items-center justify-between sm:mb-5">
            <div className="text-xl leading-none font-bold tracking-tight text-gray-900 sm:text-2xl lg:text-[1.75rem] dark:text-white">
              Generated
            </div>

            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-blue-50 text-blue-600 shadow-xs transition-all group-hover:bg-blue-500 group-hover:text-white group-hover:shadow-blue-500/25 sm:h-10 sm:w-10 dark:bg-blue-500/10 dark:text-blue-400"
            >
              <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            </motion.div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl bg-[#0A0A0A] p-3.5 text-left text-white shadow-md transition-transform duration-300 ease-out group-hover:scale-[1.02] sm:p-4 dark:border dark:border-white/5 dark:bg-[#1A1A1A]">
          <div className="mb-1 text-[10px] font-medium tracking-wider text-gray-400 uppercase sm:text-xs">
            Target Role
          </div>

          <div className="truncate text-sm font-semibold sm:text-base">Senior React Developer</div>

          <div className="mt-2.5 flex w-fit items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
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

      <div className="group flex flex-col justify-between rounded-3xl border border-black/5 bg-white p-4.5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_8px_32px_rgba(59,130,246,0.12)] sm:p-5 lg:translate-y-6 lg:p-6 lg:hover:translate-y-4 dark:border-white/10 dark:bg-[#111]">
        <div>
          <div className="mb-3.5 flex items-center justify-between sm:mb-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-900 sm:text-sm dark:text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 sm:h-8 sm:w-8 dark:bg-blue-500/10">
                <Globe className="h-3.5 w-3.5 text-blue-500 sm:h-4 sm:w-4" aria-hidden="true" />
              </div>
              Live Portfolio
            </h3>

            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-50 transition-colors group-hover:bg-blue-50 sm:h-8 sm:w-8 dark:bg-white/5 dark:group-hover:bg-blue-900/30">
              <MoreHorizontal
                className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-500 sm:h-4 sm:w-4"
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-left transition-colors group-hover:bg-white group-hover:shadow-xs sm:p-3.5 dark:border-white/5 dark:bg-white/5 dark:group-hover:bg-white/10">
            <div className="h-9 w-9 shrink-0 rounded-full bg-linear-to-br from-blue-400 to-indigo-600 shadow-inner sm:h-10 sm:w-10" />

            <div className="flex-1 overflow-hidden">
              <div className="truncate text-xs font-semibold text-gray-900 sm:text-sm dark:text-white">
                Gautam Raj
              </div>

              <div className="truncate text-[11px] text-gray-500 sm:text-xs">
                yourname.veriworkly.com
              </div>
            </div>

            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/50 p-3.5 transition-colors group-hover:bg-blue-50 sm:mt-6 sm:p-4 dark:border-blue-500/10 dark:bg-blue-500/5 dark:group-hover:bg-blue-500/10">
          <div className="text-left">
            <div className="mb-0.5 text-[10px] font-medium tracking-wider text-gray-500 uppercase sm:text-xs dark:text-gray-400">
              Total Views
            </div>

            <div className="text-base font-bold text-blue-600 sm:text-lg dark:text-blue-400">
              +2,405
            </div>
          </div>

          <div className="h-8 w-16 opacity-50 transition-opacity group-hover:opacity-100 sm:h-9 sm:w-20">
            <svg
              fill="none"
              strokeWidth="3"
              aria-hidden="true"
              viewBox="0 0 100 30"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-full w-full stroke-blue-500 drop-shadow-[0_2px_4px_rgba(59,130,246,0.3)]"
            >
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                d="M0 25 Q 15 25, 25 20 T 50 15 T 75 10 T 100 5"
                transition={{ duration: 1.5, ease: "easeInOut", delay: 1 }}
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="group flex flex-col justify-between rounded-3xl border border-black/5 bg-white p-4.5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_8px_32px_rgba(59,130,246,0.12)] sm:p-5 lg:translate-y-4 lg:p-6 lg:hover:translate-y-2 dark:border-white/10 dark:bg-[#111]">
        <div>
          <div className="mb-3.5 flex items-center justify-between sm:mb-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-900 sm:text-sm dark:text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 sm:h-8 sm:w-8 dark:bg-blue-500/10">
                <Sparkles className="h-3.5 w-3.5 text-blue-500 sm:h-4 sm:w-4" aria-hidden="true" />
              </div>
              AI Smart Writer
            </h3>

            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-50 transition-colors group-hover:bg-blue-50 sm:h-8 sm:w-8 dark:bg-white/5 dark:group-hover:bg-blue-900/30">
              <MoreHorizontal
                className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-500 sm:h-4 sm:w-4"
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="relative mt-3 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-3 sm:p-3.5 dark:border-white/5 dark:bg-white/5">
            <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/50 to-transparent transition-transform duration-1000 group-hover:translate-x-full dark:via-white/5" />
            <div className="mb-2 flex items-center gap-1.5">
              <Wand2 className="h-3 w-3 text-blue-500" />

              <span className="text-[11px] font-medium text-gray-600 sm:text-xs dark:text-gray-300">
                Generating Summary...
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-white/10" />

              <div className="h-1.5 w-4/5 rounded-full bg-gray-200 dark:bg-white/10" />

              <div className="h-1.5 w-5/6 rounded-full bg-gray-200 dark:bg-white/10" />
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between sm:mt-6">
          <span className="text-[11px] font-medium text-gray-500 sm:text-xs">Powered by GenAI</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600 sm:h-8 sm:w-8 dark:bg-blue-900/30 dark:text-blue-400">
            <Type className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        </div>
      </div>

      <div className="group flex flex-col justify-between rounded-3xl border border-black/5 bg-white p-4.5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_8px_32px_rgba(59,130,246,0.12)] sm:p-5 lg:-translate-y-2 lg:p-6 lg:hover:-translate-y-4 dark:border-white/10 dark:bg-[#111]">
        <div>
          <div className="mb-4 flex items-center justify-between sm:mb-5">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-900 sm:text-sm dark:text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 sm:h-8 sm:w-8 dark:bg-blue-500/10">
                <Fingerprint
                  className="h-3.5 w-3.5 text-blue-500 sm:h-4 sm:w-4"
                  aria-hidden="true"
                />
              </div>
              ATS Friendly
            </h3>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between rounded-xl border border-green-100 bg-green-50 p-2.5 sm:p-3 dark:border-green-900/20 dark:bg-green-900/10">
              <span className="text-xs font-medium text-green-900 sm:text-sm dark:text-green-300">
                Parse Rate
              </span>

              <span className="text-xs font-bold text-green-600 sm:text-sm dark:text-green-400">
                99.9%
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-2.5 sm:p-3 dark:border-white/5 dark:bg-white/5">
              <span className="text-xs font-medium text-gray-900 sm:text-sm dark:text-white">
                Keyword Match
              </span>

              <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 sm:text-xs dark:bg-blue-900/30 dark:text-blue-400">
                Excellent
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="group flex flex-col justify-between rounded-3xl border border-black/5 bg-white p-4.5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_8px_32px_rgba(59,130,246,0.12)] sm:p-5 lg:translate-y-6 lg:p-6 lg:hover:translate-y-4 dark:border-white/10 dark:bg-[#111]">
        <div>
          <div className="mb-3.5 flex items-center justify-between sm:mb-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-900 sm:text-sm dark:text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 sm:h-8 sm:w-8 dark:bg-blue-500/10">
                <Layout className="h-3.5 w-3.5 text-blue-500 sm:h-4 sm:w-4" aria-hidden="true" />
              </div>
              Premium Templates
            </h3>
          </div>

          <div className="my-2.5 flex justify-center sm:my-3">
            <div className="relative h-18 w-full max-w-40 sm:h-20 sm:max-w-44">
              <div className="absolute top-0 left-0 h-16 w-12 -rotate-6 rounded-lg border border-gray-200 bg-white shadow-2xs transition-transform group-hover:-translate-x-2 group-hover:-rotate-12 sm:h-18 sm:w-14 dark:border-white/10 dark:bg-gray-800" />

              <div className="absolute top-1.5 left-1/2 z-10 h-18 w-14 -translate-x-1/2 rounded-lg border border-gray-200 bg-white shadow-sm transition-transform group-hover:-translate-y-1.5 sm:h-20 sm:w-16 dark:border-white/10 dark:bg-gray-900" />

              <div className="absolute top-0 right-0 h-16 w-12 rotate-6 rounded-lg border border-gray-200 bg-white shadow-2xs transition-transform group-hover:translate-x-2 group-hover:rotate-12 sm:h-18 sm:w-14 dark:border-white/10 dark:bg-gray-800" />
            </div>
          </div>
        </div>

        <Link
          href="/templates"
          className="block rounded-2xl bg-gray-100 p-2.5 text-center text-xs font-semibold text-gray-900 transition-colors group-hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none sm:p-3 sm:text-sm dark:bg-white/5 dark:text-white dark:group-hover:bg-blue-900/20"
        >
          Explore Gallery
        </Link>
      </div>

      <figcaption className="text-muted/70 col-span-full mt-4 text-center font-mono text-[11px] lg:mt-8">
        Interface preview. Scores, match percentages and view counts shown here are illustrative.
      </figcaption>
    </motion.figure>
  );
};

export default HeroFeatureCards;
