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

export const HeroFeatureCards = () => {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 40 }}
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
                strokeWidth={3}
                aria-hidden="true"
                className="h-3 w-3 text-green-600 dark:text-green-400"
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
              <div className="truncate font-semibold text-gray-900 dark:text-white">Gautam Raj</div>

              <div className="truncate text-sm text-gray-500">gautam.dev/portfolio</div>
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

              <span className="text-sm font-bold text-green-600 dark:text-green-400">99.9%</span>
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

        <Link
          href="/templates"
          className="focus-visible:ring-opacity-60 block rounded-[1.25rem] bg-gray-100 p-3.5 text-center transition-colors group-hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:bg-white/5 dark:group-hover:bg-blue-900/20"
        >
          <span className="text-sm font-medium text-gray-900 dark:text-white">Explore Gallery</span>
        </Link>
      </div>
    </motion.div>
  );
};

export default HeroFeatureCards;
