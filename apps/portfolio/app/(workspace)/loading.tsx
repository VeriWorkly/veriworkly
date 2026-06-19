"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  LayoutTemplate,
  BarChart3,
  Settings,
  Loader2,
  Terminal,
  Server,
  BriefcaseBusiness,
  BookOpen,
  FileText,
  CreditCard,
} from "lucide-react";

const steps = [
  { label: "Connecting to workbench server...", icon: Server },
  { label: "Parsing CSS theme variables...", icon: LayoutDashboard },
  { label: "Loading Geist typography system...", icon: LayoutTemplate },
  { label: "Compiling workspace canvas...", icon: BarChart3 },
  { label: "Assembling live template view...", icon: Settings },
];

export default function LoadingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [logMessages, setLogMessages] = useState<string[]>([
    "[SYSTEM] Booting portfolio container...",
  ]);

  useEffect(() => {
    let step = 0;
    const stepInterval = setInterval(() => {
      if (step < steps.length - 1) {
        const next = step + 1;
        setLogMessages((logs) => [
          ...logs,
          `[OK] Completed: ${steps[step].label}`,
          `[SYSTEM] Triggering: ${steps[next].label}`,
        ]);
        setCurrentStep(next);
        step = next;
      } else {
        clearInterval(stepInterval);
      }
    }, 1200);

    return () => clearInterval(stepInterval);
  }, []);

  const StepIcon = steps[currentStep].icon;

  return (
    <div className="bg-paper text-ink min-h-dvh select-none lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* Sidebar Mock */}
      <aside className="border-line bg-panel hidden border-r lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        {/* Logo area */}
        <div className="border-line flex min-h-17 items-center gap-3 border-b px-4">
          <Image src="/veriworkly-logo.png" width={30} height={30} alt="VeriWorkly logo" priority />
          <span>
            <span className="block text-sm font-bold tracking-[-.03em]">Portfolio</span>
            <span className="text-muted block text-[10px] font-bold">by VeriWorkly</span>
          </span>
        </div>

        {/* Navigation group */}
        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto p-3">
          <div>
            <p className="text-muted px-2 text-[10px] font-extrabold tracking-[.12em] uppercase">
              Portfolio
            </p>
            <div className="mt-2 space-y-1">
              {[
                { label: "Overview", icon: LayoutDashboard, active: true },
                { label: "Portfolio editor", icon: LayoutTemplate, active: false },
                { label: "Analytics", icon: BarChart3, active: false },
                { label: "Settings", icon: Settings, active: false },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className={`flex items-center gap-3 rounded-sm px-2.5 py-2 text-xs font-extrabold transition ${
                      item.active ? "bg-accent/10 text-accent" : "text-muted opacity-60"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-muted px-2 text-[10px] font-extrabold tracking-[.12em] uppercase">
              VeriWorkly Products
            </p>
            <div className="mt-2 space-y-1 opacity-55">
              {[
                { label: "Document builder", icon: BriefcaseBusiness },
                { label: "Blog", icon: BookOpen },
                { label: "Docs", icon: FileText },
                { label: "Billing", icon: CreditCard },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="text-muted flex items-center gap-3 rounded-sm px-2.5 py-2 text-xs font-extrabold"
                  >
                    <Icon size={16} />
                    <span className="flex-1">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Theme and Profile Area Mock */}
        <div className="border-line space-y-2 border-t p-3">
          <div className="animate-shimmer bg-line/10 h-8 w-full rounded-lg" />
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="bg-line/25 animate-shimmer size-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <div className="bg-line/20 animate-shimmer h-3 w-3/4 rounded" />
              <div className="bg-line/15 animate-shimmer h-2 w-1/2 rounded" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area Mock */}
      <div className="flex min-w-0 flex-col">
        {/* Header Mock */}
        <header className="border-line bg-panel flex min-h-17 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <Loader2 className="text-accent size-4 animate-spin" />
            <span className="text-muted text-[10px] font-bold tracking-widest uppercase">
              Hydrating Stacks
            </span>
          </div>
          <div className="bg-line/10 animate-shimmer h-8 w-24 rounded-full" />
        </header>

        {/* Content Pane Mock (matching Overview dashboard) */}
        <main className="surface-grid flex-1 px-4 py-8 sm:px-6 sm:py-10 xl:px-10">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Header / Step Indicator */}
            <div className="border-line bg-panel flex flex-col gap-4 rounded-3xl border p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-accent/10 text-accent rounded-xl p-2.5">
                  <StepIcon className="size-5" />
                </div>
                <div>
                  <div className="text-muted text-[10px] font-bold tracking-widest uppercase">
                    Current Sequence
                  </div>
                  <div className="text-ink mt-0.5 text-sm font-bold">
                    {steps[currentStep].label}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:text-right">
                <span className="text-accent font-mono text-xs font-bold">
                  {Math.round(((currentStep + 1) / steps.length) * 100)}%
                </span>
                <div className="bg-line/40 h-1.5 w-24 overflow-hidden rounded-full">
                  <div
                    className="bg-accent h-full transition-all duration-500 ease-out"
                    style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Dashboard Mock Grid */}
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,.55fr)]">
              {/* Status/Form Area */}
              <div className="border-line bg-panel flex min-h-[300px] flex-col justify-between rounded-3xl border p-6 shadow-sm sm:p-8">
                <div className="space-y-4">
                  <div className="animate-shimmer bg-line/30 h-4 w-1/4 rounded" />
                  <div className="animate-shimmer bg-line/35 h-6 w-1/2 rounded" />
                  <div className="space-y-2 pt-2">
                    <div className="animate-shimmer bg-line/15 h-3.5 w-full rounded" />
                    <div className="animate-shimmer bg-line/15 h-3.5 w-5/6 rounded" />
                    <div className="animate-shimmer bg-line/15 h-3.5 w-4/6 rounded" />
                  </div>
                </div>
                {/* Terminal Stream */}
                <div className="border-line/60 bg-paper-2 mt-6 rounded-2xl border p-4">
                  <div className="text-muted flex items-center gap-2 font-mono text-[9px] font-bold">
                    <Terminal className="size-3" />
                    <span>SYSTEM LOG STREAM</span>
                  </div>
                  <div className="text-muted/80 mt-2 max-h-20 space-y-1 overflow-hidden font-mono text-[9px] leading-relaxed">
                    {logMessages.slice(-3).map((log, i) => (
                      <div key={i} className="truncate">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar/Recommendations Skeleton */}
              <div className="border-line bg-panel flex flex-col gap-4 rounded-3xl border p-6 shadow-sm">
                <div className="animate-shimmer bg-line/30 h-4 w-1/2 rounded" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      className="bg-line/5 border-line/45 flex items-center gap-3 rounded-xl border p-3"
                      key={i}
                    >
                      <div className="animate-shimmer bg-line/20 size-8 rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <div className="animate-shimmer bg-line/25 h-3 w-3/4 rounded" />
                        <div className="animate-shimmer bg-line/15 h-2.5 w-1/2 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
