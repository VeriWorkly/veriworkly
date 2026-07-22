"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { Database, Zap, FileText, Check } from "lucide-react";
import Step1Visual from "./Step1Visual";
import Step2Visual from "./Step2Visual";
import Step3Visual from "./Step3Visual";

const STEP_ACCENTS = ["#3b82f6", "#06b6d4", "#10b981"];

const InteractiveProcess = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start start", "end end"],
  });

  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  const activeStep = useTransform(
    scrollYProgress,
    [0, 0.28, 0.38, 0.61, 0.71, 1],
    [0, 0, 1, 1, 2, 2],
  );

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

  return (
    <div ref={scrollRef} className="relative w-full border-y border-zinc-200/40 lg:h-[250vh]">
      <div className="w-full bg-zinc-50/30 py-20 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:items-center lg:overflow-hidden lg:py-14 dark:bg-zinc-950/20">
        <div className="mx-auto w-full max-w-350 px-6 md:px-8">
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
                  className="flex flex-col gap-6 rounded-3xl border border-zinc-200 bg-[#0c0c0c] p-6 shadow-xs dark:border-zinc-800 dark:bg-[#0c0c0c]"
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

          <div className="hidden lg:grid lg:grid-cols-12 lg:items-center lg:gap-24">
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

              <div className="relative flex flex-col gap-3 pl-8">
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

            <div className="flex items-center justify-center lg:col-span-5">
              <div className="relative flex aspect-square w-full max-w-md flex-col overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-linear-to-br from-white to-zinc-50 shadow-lg dark:border-zinc-800 dark:from-[#0a0a0a] dark:to-[#050505]">
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
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(currentColor_1px,transparent_1px)] bg-size-[18px_18px] opacity-[0.04]" />

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
};

export default InteractiveProcess;
