"use client";

import { useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Sparkles, FileText, CheckCircle2, ChevronRight, Share2, Compass } from "lucide-react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function HeroCinematic() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);

  // Parallax layers
  const layerResumeRef = useRef<HTMLDivElement>(null);
  const layerLetterRef = useRef<HTMLDivElement>(null);
  const layerPortfolioRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // 1. Initial State
      gsap.set(layerPortfolioRef.current, { rotation: -6, x: -40, y: 50 });
      gsap.set(layerLetterRef.current, { rotation: 8, x: 30, y: -30 });
      gsap.set(layerResumeRef.current, { rotation: -2, x: 0, y: 0 });

      const tl = gsap.timeline();

      // Animate text entrance
      tl.from([titleRef.current, descRef.current], {
        opacity: 0,
        y: 30,
        duration: 1,
        stagger: 0.2,
        ease: "power3.out",
      });

      // Float UI components in
      tl.from(
        [layerResumeRef.current, layerLetterRef.current, layerPortfolioRef.current],
        {
          opacity: 0,
          scale: 0.9,
          y: "+=80",
          duration: 1.2,
          stagger: 0.15,
          ease: "elastic.out(1, 0.75)",
        },
        "-=0.8",
      );

      // 2. Mouse Parallax (Desktop)
      const isMobile = window.matchMedia("(max-width: 1024px)").matches;
      if (!isMobile) {
        const quickXResume = gsap.quickTo(layerResumeRef.current, "x", {
          duration: 0.8,
          ease: "power3.out",
        });
        const quickYResume = gsap.quickTo(layerResumeRef.current, "y", {
          duration: 0.8,
          ease: "power3.out",
        });
        const quickXLetter = gsap.quickTo(layerLetterRef.current, "x", {
          duration: 1.2,
          ease: "power3.out",
        });
        const quickYLetter = gsap.quickTo(layerLetterRef.current, "y", {
          duration: 1.2,
          ease: "power3.out",
        });
        const quickXPortfolio = gsap.quickTo(layerPortfolioRef.current, "x", {
          duration: 0.6,
          ease: "power3.out",
        });
        const quickYPortfolio = gsap.quickTo(layerPortfolioRef.current, "y", {
          duration: 0.6,
          ease: "power3.out",
        });

        const handleMouseMove = (e: MouseEvent) => {
          if (!containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const mouseX = (e.clientX - rect.left) / rect.width - 0.5;
          const mouseY = (e.clientY - rect.top) / rect.height - 0.5;

          quickXResume(mouseX * 40);
          quickYResume(mouseY * 40);
          quickXLetter(mouseX * -30 + 30);
          quickYLetter(mouseY * -30 - 30);
          quickXPortfolio(mouseX * 60 - 40);
          quickYPortfolio(mouseY * 60 + 50);
        };

        containerRef.current?.addEventListener("mousemove", handleMouseMove);
        return () => containerRef.current?.removeEventListener("mousemove", handleMouseMove);
      }
    },
    { scope: containerRef },
  );

  return (
    <section
      ref={containerRef}
      className="bg-background relative mx-auto flex min-h-[95dvh] max-w-[1400px] items-center justify-center overflow-hidden px-4 pt-24 md:px-8"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100 via-transparent to-transparent opacity-60 dark:from-zinc-900" />

      <div className="relative z-10 grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
        {/* Left Side Content */}
        <div className="flex max-w-2xl flex-col justify-center space-y-8 pt-10 text-left lg:pt-0">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 font-mono text-xs tracking-widest text-zinc-600 uppercase shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>The AI Career Workspace</span>
          </div>

          <h1
            ref={titleRef}
            className="font-sans text-5xl font-medium tracking-tighter text-balance text-zinc-950 sm:text-6xl md:text-7xl dark:text-white"
            style={{ lineHeight: 1.05 }}
          >
            Build perfect resumes & portfolios instantly.
          </h1>

          <p
            ref={descRef}
            className="text-lg leading-relaxed text-balance text-zinc-600 md:text-xl dark:text-zinc-400"
          >
            A privacy-first intelligence layer. Sync documents dynamically from your Master Profile,
            custom-tailor sections instantly, and publish gorgeous portfolios.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link
              href="/studio"
              className="group relative flex h-14 items-center justify-center overflow-hidden rounded-full bg-zinc-950 px-8 text-base font-medium text-white shadow-xl shadow-zinc-950/20 transition-transform hover:scale-[1.02] active:scale-[0.98] dark:bg-white dark:text-zinc-950 dark:shadow-white/10"
            >
              Start Building Free
              <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="https://docs.veriworkly.com"
              className="flex h-14 items-center justify-center rounded-full border border-zinc-200 bg-transparent px-8 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-800 dark:text-white dark:hover:bg-zinc-900"
            >
              Read Docs
            </Link>
          </div>
        </div>

        {/* Right Side Product UI Showcase */}
        <div className="perspective-1000 relative z-20 flex h-[500px] w-full items-center justify-center sm:h-[600px] lg:justify-end">
          {/* Portfolio Mock (Deepest) */}
          <div
            ref={layerPortfolioRef}
            className="absolute right-0 bottom-12 aspect-[4/3] w-[320px] overflow-hidden rounded-2xl border border-zinc-200/50 bg-zinc-50 p-4 shadow-2xl select-none dark:border-zinc-800/50 dark:bg-zinc-950"
          >
            <div className="mb-4 flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <span className="h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <span className="h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              </div>
              <span className="flex items-center gap-1.5 rounded-full border border-zinc-100 bg-white px-3 py-1 font-mono text-[10px] text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <Compass className="h-3 w-3 text-zinc-950 dark:text-white" />
                alex.veriworkly.me
              </span>
              <Share2 className="h-4 w-4 text-zinc-400" />
            </div>

            {/* Portfolio Content */}
            <div className="flex gap-4">
              <div className="h-16 w-16 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="w-full space-y-3">
                <div className="h-4 w-3/4 rounded-sm bg-zinc-300 dark:bg-zinc-700" />
                <div className="h-3 w-1/2 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                <div className="flex gap-2 pt-2">
                  <div className="h-8 flex-1 rounded border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900" />
                  <div className="h-8 flex-1 rounded border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900" />
                </div>
              </div>
            </div>
          </div>

          {/* Cover Letter Mock (Mid) */}
          <div
            ref={layerLetterRef}
            className="absolute top-12 left-0 aspect-[1/1.3] w-[260px] rounded-2xl border border-zinc-200/50 bg-zinc-100 p-6 shadow-xl select-none dark:border-zinc-800/50 dark:bg-zinc-900"
          >
            <div className="mb-4 flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-zinc-950 dark:text-white" />
                <span className="text-[11px] font-bold tracking-wide text-zinc-950 uppercase dark:text-white">
                  Cover Letter
                </span>
              </div>
              <span className="rounded-full bg-zinc-950 px-2 py-0.5 text-[9px] font-medium text-white dark:bg-white dark:text-zinc-950">
                Synced
              </span>
            </div>
            <div className="space-y-3">
              <div className="h-3 w-1/3 rounded-sm bg-zinc-300 dark:bg-zinc-700" />
              <div className="h-3 w-1/4 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
              <div className="space-y-2 pt-4">
                <div className="h-2 w-full rounded-sm bg-zinc-300 dark:bg-zinc-700" />
                <div className="h-2 w-[95%] rounded-sm bg-zinc-300 dark:bg-zinc-700" />
                <div className="h-2 w-[90%] rounded-sm bg-zinc-300 dark:bg-zinc-700" />
                <div className="h-2 w-full rounded-sm bg-zinc-300 dark:bg-zinc-700" />
                <div className="h-2 w-3/4 rounded-sm bg-zinc-300 dark:bg-zinc-700" />
              </div>
              <div className="space-y-2 pt-4">
                <div className="h-2 w-full rounded-sm bg-zinc-300 dark:bg-zinc-700" />
                <div className="h-2 w-[85%] rounded-sm bg-zinc-300 dark:bg-zinc-700" />
                <div className="h-2 w-4/5 rounded-sm bg-zinc-300 dark:bg-zinc-700" />
              </div>
            </div>
          </div>

          {/* Resume Mock (Top) */}
          <div
            ref={layerResumeRef}
            className="absolute top-20 left-8 z-10 aspect-[1/1.3] w-[300px] rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl shadow-black/10 select-none dark:border-zinc-800 dark:bg-[#0a0a0a] dark:shadow-black/40"
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                AI Tailored Resume
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-600 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                ATS: 98%
              </span>
            </div>

            <div className="space-y-5">
              <div className="border-b border-zinc-100 pb-4 text-center dark:border-zinc-900">
                <h3 className="font-serif text-lg font-medium text-zinc-950 italic dark:text-white">
                  Alex Developer
                </h3>
                <p className="mt-1 text-[10px] text-zinc-500">San Francisco, CA • alex@dev.io</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold tracking-widest text-zinc-950 uppercase dark:text-white">
                  Experience
                </h4>
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-medium text-zinc-950 dark:text-white">
                      Senior Software Engineer
                    </span>
                    <span className="font-mono text-[9px] text-zinc-500">2024 - Present</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-1 shrink-0 rounded-full bg-zinc-400" />
                      <div className="h-1.5 w-full rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-1 shrink-0 rounded-full bg-zinc-400" />
                      <div className="h-1.5 w-11/12 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-1 shrink-0 rounded-full bg-zinc-400" />
                      <div className="h-1.5 w-5/6 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-[10px] font-bold tracking-widest text-zinc-950 uppercase dark:text-white">
                  Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[9px] text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white">
                    React
                  </span>
                  <span className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[9px] text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white">
                    TypeScript
                  </span>
                  <span className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[9px] text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white">
                    Next.js
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
