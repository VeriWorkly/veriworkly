"use client";

import { motion, LayoutGroup } from "framer-motion";
import { ArrowRight, Sparkles, Award, Shield, Zap } from "lucide-react";
import Link from "next/link";
import Floating, { FloatingElement } from "@/components/ui/parallax-floating";
import { TextRotate } from "@/components/ui/text-rotate";

/**
 * `programEnabled` mirrors AMBASSADOR_PROGRAM_ENABLED, the same flag the apply page
 * already respects. Without it the pitch rendered fully in production while "Join
 * Campus Crew" dead-ended on a coming-soon card.
 *
 * The floating cards deliberately carry no point totals or licence keys: the server
 * implements apply, approve, and status only - there is no points model, no voucher
 * model, and no automated .edu verification behind them.
 */
const AmbassadorHero = ({ programEnabled }: { programEnabled: boolean }) => {
  return (
    <section className="ambassador-bg-noise relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden pt-24 pb-20 md:overflow-visible">
      <Floating sensitivity={-0.5} className="pointer-events-none h-full select-none">
        <FloatingElement depth={0.6} className="top-[15%] left-[3%] z-10 md:top-[22%] md:left-[8%]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            aria-hidden="true"
            className="glass-card flex h-16 w-20 -rotate-6 flex-col justify-center gap-1.5 overflow-hidden rounded-2xl border border-zinc-200/50 p-3 shadow-2xl transition-transform duration-200 hover:scale-105 sm:h-20 sm:w-28 md:h-24 md:w-32 lg:h-28 lg:w-36 dark:border-white/10"
          >
            <span className="block h-1.5 w-3/4 rounded-full bg-indigo-500/30" />
            <span className="block h-1.5 w-full rounded-full bg-zinc-400/30" />
            <span className="block h-1.5 w-5/6 rounded-full bg-zinc-400/30" />
            <span className="block h-1.5 w-2/3 rounded-full bg-zinc-400/20" />
          </motion.div>
        </FloatingElement>

        <FloatingElement
          depth={1.2}
          className="top-[5%] left-[83%] z-15 md:top-[12%] md:left-[78%]"
        >
          <motion.div
            className="glass-card flex w-36 rotate-[8deg] flex-col justify-between rounded-2xl border border-zinc-200/60 p-4 shadow-2xl md:w-48 dark:border-white/15"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="block text-[8px] leading-none font-black tracking-widest text-indigo-600 uppercase dark:text-indigo-400">
                  Campus Crew
                </span>
                <span className="mt-1.5 block text-xs font-bold tracking-tight text-zinc-900 dark:text-white">
                  Peer-to-peer, on your campus
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[8px] font-bold tracking-wider text-indigo-600 uppercase dark:text-indigo-400">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              <span>Illustrative</span>
            </div>
          </motion.div>
        </FloatingElement>

        <FloatingElement depth={0.4} className="top-[78%] left-[2%] z-10 md:top-[68%] md:left-[6%]">
          <motion.div
            className="glass-card flex w-40 rotate-[-10deg] flex-col justify-between rounded-[22px] border border-zinc-200/60 p-4 shadow-2xl md:w-52 dark:border-white/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <div>
              <span className="block text-[8px] font-black tracking-widest text-indigo-600 uppercase dark:text-indigo-400">
                VeriWorkly Campus ID
              </span>
              <h4 className="mt-0.5 text-xs font-extrabold tracking-tight text-zinc-900 dark:text-white">
                Student Node Leader
              </h4>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-zinc-200/50 pt-2 font-mono text-[8px] text-zinc-500 dark:border-white/5">
              <span>M26//27</span>
              <span className="font-bold text-emerald-600 uppercase dark:text-emerald-400">
                ACTIVE
              </span>
            </div>
          </motion.div>
        </FloatingElement>

        <FloatingElement
          depth={1.5}
          className="top-[82%] left-[78%] z-15 md:top-[74%] md:left-[80%]"
        >
          <motion.div
            className="glass-card flex w-32 rotate-12 items-center gap-3 rounded-xl border border-zinc-200/50 p-3.5 shadow-xl md:w-40 dark:border-white/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-indigo-500/10 bg-indigo-500/10">
              <Zap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <span className="block text-[8px] leading-none font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                Campus Reach
              </span>
              <span className="mt-0.5 block text-xs font-extrabold tracking-tight text-zinc-900 dark:text-white">
                Your cohort
              </span>
            </div>
          </motion.div>
        </FloatingElement>

        <FloatingElement
          depth={0.8}
          className="top-[2%] left-[45%] z-10 -translate-x-1/2 md:top-[4%] md:left-[50%]"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            aria-hidden="true"
            className="glass-card flex h-16 w-24 rotate-[4deg] flex-col justify-center gap-1.5 overflow-hidden rounded-2xl border border-zinc-200/50 p-3 shadow-2xl transition-transform duration-200 hover:scale-105 sm:h-22 sm:w-32 md:h-26 md:w-36 lg:h-30 lg:w-40 dark:border-white/10"
          >
            <span className="block h-1.5 w-2/3 rounded-full bg-emerald-500/30" />
            <span className="block h-1.5 w-full rounded-full bg-zinc-400/30" />
            <span className="block h-1.5 w-4/5 rounded-full bg-zinc-400/30" />
            <span className="block h-1.5 w-1/2 rounded-full bg-zinc-400/20" />
          </motion.div>
        </FloatingElement>
      </Floating>

      <div className="pointer-events-auto z-20 mt-6 flex w-full max-w-70 flex-col items-center justify-center px-6 text-center select-none sm:max-w-112.5 md:mt-0 md:max-w-175 lg:max-w-225">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/15 bg-indigo-500/5 px-4 py-1.5 font-sans text-[9px] font-black tracking-widest text-indigo-600 uppercase shadow-xs dark:border-indigo-500/20 dark:text-indigo-400"
        >
          <Sparkles className="h-3.5 w-3.5 animate-pulse text-indigo-500 dark:text-indigo-400" />
          <span>Campus Network Program</span>
        </motion.div>

        {/*
          TextRotate splits its text into one element per grapheme to animate them, so
          the rendered heading exposes an accessible name like "Make it f u n". A static
          aria-label gives assistive tech (and anything reading the accessibility tree)
          the real sentence, and the animated subtree is hidden from it entirely.
        */}
        <motion.h1
          aria-label="Represent VeriWorkly. Make it fun."
          className="text-3xl leading-[1.05] font-extrabold tracking-tight text-zinc-950 sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl dark:text-white"
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut", delay: 0.1 }}
        >
          <span aria-hidden="true">
            Represent VeriWorkly. <br />
          </span>
          <LayoutGroup>
            <motion.span
              layout
              aria-hidden="true"
              className="flex flex-wrap items-center justify-center text-center whitespace-pre"
            >
              <motion.span
                layout
                className="inline-block"
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
              >
                Make it{" "}
              </motion.span>
              <TextRotate
                texts={[
                  "fun 🚀",
                  "funky 🪩",
                  "cool 🕶️",
                  "rewarding 💎",
                  "premium ✨",
                  "active ⚡",
                  "fancy 💅",
                  "yours 🔥",
                ]}
                mainClassName="overflow-hidden pr-3 text-indigo-600 dark:text-indigo-400 py-0 pb-1 md:pb-2 rounded-xl"
                staggerDuration={0.03}
                staggerFrom="last"
                rotationInterval={2500}
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
              />
            </motion.span>
          </LayoutGroup>
        </motion.h1>

        <motion.p
          className="mx-auto max-w-xl pt-6 text-sm font-semibold text-zinc-500 sm:pt-8 sm:text-base md:pt-10 md:text-lg lg:text-xl dark:text-zinc-400"
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut", delay: 0.3 }}
        >
          Share local-first career editors with classmates on campus. We are building the campus
          crew now — apply to be one of the first ambassadors, and help shape how the program
          rewards its leaders.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut", delay: 0.5 }}
          className="mt-8 flex w-full flex-col items-center justify-center gap-4 sm:mt-12 sm:w-auto sm:flex-row"
        >
          {programEnabled ? (
            <Link
              href="/ambassador/apply"
              className="inline-flex w-full cursor-pointer items-center justify-center rounded-full border border-zinc-950/10 bg-zinc-950 px-8 py-4 text-xs font-black tracking-wider text-white uppercase shadow-lg transition-all hover:bg-zinc-900 active:scale-[0.98] sm:w-auto dark:border-white/20 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
            >
              Join Campus Crew
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          ) : (
            <span
              role="status"
              className="glass-card inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-4 text-xs font-black tracking-wider text-zinc-800 uppercase shadow-md sm:w-auto dark:text-white"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Applications open soon
            </span>
          )}
          <button
            onClick={() => {
              document.getElementById("playbook")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="glass-card inline-flex w-full cursor-pointer items-center justify-center rounded-full px-8 py-4 text-xs font-black tracking-wider text-zinc-800 uppercase shadow-md active:scale-[0.98] sm:w-auto dark:text-white"
          >
            See the plan
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-8 flex w-full max-w-md flex-wrap items-center justify-center gap-6 border-t border-zinc-200/50 pt-8 text-[9px] font-black tracking-wider text-zinc-500 uppercase dark:border-white/5"
        >
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Rewards in development</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Applications reviewed by hand</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AmbassadorHero;
