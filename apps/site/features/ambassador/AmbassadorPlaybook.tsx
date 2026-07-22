"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion, motion } from "framer-motion";
import {
  UserCheck,
  Share2,
  Award,
  ClipboardList,
  Send,
  CheckCircle,
  Heart,
  Repeat,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

type PlaybookStep = {
  num: string;
  title: string;
  subtitle: string;
  description: string;
  badgeLabel: string;
  icon: React.ComponentType<{ className?: string }>;
};

const steps: PlaybookStep[] = [
  {
    num: "01",
    title: "Verify student status",
    subtitle: "Submit academic credentials to activate leader access.",
    description:
      "Onboard by entering your (.edu) or local university email. Our automated node validator reviews student registers and issues campus ambassador badges instantly.",
    badgeLabel: "Step 1: Onboard",
    icon: UserCheck,
  },
  {
    num: "02",
    title: "Promote & publish",
    subtitle: "Showcase career tools and share reviews on social feeds.",
    description:
      "Help peers compile resume profiles. Post video walkthroughs or write articles on Twitter/X, Medium, or LinkedIn to start scoring points automatically.",
    badgeLabel: "Step 2: Share",
    icon: Share2,
  },
  {
    num: "03",
    title: "Claim Pro licenses",
    subtitle: "Accumulate points and exchange for Portfolio Pro.",
    description:
      "Redeem 1,500 point blocks for 30-day premium Portfolio Pro licenses. Tokens stack, allowing you to secure permanent pro access on your profile.",
    badgeLabel: "Step 3: Exchange",
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
      ref={containerRef}
      className="bg-background relative z-25 border-b border-zinc-200/80 dark:border-white/10"
    >
      <div className="playbook-card bg-background relative flex min-h-dvh items-center justify-center px-6">
        <div className="max-w-xl space-y-6 text-center">
          <span className="text-indigo-650 flex items-center justify-center gap-2 text-[10px] font-black tracking-widest uppercase dark:text-indigo-400">
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
          <p className="text-zinc-555 mx-auto max-w-md text-sm leading-relaxed dark:text-zinc-400">
            Scroll down to watch steps stack and view the automated student leader credential
            process.
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
                    <Icon className="text-indigo-650 h-3.5 w-3.5 dark:text-indigo-400" />
                    <span>{step.badgeLabel}</span>
                  </span>
                  <h3 className="text-3xl leading-[0.95] font-extrabold tracking-tight text-zinc-950 uppercase sm:text-4xl dark:text-white">
                    {step.title}
                  </h3>
                </div>

                <p className="text-zinc-555 max-w-lg text-sm leading-relaxed dark:text-zinc-400">
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
                      <span className="text-zinc-550 text-[10px] font-black tracking-widest uppercase dark:text-zinc-400">
                        Academic Validation
                      </span>
                      <span className="font-mono text-[9px] font-bold text-emerald-600 uppercase dark:text-emerald-400">
                        ONLINE
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <span className="block text-[9px] font-black tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                          University Email
                        </span>
                        <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 font-mono text-xs font-bold text-zinc-900 dark:border-white/10 dark:bg-zinc-950 dark:text-white">
                          <span>alex.chen@waterloo.ca</span>
                          <Send className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                        </div>
                      </div>

                      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-3.5">
                        <CheckCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <span className="block text-[10px] font-black text-zinc-900 uppercase dark:text-white">
                            Node verified
                          </span>
                          <span className="mt-0.5 block text-[9px] leading-normal text-zinc-500 dark:text-zinc-400">
                            Waterloo domain validated. Campus Leader credentials issued.
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
                      <span className="text-zinc-550 text-[10px] font-black tracking-widest uppercase dark:text-zinc-400">
                        Share Verification
                      </span>
                      <span className="font-mono text-[9px] font-bold text-indigo-600 uppercase dark:text-indigo-400">
                        VALIDATED
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950">
                        <p className="text-xs leading-relaxed text-zinc-900 dark:text-white">
                          {'"Built my portfolio on '}
                          <strong className="text-indigo-650 dark:text-indigo-400">
                            @veriworkly
                          </strong>
                          {" privately in 5 mins. Check it out: "}
                          <span className="text-indigo-650 underline dark:text-indigo-400">
                            alex.veriworkly.com
                          </span>
                          {'"'}
                        </p>
                        <div className="dark:text-zinc-555 flex items-center gap-6 font-mono text-[10px] font-bold text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" /> 148
                          </span>
                          <span className="flex items-center gap-1">
                            <Repeat className="h-3.5 w-3.5 text-emerald-500" /> 32
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs font-bold dark:border-white/10 dark:bg-zinc-950">
                        <span className="text-zinc-500 dark:text-zinc-400">Points Credited</span>
                        <span className="font-mono text-zinc-900 dark:text-white">+50 PTS</span>
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
                      <span className="text-zinc-550 text-[10px] font-black tracking-widest uppercase dark:text-zinc-400">
                        Upgrade Hub
                      </span>
                      <span className="font-mono text-[9px] font-bold text-amber-600 uppercase dark:text-amber-500">
                        READY
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
                            <span className="text-zinc-450 block text-[8px] font-black tracking-widest uppercase">
                              Upgrade Token
                            </span>
                            <h4 className="mt-0.5 text-xs font-bold tracking-tight text-white">
                              Portfolio Pro Key
                            </h4>
                          </div>
                          <Award className="h-4.5 w-4.5 text-zinc-400" />
                        </div>

                        <div className="mt-3 space-y-1 border-t border-dashed border-white/15 pt-3">
                          <span className="block text-[7px] tracking-widest text-zinc-500 uppercase">
                            Activation Key
                          </span>
                          <span className="font-mono text-xs font-bold tracking-widest text-zinc-300">
                            VW-PRO-K98X-841L
                          </span>
                        </div>
                      </div>

                      <button className="w-full cursor-pointer rounded-xl bg-zinc-900 py-3 text-[10px] font-bold tracking-wider text-white uppercase transition-transform hover:bg-zinc-800 active:scale-98 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100">
                        Claim Voucher
                      </button>
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
