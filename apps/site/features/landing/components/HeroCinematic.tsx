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

  useGSAP(() => {
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
      ease: "power3.out"
    });

    // Float UI components in
    tl.from([layerResumeRef.current, layerLetterRef.current, layerPortfolioRef.current], {
      opacity: 0,
      scale: 0.9,
      y: "+=80",
      duration: 1.2,
      stagger: 0.15,
      ease: "elastic.out(1, 0.75)"
    }, "-=0.8");

    // 2. Mouse Parallax (Desktop)
    const isMobile = window.matchMedia("(max-width: 1024px)").matches;
    if (!isMobile) {
      const quickXResume = gsap.quickTo(layerResumeRef.current, "x", { duration: 0.8, ease: "power3.out" });
      const quickYResume = gsap.quickTo(layerResumeRef.current, "y", { duration: 0.8, ease: "power3.out" });
      const quickXLetter = gsap.quickTo(layerLetterRef.current, "x", { duration: 1.2, ease: "power3.out" });
      const quickYLetter = gsap.quickTo(layerLetterRef.current, "y", { duration: 1.2, ease: "power3.out" });
      const quickXPortfolio = gsap.quickTo(layerPortfolioRef.current, "x", { duration: 0.6, ease: "power3.out" });
      const quickYPortfolio = gsap.quickTo(layerPortfolioRef.current, "y", { duration: 0.6, ease: "power3.out" });

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
  }, { scope: containerRef });

  return (
    <section 
      ref={containerRef}
      className="relative flex min-h-[95dvh] items-center justify-center overflow-hidden pt-24 px-4 md:px-8 max-w-[1400px] mx-auto bg-background"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100 via-transparent to-transparent opacity-60 dark:from-zinc-900" />
      
      <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-8 items-center">
        
        {/* Left Side Content */}
        <div className="flex flex-col justify-center space-y-8 text-left max-w-2xl pt-10 lg:pt-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 bg-white shadow-sm text-xs font-mono uppercase tracking-widest text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The AI Career Workspace</span>
          </div>

          <h1 
            ref={titleRef}
            className="text-balance font-sans text-5xl font-medium tracking-tighter text-zinc-950 sm:text-6xl md:text-7xl dark:text-white"
            style={{ lineHeight: 1.05 }}
          >
            Build perfect resumes & portfolios instantly.
          </h1>

          <p 
            ref={descRef}
            className="text-balance text-lg md:text-xl leading-relaxed text-zinc-600 dark:text-zinc-400"
          >
            A privacy-first intelligence layer. Sync documents dynamically from your Master Profile, custom-tailor sections instantly, and publish gorgeous portfolios.
          </p>

          <div className="flex flex-wrap gap-4 items-center pt-4">
            <Link 
              href="/studio"
              className="group relative flex h-14 items-center justify-center overflow-hidden rounded-full bg-zinc-950 px-8 text-base font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98] dark:bg-white dark:text-zinc-950 shadow-xl shadow-zinc-950/20 dark:shadow-white/10"
            >
              Start Building Free
              <ChevronRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
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
        <div className="relative h-[500px] sm:h-[600px] w-full flex items-center justify-center lg:justify-end z-20 perspective-1000">
          
          {/* Portfolio Mock (Deepest) */}
          <div 
            ref={layerPortfolioRef}
            className="absolute right-0 bottom-12 w-[320px] aspect-[4/3] bg-zinc-50 dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50 p-4 select-none overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-4">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <span className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <span className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              </div>
              <span className="text-[10px] text-zinc-500 bg-white dark:bg-zinc-900 px-3 py-1 rounded-full font-mono flex items-center gap-1.5 shadow-sm border border-zinc-100 dark:border-zinc-800">
                <Compass className="w-3 h-3 text-zinc-950 dark:text-white" />
                alex.veriworkly.me
              </span>
              <Share2 className="w-4 h-4 text-zinc-400" />
            </div>
            
            {/* Portfolio Content */}
            <div className="flex gap-4">
              <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
              <div className="space-y-3 w-full">
                <div className="h-4 bg-zinc-300 dark:bg-zinc-700 rounded-sm w-3/4" />
                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-sm w-1/2" />
                <div className="pt-2 flex gap-2">
                  <div className="h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded flex-1 shadow-sm" />
                  <div className="h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded flex-1 shadow-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Cover Letter Mock (Mid) */}
          <div 
            ref={layerLetterRef}
            className="absolute left-0 top-12 w-[260px] aspect-[1/1.3] bg-zinc-100 dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200/50 dark:border-zinc-800/50 p-6 select-none"
          >
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-950 dark:text-white" />
                <span className="text-[11px] font-bold text-zinc-950 dark:text-white tracking-wide uppercase">Cover Letter</span>
              </div>
              <span className="text-[9px] bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 px-2 py-0.5 rounded-full font-medium">Synced</span>
            </div>
            <div className="space-y-3">
              <div className="h-3 bg-zinc-300 dark:bg-zinc-700 rounded-sm w-1/3" />
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-sm w-1/4" />
              <div className="pt-4 space-y-2">
                <div className="h-2 bg-zinc-300 dark:bg-zinc-700 rounded-sm w-full" />
                <div className="h-2 bg-zinc-300 dark:bg-zinc-700 rounded-sm w-[95%]" />
                <div className="h-2 bg-zinc-300 dark:bg-zinc-700 rounded-sm w-[90%]" />
                <div className="h-2 bg-zinc-300 dark:bg-zinc-700 rounded-sm w-full" />
                <div className="h-2 bg-zinc-300 dark:bg-zinc-700 rounded-sm w-3/4" />
              </div>
              <div className="pt-4 space-y-2">
                <div className="h-2 bg-zinc-300 dark:bg-zinc-700 rounded-sm w-full" />
                <div className="h-2 bg-zinc-300 dark:bg-zinc-700 rounded-sm w-[85%]" />
                <div className="h-2 bg-zinc-300 dark:bg-zinc-700 rounded-sm w-4/5" />
              </div>
            </div>
          </div>

          {/* Resume Mock (Top) */}
          <div 
            ref={layerResumeRef}
            className="absolute left-8 top-20 w-[300px] aspect-[1/1.3] bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 border border-zinc-200 dark:border-zinc-800 p-6 select-none z-10"
          >
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">AI Tailored Resume</span>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900/50">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ATS: 98%
              </span>
            </div>
            
            <div className="space-y-5">
              <div className="text-center pb-4 border-b border-zinc-100 dark:border-zinc-900">
                <h3 className="text-lg font-serif italic font-medium text-zinc-950 dark:text-white">Alex Developer</h3>
                <p className="text-[10px] text-zinc-500 mt-1">San Francisco, CA • alex@dev.io</p>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-zinc-950 dark:text-white uppercase tracking-widest">Experience</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-medium text-zinc-950 dark:text-white">Senior Software Engineer</span>
                    <span className="text-[9px] text-zinc-500 font-mono">2024 - Present</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex gap-2 items-center"><div className="w-1 h-1 rounded-full bg-zinc-400 shrink-0"/><div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-sm w-full" /></div>
                    <div className="flex gap-2 items-center"><div className="w-1 h-1 rounded-full bg-zinc-400 shrink-0"/><div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-sm w-11/12" /></div>
                    <div className="flex gap-2 items-center"><div className="w-1 h-1 rounded-full bg-zinc-400 shrink-0"/><div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-sm w-5/6" /></div>
                  </div>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <h4 className="text-[10px] font-bold text-zinc-950 dark:text-white uppercase tracking-widest">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[9px] bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 font-mono">React</span>
                  <span className="text-[9px] bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 font-mono">TypeScript</span>
                  <span className="text-[9px] bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 font-mono">Next.js</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
