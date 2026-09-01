"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { siteConfig } from "@/config/site";

type FAQItem = {
  question: string;
  answer: string;
};

/**
 * These answers describe only what the program actually does today: an application,
 * a manual review, and an approve/reject decision. The server implements exactly
 * that (AmbassadorService.apply / getStatus / listApplications / reviewApplication)
 * and nothing else - there is no points model, no voucher model, no leaderboard,
 * and no automated .edu verification. Any reward mechanics described in numbers
 * would read as a live program, so they stay out until they exist.
 */
const faqItems: FAQItem[] = [
  {
    question: "Is there a cash payout for student ambassadors?",
    answer:
      "No. VeriWorkly is a free, open-core project with no commercial marketing budget, so the program is not a paid role. We are designing the reward side around free access to paid features rather than cash, and we will publish the specifics before anyone is asked to earn anything.",
  },
  {
    question: "What do ambassadors actually get right now?",
    answer:
      "The program is in its earliest phase, so we are honest about this: what you get today is direct access to the person building VeriWorkly, early influence over the roadmap, and first claim on the rewards once they launch. If you want a program with a settled points table, wait for the next intake rather than this one.",
  },
  {
    question: "How does the application work?",
    answer:
      "You fill in the application form with your college, graduation year, and a few short answers. It is then read by a person - there is no automated validator and no instant badge. You will see your status on the apply page as pending, approved, or not accepted.",
  },
  {
    question: "How long does review take?",
    answer:
      "Applications are reviewed by hand by one person, so this is not instant. We aim to get back to every applicant, and the apply page always shows your current status rather than leaving you guessing.",
  },
  {
    question: "How is my student status verified?",
    answer:
      "Manually, from what you tell us on the form and your public profiles. We do not currently run an automated university-domain check, so do not rely on a .edu address alone being enough - the review is a human reading your application.",
  },
  {
    question: "What will ambassadors be asked to do?",
    answer:
      "Introduce VeriWorkly to classmates who are job hunting, tell us where the product falls short for students, and help us understand what campus hiring actually looks like where you are. Anything beyond that will be agreed with you, not assigned to you.",
  },
];

const AmbassadorFAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section
      id="faq-section"
      className="bg-background relative mx-auto w-full max-w-7xl border-b border-zinc-200/80 px-6 py-28 dark:border-white/10"
    >
      <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4 lg:sticky lg:top-32">
          <h2 className="text-5xl leading-[0.85] font-black tracking-tight text-zinc-950 uppercase sm:text-6xl md:text-7xl dark:text-white">
            FREQUENTLY
            <br />
            ASKED
            <br />
            QUESTIONS
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Something here not answered, or want to know where the program is headed?
          </p>

          <div className="max-w-xs space-y-1 border-t border-zinc-200 pt-6 dark:border-white/10">
            <span className="block text-[9px] font-black tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
              Direct Support
            </span>
            <a
              href={`mailto:${siteConfig.email}`}
              className="font-mono text-xs font-bold text-zinc-900 underline transition-colors hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
            >
              {siteConfig.email}
            </a>
          </div>
        </div>

        <div className="border-t border-zinc-950 dark:border-white/20">
          {faqItems.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div key={idx} className="border-b border-zinc-200 dark:border-white/10">
                <button
                  onClick={() => toggleFAQ(idx)}
                  className="group flex w-full cursor-pointer items-center justify-between py-6 text-left transition-colors duration-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <span className="text-sm leading-snug font-extrabold tracking-tight text-zinc-950 md:text-base dark:text-white">
                    {faq.question}
                  </span>

                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className={`ml-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                      isOpen
                        ? "border-zinc-900 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                        : "border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-white/10 dark:bg-white/5 dark:text-zinc-500"
                    }`}
                  >
                    {isOpen ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pr-8 pb-6 text-xs leading-relaxed font-medium text-zinc-500 md:text-sm dark:text-zinc-400">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AmbassadorFAQ;
