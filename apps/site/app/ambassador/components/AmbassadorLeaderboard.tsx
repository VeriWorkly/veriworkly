"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Users, Video, FileText } from "lucide-react";

type Ambassador = {
  rank: string;
  name: string;
  school: string;
  points: number;
  stats: { referrals: number; videos: number; shares: number };
};

const topAmbassadors: Ambassador[] = [
  {
    rank: "01",
    name: "Alex Chen",
    school: "University of Waterloo",
    points: 1950,
    stats: { referrals: 45, videos: 12, shares: 25 },
  },
  {
    rank: "02",
    name: "Sarah Jenkins",
    school: "University of Toronto",
    points: 1820,
    stats: { referrals: 38, videos: 18, shares: 14 },
  },
  {
    rank: "03",
    name: "Michael Zhang",
    school: "MIT",
    points: 1450,
    stats: { referrals: 29, videos: 8, shares: 32 },
  },
  {
    rank: "04",
    name: "Emily Rodriguez",
    school: "Stanford University",
    points: 1320,
    stats: { referrals: 24, videos: 10, shares: 18 },
  },
  {
    rank: "05",
    name: "David Kim",
    school: "UT Austin",
    points: 980,
    stats: { referrals: 18, videos: 4, shares: 16 },
  },
];

export function AmbassadorLeaderboard() {
  const [expandedIndex, setExpandedIndex] = useState<string | null>(null);

  return (
    <section
      id="leaderboard-section"
      className="bg-background relative mx-auto w-full max-w-7xl border-b border-zinc-200/80 px-6 py-28 dark:border-white/10"
    >
      <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[0.8fr_1.2fr]">
        {/* Left Column: Sticky Heading */}
        <div className="space-y-4 lg:sticky lg:top-32">
          <h2 className="text-5xl leading-[0.85] font-black tracking-tight text-zinc-950 uppercase sm:text-6xl md:text-7xl dark:text-white">
            CAMPUS
            <br />
            STANDINGS
          </h2>
          <p className="text-zinc-555 max-w-sm text-sm leading-relaxed dark:text-zinc-400">
            Ranks are updated automatically based on peer registrations and approved creator
            walkthroughs.
          </p>
        </div>

        {/* Right Column: Clean Table Rows (no boxed cards!) */}
        <div className="border-t border-zinc-950 dark:border-white/20">
          {topAmbassadors.map((leader) => {
            const isExpanded = expandedIndex === leader.rank;

            return (
              <div key={leader.rank} className="border-b border-zinc-200 dark:border-white/10">
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : leader.rank)}
                  className="group flex w-full cursor-pointer items-center justify-between rounded-lg px-4 py-6 text-left transition-colors duration-300 hover:bg-zinc-50 dark:hover:bg-white/2"
                >
                  <div className="flex items-center gap-6">
                    {/* Rank */}
                    <span className="text-zinc-450 block w-8 font-mono text-xl leading-none font-black dark:text-zinc-500">
                      {leader.rank}
                    </span>

                    <div>
                      <h4 className="text-zinc-955 text-base font-extrabold tracking-tight dark:text-white">
                        {leader.name}
                      </h4>
                      <span className="mt-1 block font-mono text-[10px] tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                        {leader.school}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-zinc-955 block font-mono text-base font-black dark:text-white">
                        {leader.points.toLocaleString()}
                      </span>
                      <span className="mt-0.5 block text-[8px] font-black tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                        Points
                      </span>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-zinc-400 dark:text-zinc-500"
                    >
                      <ChevronDown className="h-4.5 w-4.5" />
                    </motion.div>
                  </div>
                </button>

                {/* Collapsible stats */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                      className="overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/10"
                    >
                      <div className="grid grid-cols-3 gap-6 border-t border-dashed border-zinc-200 px-14 pt-4 pb-6 text-left dark:border-white/10">
                        <div className="space-y-1">
                          <span className="flex items-center gap-1.5 text-[8px] font-black tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                            <Users className="h-3.5 w-3.5 text-zinc-400" /> Referrals
                          </span>
                          <span className="block font-mono text-xs font-bold text-zinc-900 dark:text-white">
                            {leader.stats.referrals} peers
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="flex items-center gap-1.5 text-[8px] font-black tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                            <Video className="h-3.5 w-3.5 text-zinc-400" /> Walkthroughs
                          </span>
                          <span className="block font-mono text-xs font-bold text-zinc-900 dark:text-white">
                            {leader.stats.videos} vids
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="flex items-center gap-1.5 text-[8px] font-black tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                            <FileText className="h-3.5 w-3.5 text-zinc-400" /> Shares
                          </span>
                          <span className="block font-mono text-xs font-bold text-zinc-900 dark:text-white">
                            {leader.stats.shares} posts
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
