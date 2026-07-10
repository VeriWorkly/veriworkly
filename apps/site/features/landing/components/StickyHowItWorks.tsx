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
    description:
      "Connect your GitHub or LinkedIn profile, or upload your old resume PDF. VeriWorkly instantly extracts and structures your career history into a Master Profile.",
    icon: Database,
  },
  {
    num: "02",
    title: "AI Contextual Tailoring",
    description:
      "Paste a job description. The intelligence layer instantly analyzes the requirements and dynamically rewrites your resume bullets and cover letter to match perfectly.",
    icon: Zap,
  },
  {
    num: "03",
    title: "Export or Publish",
    description:
      "Download beautifully formatted, ATS-optimized PDFs, or click publish to deploy your entire profile as a responsive web portfolio to a custom subdomain.",
    icon: Code,
  },
];

export default function StickyHowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useGSAP(
    () => {
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
    },
    { scope: containerRef },
  );

  return (
    <section
      ref={containerRef}
      className="bg-background relative border-t border-zinc-200 dark:border-zinc-800"
    >
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <div className="relative grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-24">
          {/* Left Side: Scrolling Steps */}
          <div className="flex flex-col pt-24 pb-24 lg:pt-48 lg:pb-48">
            <div className="mb-24">
              <h2 className="font-sans text-4xl font-medium tracking-tighter text-balance text-zinc-950 md:text-5xl lg:text-6xl dark:text-white">
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
                    className={`step-content relative transition-opacity duration-500 ${isActive ? "opacity-100" : "opacity-40"}`}
                  >
                    <div className="mb-6 flex items-center gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-500 ${isActive ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-900"}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="font-mono text-sm tracking-widest text-zinc-500 uppercase">
                        Step {step.num}
                      </span>
                    </div>
                    <h3 className="mb-4 text-3xl font-medium tracking-tight text-zinc-950 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="max-w-md text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Sticky UI Mockup */}
          <div className="perspective-1000 sticky top-0 hidden h-[100vh] items-center justify-center py-24 lg:flex">
            {/* The Browser Window Mockup */}
            <div
              className="relative flex aspect-square max-h-[70vh] w-full flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-50 shadow-2xl transition-transform duration-700 ease-out xl:aspect-video dark:border-zinc-800 dark:bg-[#0a0a0a]"
              style={{
                transform: `rotateY(${activeIndex === 1 ? "-4deg" : activeIndex === 2 ? "2deg" : "0deg"}) scale(${activeIndex === 1 ? 1.02 : 1})`,
              }}
            >
              {/* Browser Header */}
              <div className="flex h-12 items-center gap-2 border-b border-zinc-200 bg-white/50 px-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/50">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <div className="h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <div className="h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                </div>
              </div>

              {/* Browser Content Area */}
              <div className="relative flex-1 overflow-hidden p-6">
                {/* State 0: Import Data */}
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center p-8 transition-all duration-700 ${activeIndex === 0 ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-8 scale-95 opacity-0"}`}
                >
                  <div className="w-full max-w-sm rounded-xl border-2 border-dashed border-zinc-300 bg-white p-8 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                    <Database className="mx-auto mb-4 h-10 w-10 text-zinc-400" />
                    <h4 className="mb-2 font-medium text-zinc-950 dark:text-white">
                      Import Master Profile
                    </h4>
                    <p className="mb-6 text-xs text-zinc-500">
                      Connect LinkedIn or upload Resume PDF
                    </p>
                    <div className="flex h-10 w-full items-center justify-center rounded-lg bg-zinc-950 dark:bg-white">
                      <div className="h-2 w-24 rounded-full bg-white/20 dark:bg-black/20" />
                    </div>
                  </div>
                </div>

                {/* State 1: AI Tailoring */}
                <div
                  className={`absolute inset-0 flex p-8 transition-all duration-700 ${activeIndex === 1 ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-8 scale-95 opacity-0"}`}
                >
                  {/* Left: Job Description */}
                  <div className="w-1/2 space-y-4 border-r border-zinc-200 pr-4 dark:border-zinc-800">
                    <div className="mb-6 h-6 w-full rounded-md bg-zinc-200 dark:bg-zinc-800" />
                    <div className="space-y-2">
                      <div className="h-3 w-full rounded-sm bg-zinc-100 dark:bg-zinc-800/50" />
                      <div className="h-3 w-5/6 rounded-sm bg-zinc-100 dark:bg-zinc-800/50" />
                      <div className="h-3 w-4/5 rounded-sm bg-zinc-100 dark:bg-zinc-800/50" />
                    </div>
                  </div>
                  {/* Right: AI Output */}
                  <div className="w-1/2 space-y-6 pl-6">
                    <div className="flex w-fit items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 font-mono text-xs font-medium text-green-600 dark:bg-green-950/30 dark:text-green-500">
                      <Zap className="h-3.5 w-3.5" /> AI Tailoring Applied
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2 rounded-lg border border-green-200 bg-green-50/50 p-3 dark:border-green-900 dark:bg-green-900/10">
                        <div className="h-2.5 w-3/4 rounded-sm bg-green-600/20 dark:bg-green-500/20" />
                        <div className="h-2.5 w-1/2 rounded-sm bg-green-600/20 dark:bg-green-500/20" />
                      </div>
                      <div className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                        <div className="h-2 w-full rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-2 w-2/3 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* State 2: Export / Publish */}
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center p-8 transition-all duration-700 ${activeIndex === 2 ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-8 scale-95 opacity-0"}`}
                >
                  <div className="flex w-full max-w-md gap-6">
                    {/* PDF Export */}
                    <div className="flex flex-1 flex-col items-center rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                      <FileText className="mb-4 h-12 w-12 text-blue-500" />
                      <h4 className="mb-1 text-sm font-medium text-zinc-950 dark:text-white">
                        ATS Resume PDF
                      </h4>
                      <p className="mb-4 text-[10px] text-zinc-500">Optimized for scanners</p>
                      <div className="flex h-8 w-full items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700">
                        <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                          Download
                        </span>
                      </div>
                    </div>
                    {/* Web Publish */}
                    <div className="flex flex-1 flex-col items-center rounded-xl border-2 border-zinc-950 bg-zinc-950 p-6 text-center shadow-xl dark:border-white dark:bg-white">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 dark:bg-zinc-200">
                        <Code className="h-6 w-6 text-white dark:text-zinc-950" />
                      </div>
                      <h4 className="mb-1 text-sm font-medium text-white dark:text-zinc-950">
                        Web Portfolio
                      </h4>
                      <p className="mb-4 text-[10px] text-zinc-400 dark:text-zinc-600">
                        alex.veriworkly.me
                      </p>
                      <div className="flex h-8 w-full items-center justify-center rounded-lg bg-white dark:bg-zinc-950">
                        <span className="text-[10px] font-medium text-zinc-950 dark:text-white">
                          Publish Live
                        </span>
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
