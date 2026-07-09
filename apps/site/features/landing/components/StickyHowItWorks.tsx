"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { FileText, Database, Code, Zap } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const steps = [
  {
    num: "01",
    title: "Connect & Import",
    description: "Connect your GitHub or LinkedIn profile, or upload your old resume PDF. VeriWorkly instantly extracts and structures your career history into a Master Profile.",
    icon: Database,
  },
  {
    num: "02",
    title: "AI Contextual Tailoring",
    description: "Paste a job description. The intelligence layer instantly analyzes the requirements and dynamically rewrites your resume bullets and cover letter to match perfectly.",
    icon: Zap,
  },
  {
    num: "03",
    title: "Export or Publish",
    description: "Download beautifully formatted, ATS-optimized PDFs, or click publish to deploy your entire profile as a responsive web portfolio to a custom subdomain.",
    icon: Code,
  }
];

export default function StickyHowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useGSAP(() => {
    if (!containerRef.current) return;
    
    const stepEls = gsap.utils.toArray<HTMLElement>(".step-content");
    
    stepEls.forEach((step, i) => {
      ScrollTrigger.create({
        trigger: step,
        start: "top center",
        end: "bottom center",
        onEnter: () => setActiveIndex(i),
        onEnterBack: () => setActiveIndex(i),
      });
    });
  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="relative bg-background border-t border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 relative">
          
          {/* Left Side: Scrolling Steps */}
          <div className="pt-24 lg:pt-48 pb-24 lg:pb-48 flex flex-col">
            <div className="mb-24">
              <h2 className="text-balance font-sans text-4xl font-medium tracking-tighter text-zinc-950 md:text-5xl lg:text-6xl dark:text-white">
                How it works
              </h2>
              <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                A seamless workflow from raw data to a perfect application.
              </p>
            </div>

            <div className="space-y-[30vh]">
              {steps.map((step, i) => {
                const Icon = step.icon;
                const isActive = activeIndex === i;
                return (
                  <div 
                    key={i} 
                    className={`step-content relative transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-40'}`}
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-500 ${isActive ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-900'}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-mono tracking-widest text-zinc-500 uppercase">
                        Step {step.num}
                      </span>
                    </div>
                    <h3 className="text-3xl font-medium tracking-tight text-zinc-950 dark:text-white mb-4">
                      {step.title}
                    </h3>
                    <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Sticky UI Mockup */}
          <div className="hidden lg:flex sticky top-0 h-[100vh] items-center justify-center py-24 perspective-1000">
            {/* The Browser Window Mockup */}
            <div className="relative w-full aspect-square xl:aspect-video max-h-[70vh] bg-zinc-50 dark:bg-[#0a0a0a] rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex flex-col transition-transform duration-700 ease-out"
                 style={{ transform: `rotateY(${activeIndex === 1 ? '-4deg' : activeIndex === 2 ? '2deg' : '0deg'}) scale(${activeIndex === 1 ? 1.02 : 1})` }}
            >
              {/* Browser Header */}
              <div className="h-12 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 gap-2 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                </div>
              </div>

              {/* Browser Content Area */}
              <div className="relative flex-1 p-6 overflow-hidden">
                
                {/* State 0: Import Data */}
                <div className={`absolute inset-0 p-8 flex flex-col items-center justify-center transition-all duration-700 ${activeIndex === 0 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95 pointer-events-none'}`}>
                  <div className="w-full max-w-sm border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 text-center bg-white dark:bg-zinc-900 shadow-sm">
                    <Database className="w-10 h-10 text-zinc-400 mx-auto mb-4" />
                    <h4 className="font-medium text-zinc-950 dark:text-white mb-2">Import Master Profile</h4>
                    <p className="text-xs text-zinc-500 mb-6">Connect LinkedIn or upload Resume PDF</p>
                    <div className="h-10 w-full bg-zinc-950 dark:bg-white rounded-lg flex items-center justify-center">
                      <div className="w-24 h-2 bg-white/20 dark:bg-black/20 rounded-full" />
                    </div>
                  </div>
                </div>

                {/* State 1: AI Tailoring */}
                <div className={`absolute inset-0 p-8 flex transition-all duration-700 ${activeIndex === 1 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95 pointer-events-none'}`}>
                  {/* Left: Job Description */}
                  <div className="w-1/2 pr-4 border-r border-zinc-200 dark:border-zinc-800 space-y-4">
                    <div className="w-full h-6 bg-zinc-200 dark:bg-zinc-800 rounded-md mb-6" />
                    <div className="space-y-2">
                      <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-sm" />
                      <div className="w-5/6 h-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-sm" />
                      <div className="w-4/5 h-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-sm" />
                    </div>
                  </div>
                  {/* Right: AI Output */}
                  <div className="w-1/2 pl-6 space-y-6">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-500 text-xs font-medium font-mono bg-green-50 dark:bg-green-950/30 px-3 py-1.5 rounded-full w-fit">
                      <Zap className="w-3.5 h-3.5" /> AI Tailoring Applied
                    </div>
                    <div className="space-y-4">
                      <div className="p-3 border border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-900/10 rounded-lg space-y-2">
                        <div className="w-3/4 h-2.5 bg-green-600/20 dark:bg-green-500/20 rounded-sm" />
                        <div className="w-1/2 h-2.5 bg-green-600/20 dark:bg-green-500/20 rounded-sm" />
                      </div>
                      <div className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2">
                        <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-sm" />
                        <div className="w-2/3 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-sm" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* State 2: Export / Publish */}
                <div className={`absolute inset-0 p-8 flex flex-col items-center justify-center transition-all duration-700 ${activeIndex === 2 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95 pointer-events-none'}`}>
                  <div className="flex gap-6 w-full max-w-md">
                    {/* PDF Export */}
                    <div className="flex-1 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 bg-white dark:bg-zinc-900 shadow-xl text-center flex flex-col items-center">
                      <FileText className="w-12 h-12 text-blue-500 mb-4" />
                      <h4 className="font-medium text-zinc-950 dark:text-white text-sm mb-1">ATS Resume PDF</h4>
                      <p className="text-[10px] text-zinc-500 mb-4">Optimized for scanners</p>
                      <div className="w-full h-8 border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center justify-center">
                        <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">Download</span>
                      </div>
                    </div>
                    {/* Web Publish */}
                    <div className="flex-1 border-2 border-zinc-950 dark:border-white rounded-xl p-6 bg-zinc-950 dark:bg-white shadow-xl text-center flex flex-col items-center">
                      <div className="w-12 h-12 bg-zinc-800 dark:bg-zinc-200 rounded-full mb-4 flex items-center justify-center">
                        <Code className="w-6 h-6 text-white dark:text-zinc-950" />
                      </div>
                      <h4 className="font-medium text-white dark:text-zinc-950 text-sm mb-1">Web Portfolio</h4>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mb-4">alex.veriworkly.me</p>
                      <div className="w-full h-8 bg-white dark:bg-zinc-950 rounded-lg flex items-center justify-center">
                        <span className="text-[10px] font-medium text-zinc-950 dark:text-white">Publish Live</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
