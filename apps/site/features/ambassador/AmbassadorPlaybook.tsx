"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion, motion } from "framer-motion";
import { UserCheck, Award, ClipboardList, Send } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

type PlaybookStep = {
  num: string;
  title: string;
  subtitle: string;
  description: string;
  badgeLabel: string;
  icon: React.ComponentType<{ className?: string }>;
};

/**
 * Describes the flow the server actually implements: apply, human review, decision.
 * An earlier revision claimed an "automated node validator" that "issues campus
 * ambassador badges instantly" and points that score "automatically" - none of
 * which exists. Review is AmbassadorService.reviewApplication, run by an admin
 * against a PENDING row.
 */
const steps: PlaybookStep[] = [
  {
    num: "01",
    title: "Apply",
    subtitle: "Tell us about you and your campus.",
    description:
      "Fill in the application form: your college, graduation year, and a few short answers about why you want in and what you would bring. It takes a few minutes.",
    badgeLabel: "Step 1: Apply",
    icon: UserCheck,
  },
  {
    num: "02",
    title: "Reviewed by a person",
    subtitle: "Read by hand, not scored by a bot.",
    description:
      "Your application is read by a person, so a decision takes time rather than arriving instantly. The apply page shows your status throughout as pending, approved, or not accepted.",
    badgeLabel: "Step 2: Review",
    icon: ClipboardList,
  },
  {
    num: "03",
    title: "Join the founding cohort",
    subtitle: "Help set the rules before they are fixed.",
    description:
      "Approved ambassadors get a direct line to the person building VeriWorkly and a say in how the reward system works. We publish the specifics before anyone is asked to earn anything.",
    badgeLabel: "Step 3: Build",
    icon: Award,
  },
];

const AmbassadorPlaybook = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || !containerRef.current) return;

    const ctx = gsap.context(() => {
      const cardEls = gsap.utils.toArray<HTMLElement>(".playbook-card");
      cardEls.forEach((card, i) => {
        if (i === cardEls.length - 1) return;

        ScrollTrigger.create({
          trigger: card,
          start: "top top",
          endTrigger: cardEls[cardEls.length - 1],
          end: "top top",
          pin: true,
          pinSpacing: false,
          invalidateOnRefresh: true,
        });

        gsap.to(card, {
          scale: 0.96,
          opacity: 0.5,
          filter: "blur(1px)",
          ease: "none",
          scrollTrigger: {
            trigger: cardEls[i + 1],
            start: "top bottom",
            end: "top top",
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, [reduce]);

  return (
    <div
      id="playbook"
      ref={containerRef}
      className="bg-background relative z-25 border-b border-zinc-200/80 dark:border-white/10"
    >
      <div className="playbook-card bg-background relative flex min-h-dvh items-center justify-center px-6">
        <div className="max-w-xl space-y-6 text-center">
          <span className="flex items-center justify-center gap-2 text-[10px] font-black tracking-widest text-indigo-600 uppercase dark:text-indigo-400">
            <ClipboardList className="h-4 w-4" />
            <span>Process</span>
          </span>
          <h2 className="text-5xl leading-[0.85] font-black tracking-tight text-zinc-950 uppercase sm:text-6xl md:text-7xl dark:text-white">
            HOW THE
            <br />
            PROGRAM
            <br />
            WORKS
          </h2>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Scroll down for the three steps, exactly as they run today: you apply, a person reads
            it, and you hear back.
          </p>
          <div className="flex items-center justify-center gap-1.5 pt-2">
            <span className="h-1 w-6 animate-pulse rounded-full bg-zinc-900 dark:bg-white" />
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-800" />
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-800" />
          </div>
        </div>
      </div>

      {steps.map((step, idx) => {
        const Icon = step.icon;
        return (
          <div
            key={idx}
            className="playbook-card bg-background relative flex min-h-dvh items-center justify-center border-t border-zinc-200/80 px-6 md:px-24 dark:border-white/10"
          >
            <div className="grid w-full max-w-5xl grid-cols-1 items-center gap-12 py-16 lg:grid-cols-2 lg:gap-20">
              <div className="space-y-6 text-left">
                <div className="space-y-4">
                  <span className="block font-mono text-6xl leading-none font-black text-zinc-300 select-none dark:text-zinc-800">
                    {step.num}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[9px] font-bold tracking-widest text-zinc-900 uppercase dark:border-white/10 dark:bg-white/5 dark:text-white">
                    <Icon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>{step.badgeLabel}</span>
                  </span>
                  <h3 className="text-3xl leading-[0.95] font-extrabold tracking-tight text-zinc-950 uppercase sm:text-4xl dark:text-white">
                    {step.title}
                  </h3>
                </div>

                <p className="max-w-lg text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {step.description}
                </p>
              </div>

              <div className="relative flex min-h-80 items-center justify-center">
                {idx === 0 && (
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="w-full max-w-90 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-md dark:border-white/10 dark:bg-zinc-900"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-white/10">
                      <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
                        Application
                      </span>
                      <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase dark:text-zinc-500">
                        Illustrative
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <span className="block text-[9px] font-black tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                          Your college
                        </span>
                        <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs font-bold text-zinc-400 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-500">
                          <span>Where are you studying?</span>
                          <Send className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                        </div>
                      </div>

                      <div className="flex items-start gap-3 rounded-xl border border-indigo-500/10 bg-indigo-500/5 p-3.5">
                        <ClipboardList className="mt-0.5 h-4.5 w-4.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                        <div>
                          <span className="block text-[10px] font-black text-zinc-900 uppercase dark:text-white">
                            Sent for review
                          </span>
                          <span className="mt-0.5 block text-[9px] leading-normal text-zinc-500 dark:text-zinc-400">
                            Read by a person, not scored automatically.
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {idx === 1 && (
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="w-full max-w-90 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-md dark:border-white/10 dark:bg-zinc-900"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-white/10">
                      <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
                        Your status
                      </span>
                      <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase dark:text-zinc-500">
                        Illustrative
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                          <span className="text-[10px] font-black tracking-widest text-amber-600 uppercase dark:text-amber-500">
                            Pending review
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                          Your application is in the queue. One person reads every one of these, so
                          give it a little time — you will not be left guessing.
                        </p>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs font-bold dark:border-white/10 dark:bg-zinc-950">
                        <span className="text-zinc-500 dark:text-zinc-400">Decision</span>
                        <span className="text-zinc-900 dark:text-white">By a human</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {idx === 2 && (
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="w-full max-w-90 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-md dark:border-white/10 dark:bg-zinc-900"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-white/10">
                      <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
                        Founding cohort
                      </span>
                      <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase dark:text-zinc-500">
                        Illustrative
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="relative flex min-h-35 flex-col justify-between overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-white dark:border-white/10 dark:bg-black">
                        <div
                          className="absolute top-1/2 left-0 h-3.5 w-1.5 -translate-y-1/2 rounded-r-full border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                          style={{ marginLeft: "-1px" }}
                        />
                        <div
                          className="absolute top-1/2 right-0 h-3.5 w-1.5 -translate-y-1/2 rounded-l-full border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                          style={{ marginRight: "-1px" }}
                        />

                        <div className="flex items-start justify-between">
                          <div>
                            <span className="block text-[8px] font-black tracking-widest text-zinc-500 uppercase">
                              What we are building
                            </span>
                            <h4 className="mt-0.5 text-xs font-bold tracking-tight text-white">
                              Free paid-tier access
                            </h4>
                          </div>
                          <Award className="h-4.5 w-4.5 text-zinc-400" />
                        </div>

                        <div className="mt-3 space-y-1 border-t border-dashed border-white/15 pt-3">
                          <span className="block text-[7px] tracking-widest text-zinc-500 uppercase">
                            Status
                          </span>
                          <span className="text-xs font-bold tracking-tight text-zinc-300">
                            In development — terms published before launch
                          </span>
                        </div>
                      </div>

                      <span className="block w-full rounded-xl border border-zinc-200 py-3 text-center text-[10px] font-bold tracking-wider text-zinc-500 uppercase dark:border-white/10 dark:text-zinc-400">
                        Rewards not yet live
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AmbassadorPlaybook;
