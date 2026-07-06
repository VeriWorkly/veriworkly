"use client";

import { useState, useEffect } from "react";
import { FileText, Globe, Check, Lock, ShieldCheck, Link2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface Slide {
  icon: React.ReactNode;
  title: string;
  description: string;
  mockup: React.ReactNode;
}

export const ShowcaseCards = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const slides: Slide[] = [
    {
      icon: <FileText className="h-5 w-5" />,
      title: "Matched Resumes & Cover Letters",
      description:
        "Design matching ATS-ready resumes and cover letters side by side. Ensure your job applications look uniform.",
      mockup: (
        <div className="flex justify-center gap-3 p-4 select-none">
          <div className="border-border/40 w-28 rounded-lg border bg-white p-2.5 shadow-sm transition-transform duration-300 hover:scale-105 dark:bg-slate-900">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-7 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="bg-accent/80 h-1.5 w-1.5 animate-pulse rounded-full" />
            </div>

            <div className="mt-2 space-y-1.5">
              <div className="h-1 w-full rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-1 w-5/6 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-1 w-4/5 rounded bg-slate-100 dark:bg-slate-800" />
            </div>

            <div className="mt-3 flex gap-1">
              <div className="h-1.5 w-4 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-1.5 w-5 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-1.5 w-3 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>

          <div className="border-border/40 w-28 rounded-lg border bg-white p-2.5 shadow-sm transition-transform duration-300 hover:scale-105 dark:bg-slate-900">
            <div className="h-2 w-6 rounded bg-slate-200 dark:bg-slate-700" />

            <div className="mt-2 space-y-1">
              <div className="h-1 w-full rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-1 w-full rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-1 w-full rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-1 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
            </div>

            <div className="mt-3.5 space-y-1">
              <div className="h-1 w-11/12 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-1 w-5/6 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      ),
    },

    {
      icon: <Globe className="h-5 w-5" />,
      title: "Personal Subdomain Portfolio",
      description:
        "Convert your resume into a personal portfolio website instantly. Publish to a public subdomain with one click.",
      mockup: (
        <div className="p-3 select-none">
          <div className="border-border/50 rounded-xl border bg-white/30 p-2 dark:bg-slate-900/30">
            <div className="border-border/30 flex items-center gap-2 rounded-lg border bg-white px-2 py-1 dark:bg-slate-900">
              <div className="flex gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                <div className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
              </div>

              <div className="text-muted flex flex-1 items-center justify-center gap-1 rounded bg-slate-50 px-2 py-0.5 text-[9px] font-medium dark:bg-slate-950">
                <Lock className="h-2.5 w-2.5 text-emerald-500" />
                <span>yourname.veriworkly.com</span>
              </div>
            </div>

            <div className="border-border/50 mt-2 rounded-lg border border-dashed bg-white/50 p-2.5 text-center dark:bg-slate-900/50">
              <div className="mx-auto h-7 w-7 rounded-full bg-linear-to-tr from-blue-500 to-indigo-500" />
              <div className="mx-auto mt-2 h-1.5 w-20 rounded bg-slate-300 dark:bg-slate-700" />
              <div className="mx-auto mt-1.5 h-1 w-24 rounded bg-slate-200 dark:bg-slate-800" />

              <div className="mx-auto mt-2 flex items-center justify-center gap-1.5">
                <div className="bg-accent/15 border-accent/20 text-accent rounded-md border px-1.5 py-0.5 text-[8px] font-semibold">
                  Developer
                </div>

                <div className="border-border/60 rounded-md border bg-slate-100 px-1.5 py-0.5 text-[8px] font-semibold dark:bg-slate-800">
                  Design
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: "Local-First with Cloud Control",
      description:
        "Your resume data is stored locally. Sign in to enable secure database synchronization, password protection, and custom sharing controls.",
      mockup: (
        <div className="space-y-2 p-4 select-none">
          <div className="border-border/20 flex items-center justify-between rounded-lg border bg-white px-2.5 py-2 text-[10px] shadow-sm dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-foreground font-medium">Local browser storage</span>
            </div>

            <span className="text-muted-foreground font-mono">Active</span>
          </div>

          <div className="border-border/20 flex items-center justify-between rounded-lg border bg-white px-2.5 py-2 text-[10px] shadow-sm dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Link2 className="text-accent h-3.5 w-3.5" />
              <span className="text-foreground font-medium">Password protected links</span>
            </div>

            <div className="bg-accent flex h-4 w-7 items-center justify-end rounded-full p-0.5">
              <div className="h-3 w-3 rounded-full bg-white shadow-sm" />
            </div>
          </div>
        </div>
      ),
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5500);

    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="flex h-[250px] flex-col justify-between">
      <div className="relative flex-1 overflow-hidden">
        {slides.map((slide, index) => {
          const isActive = index === activeIndex;

          return (
            <div
              key={slide.title}
              aria-hidden={!isActive}
              className={cn(
                "absolute inset-0 flex flex-col justify-between transition-all duration-700 ease-in-out",
                isActive
                  ? "pointer-events-auto translate-x-0 opacity-100"
                  : "pointer-events-none translate-x-8 opacity-0",
              )}
            >
              <div className="flex gap-4">
                <div className="bg-accent/10 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  {slide.icon}
                </div>

                <div className="flex-1 space-y-1">
                  <h3 className="text-foreground text-sm font-semibold tracking-tight">
                    {slide.title}
                  </h3>

                  <p className="text-muted max-w-sm text-xs leading-relaxed">{slide.description}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-neutral-900/5 dark:bg-black/25">
                <div className="w-full max-w-[280px]">{slide.mockup}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-center gap-1.5">
        {slides.map((_, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "focus-visible:ring-accent/40 h-1.5 cursor-pointer rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none",
                isActive ? "bg-accent w-6" : "bg-border/60 hover:bg-border w-1.5",
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
};
