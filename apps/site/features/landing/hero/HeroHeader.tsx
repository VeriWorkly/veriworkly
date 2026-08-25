"use client";

import { Fingerprint, Sparkles } from "lucide-react";

import { HeroBadge } from "./components/HeroBadge";
import { HeroFloatingTags } from "./components/HeroFloatingTags";
import { HeroFeatureCards } from "./components/HeroFeatureCards";
import { HeroActionButtons } from "./components/HeroActionButtons";

export const HeroHeader = () => {
  return (
    <div className="w-full bg-[#f3f4f6] p-2 md:p-3 lg:p-4 dark:bg-[#000000]">
      <div className="relative flex w-full flex-col items-center justify-center overflow-hidden rounded-4xl border border-black/5 bg-white pt-32 pb-24 shadow-sm lg:rounded-[2.5rem] lg:pt-40 lg:pb-32 dark:border-white/5 dark:bg-[#080808]">
        <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] mask-[radial-gradient(ellipse_100%_100%_at_50%_0%,#000_50%,transparent_100%)] bg-size-[64px_64px] bg-center opacity-70 mix-blend-multiply dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] dark:opacity-40 dark:mix-blend-screen" />

        <div className="pointer-events-none absolute top-0 left-1/2 h-150 w-full max-w-250 -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-500/15" />
        <div className="pointer-events-none absolute bottom-0 left-0 z-10 h-[40%] w-full bg-linear-to-t from-white via-white/80 to-transparent dark:from-[#080808] dark:via-[#080808]/80" />

        <div className="relative z-20 container mx-auto flex max-w-6xl flex-col items-center px-4 text-center">
          <HeroFloatingTags />
          <HeroBadge />

          <h1 className="pointer-events-auto flex flex-col items-center text-center text-[clamp(3.5rem,8vw,7.5rem)] leading-[0.9] font-semibold tracking-tighter">
            <span className="block text-gray-400 dark:text-gray-600">The future</span>

            <span className="block text-gray-400 dark:text-gray-600">of your career</span>

            <span className="mt-4 flex flex-wrap items-center justify-center gap-x-3 text-gray-900 sm:gap-x-5 dark:text-white">
              is{" "}
              <span className="relative flex items-center gap-2">
                <Fingerprint
                  strokeWidth={1}
                  aria-hidden="true"
                  className="h-[clamp(3rem,7vw,6.5rem)] w-[clamp(3rem,7vw,6.5rem)] text-blue-500 drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]"
                />
                human
              </span>{" "}
              +{" "}
              <span className="relative flex items-center gap-2">
                <Sparkles
                  strokeWidth={1}
                  aria-hidden="true"
                  className="h-[clamp(3rem,7vw,6.5rem)] w-[clamp(3rem,7vw,6.5rem)] text-cyan-500 drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]"
                />
                AI
              </span>
            </span>
          </h1>

          <p className="pointer-events-auto mt-8 max-w-2xl text-base leading-relaxed font-medium text-balance text-gray-500 lg:text-lg dark:text-gray-400">
            Create tailored resumes, matching cover letters, and a live web portfolio from one
            profile. Free to build, free to export, and your data never leaves your browser.
          </p>

          <HeroActionButtons />
          <HeroFeatureCards />
        </div>
      </div>
    </div>
  );
};

export default HeroHeader;
