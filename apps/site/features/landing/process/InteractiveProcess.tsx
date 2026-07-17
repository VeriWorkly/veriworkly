"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { Database, Zap, FileText, Check } from "lucide-react";

const Step1Visual = () => {
  return (
    <div className="dark:border-zinc-800 flex flex-col gap-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-lg backdrop-blur-md dark:bg-zinc-950/80">
      <div className="flex items-center gap-3">
        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
        <span className="font-mono text-[10px] tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
          Extracting Resume PDF...
        </span>
      </div>
      <div className="space-y-3 font-mono text-[11px]">
        <div className="border-zinc-150 flex justify-between border-b pb-2 dark:border-zinc-900">
          <span className="text-zinc-400">Name:</span>
          <span className="font-medium text-zinc-800 dark:text-zinc-200">Alex Rivera</span>
        </div>
        <div className="border-zinc-150 flex justify-between border-b pb-2 dark:border-zinc-900">
          <span className="text-zinc-400">Target:</span>
          <span className="font-medium text-zinc-800 dark:text-zinc-200">React Architect</span>
        </div>
        <div className="flex justify-between pb-1">
          <span className="text-zinc-400">Parsing status:</span>
          <span className="animate-pulse font-semibold text-emerald-500">Running OCR...</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="relative h-1.5 overflow-hidden rounded bg-blue-500/20">
          <motion.div
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 h-full w-1/3 bg-blue-500 bg-linear-to-r from-transparent via-white/40 to-transparent"
          />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-900">
        <span className="font-mono text-[11px] tracking-tight text-zinc-400 dark:text-zinc-500">
          Structured Profile
        </span>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          Parsed
        </span>
      </div>
    </div>
  );
};

const Step2Visual = () => {
  return (
    <div className="dark:border-zinc-800 flex flex-col gap-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-lg backdrop-blur-md dark:bg-zinc-950/80">
      <div className="border-zinc-150 flex items-center justify-between border-b pb-3 dark:border-zinc-900">
        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
          Role: React Architect
        </span>
        <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
          Match score: 98%
        </span>
      </div>
      <div className="space-y-3 text-xs text-zinc-500">
        <p className="leading-relaxed line-through opacity-30 dark:text-zinc-400">
          Managed front-end tasks and built interfaces.
        </p>
        <motion.div
          initial={{ opacity: 0, y: 10, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="relative overflow-hidden rounded-xl border border-blue-500/10 bg-blue-500/5 p-3 font-medium text-zinc-900 dark:text-white"
        >
          <div className="absolute top-0 left-0 h-full w-1 bg-blue-500" />
          <span className="text-blue-600 dark:text-blue-400">AI Optimized: </span>
          Led development of scalable React micro-frontends, accelerating platform load speed by
          35%.
        </motion.div>
      </div>
    </div>
  );
};

const Step3Visual = () => {
  return (
    <div className="dark:border-zinc-800 flex flex-col gap-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-lg backdrop-blur-md dark:bg-zinc-950/80">
      <div className="flex gap-4">
        {/* Document export card */}
        <div className="flex flex-1 flex-col items-center justify-center border-r border-zinc-100 pr-4 text-center dark:border-zinc-900">
          <div className="relative mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <FileText className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            ATS PDF
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Download Ready</span>
        </div>

        {/* Web Publish card */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="mb-3 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-white shadow-md transition-transform dark:bg-white dark:text-zinc-950"
          >
            W
          </motion.div>
          <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            Live Portfolio
          </span>
          <span className="cursor-pointer text-[10px] font-semibold text-blue-500 hover:underline">
            alex.veriworkly.me
          </span>
        </div>
      </div>
    </div>
  );
};

const STEP_ACCENTS = ["#3b82f6", "#06b6d4", "#10b981"];

export default function InteractiveProcess() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(0);

  // Track scrolling within this section. The ref is attached to an element
  // that is always present in the DOM (mobile vs. desktop layouts are toggled
  // purely with CSS breakpoints below), so the target is hydrated on first
  // paint and scroll tracking never silently stalls.
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start start", "end end"],
  });

  // Smooth scrollProgress trigger
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  // Map progress to active step (0, 1, 2) with 10% dead-zones to prevent boundary flickering
  const activeStep = useTransform(
    scrollYProgress,
    [0, 0.28, 0.38, 0.61, 0.71, 1],
    [0, 0, 1, 1, 2, 2],
  );

  // Listen to step transformations
  useEffect(() => {
    return activeStep.on("change", (latest) => {
      const stepIndex = Math.min(Math.max(Math.round(latest), 0), 2);
      setCurrentStep(stepIndex);
    });
  }, [activeStep]);

  const steps = [
    {
      id: "01",
      title: "Structure Your Career Data",
      description:
        "Upload your LinkedIn profile PDF or old resume. VeriWorkly extracts your full professional background and saves it locally in an editable Master Profile structure.",
      icon: Database,
      visual: <Step1Visual />,
    },
    {
      id: "02",
      title: "Contextual AI Tailoring",
      description:
        "Paste any target job description. The AI scans your Master Profile history and adjusts summaries and experience bullet points to precisely match job requirements.",
      icon: Zap,
      visual: <Step2Visual />,
    },
    {
      id: "03",
      title: "One-Click PDF & Publish",
      description:
        "Export your customized resumes and cover letters as clean, ATS-compliant PDFs, or publish your portfolio directly to a custom subdomain instantly.",
      icon: FileText,
      visual: <Step3Visual />,
    },
  ];

  // Mobile and desktop layouts are toggled with CSS breakpoints only (no JS
  // branching), so `scrollRef` always has a hydrated target and the section
  // never loses scroll tracking after the initial render.
  return (
    <div ref={scrollRef} className="relative w-full lg:h-[250vh]">
      <div className="w-full bg-zinc-50/30 py-20 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:items-center lg:overflow-hidden lg:py-14 dark:bg-zinc-950/20">
        <div className="mx-auto w-full max-w-350 px-6 md:px-8">
          {/* Mobile: static stacked steps */}
          <div className="lg:hidden">
            <div className="mb-10 flex w-fit items-center gap-2 rounded-full border border-blue-500/10 bg-blue-500/5 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <Zap className="h-3.5 w-3.5" /> Workflow
            </div>
            <h2 className="mb-6 font-sans text-3xl font-semibold tracking-tighter text-zinc-900 dark:text-white">
              The modern way to target roles
            </h2>
            <p className="mb-12 max-w-[50ch] text-base text-zinc-500 dark:text-zinc-400">
              Skip the tedious manual edits. Keep your master record secure, and let the tool
              generate bespoke packages for each job.
            </p>

            <div className="flex flex-col gap-8">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className="flex flex-col gap-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-[#0c0c0c]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      {step.id}
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {step.description}
                  </p>
                  <div className="mt-2 border-t border-zinc-100 pt-6 dark:border-zinc-900">
                    {step.visual}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: scroll-pinned two column layout */}
          <div className="hidden lg:grid lg:grid-cols-12 lg:items-center lg:gap-24">
            {/* Left Column: Title and steps selector */}
            <div className="flex flex-col justify-center lg:col-span-7">
              <div className="mb-5 flex w-fit items-center gap-2 rounded-full border border-blue-500/10 bg-blue-500/5 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                <Zap className="h-3.5 w-3.5" /> Workflow
              </div>
              <h2 className="mb-4 font-sans text-4xl font-semibold tracking-tighter text-balance text-zinc-900 md:text-5xl dark:text-white">
                The modern way to target roles
              </h2>
              <p className="mb-8 max-w-[50ch] text-lg text-zinc-500 dark:text-zinc-400">
                Skip the tedious manual edits. Keep your master record secure, and let the tool
                generate bespoke packages for each job.
              </p>

              {/* Progress Line */}
              <div className="relative flex flex-col gap-3 pl-8">
                {/* Vertical line indicator */}
                <div className="absolute top-0 left-3.5 h-full w-0.5 bg-zinc-200 dark:bg-zinc-800">
                  <motion.div
                    className="h-full w-full origin-top bg-blue-500"
                    style={{ scaleY: progress }}
                  />
                </div>

                {steps.map((step, index) => {
                  const isActive = currentStep === index;
                  return (
                    <motion.div
                      key={step.id}
                      layout
                      transition={{ type: "spring", stiffness: 300, damping: 32 }}
                      className={`group relative flex items-start gap-5 rounded-2xl border px-5 py-4 text-left transition-colors duration-500 ${
                        isActive
                          ? "border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-[#0c0c0c]"
                          : "border-transparent"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-500 ${
                          isActive
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500"
                        }`}
                      >
                        {isActive ? (
                          <Check className="h-4 w-4" strokeWidth={3} />
                        ) : (
                          <span className="font-mono text-xs font-bold">{step.id}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          className={`text-base font-bold transition-colors duration-500 ${
                            isActive
                              ? "text-zinc-900 dark:text-white"
                              : "text-zinc-500 dark:text-zinc-500"
                          }`}
                        >
                          {step.title}
                        </h3>
                        <AnimatePresence initial={false}>
                          {isActive && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                              className="overflow-hidden"
                            >
                              <p className="pt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                                {step.description}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Live Mockup Card */}
            <div className="flex items-center justify-center lg:col-span-5">
              <div className="relative flex aspect-square w-full max-w-md flex-col overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-linear-to-br from-white to-zinc-50 shadow-lg dark:border-zinc-800 dark:from-[#0a0a0a] dark:to-[#050505]">
                {/* Background glow, tied to the active step's accent color */}
                <motion.div
                  className="pointer-events-none absolute inset-0"
                  animate={{ backgroundColor: STEP_ACCENTS[currentStep] }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  style={{
                    maskImage: "radial-gradient(circle at 30% 20%, black 0%, transparent 65%)",
                    WebkitMaskImage:
                      "radial-gradient(circle at 30% 20%, black 0%, transparent 65%)",
                    opacity: 0.16,
                  }}
                />
                {/* Subtle dot-grid texture */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(currentColor_1px,transparent_1px)] bg-size-[18px_18px] opacity-[0.04]" />

                {/* Fake browser chrome */}
                <div className="relative z-10 flex items-center gap-1.5 px-6 pt-5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                  <span className="ml-2.5 truncate font-mono text-[10px] text-zinc-400 dark:text-zinc-600">
                    app.veriworkly.com
                  </span>
                </div>

                <div className="relative z-10 flex flex-1 items-center justify-center p-8 pt-4">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, scale: 0.95, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -15 }}
                      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                      className="w-full"
                    >
                      {steps[currentStep].visual}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Step counter */}
                <div className="relative z-10 flex items-center justify-center gap-1.5 pb-6">
                  {steps.map((step, index) => (
                    <span
                      key={step.id}
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        index === currentStep
                          ? "w-6 bg-blue-500"
                          : "w-1.5 bg-zinc-300 dark:bg-zinc-700"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
