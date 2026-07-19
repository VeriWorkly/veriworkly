"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { siteConfig } from "@/config/site";

type FAQItem = {
  question: string;
  answer: string;
};

const faqItems: FAQItem[] = [
  {
    question: "Is there a cash payout or budget for student ambassadors?",
    answer:
      "No. VeriWorkly is a free, open-source project. Because we operate without a direct commercial marketing budget, we run a points-based system instead of cash payouts. Points can be exchanged for premium platform access tokens.",
  },
  {
    question: "How do classmate invite points work and how do we prevent spam?",
    answer:
      "You earn 10 points for every peer who registers. To prevent invite spam or fake self-referral accounts, invites are only officially 'qualified' and credited once the classmate actively engages with the builder and scores at least 250 platform points (e.g. creating their resume, Master Profile, or customization).",
  },
  {
    question: "How does the upgrade boost work?",
    answer:
      "If a classmate you invited upgrades to a paid plan (Portfolio Pro, AI Credits, or the Bundle), you receive a 1.2x boost of +20 points (totaling 30 points for that referral).",
  },
  {
    question: "Do my points expire?",
    answer:
      "Yes. To keep the program structured and encourage active participation, all points expire at the end of each calendar year. For example, all points earned in 2026 will reset on January 1, 2027. Be sure to redeem your points before the end of the year!",
  },
  {
    question: "What are the limits on social posts, articles, and videos?",
    answer:
      "Ambassadors can create and upload up to 30 videos (50 pts each), 30 articles/blog posts (40 pts each), and 30 Twitter/X or LinkedIn shares (5 pts each) per month. To maintain high quality and prevent system spam, a daily limit of 1 post count per day applies across all channels.",
  },
  {
    question: "What platforms are allowed for video walkthroughs and articles?",
    answer:
      "Videos must be posted on LinkedIn or Twitter/X (videos uploaded on TikTok or YouTube are not credited). Articles and blog posts must be published on Medium, Dev.to, LinkedIn Articles, or a reputable personal blog. All posts are reviewed manually.",
  },
  {
    question: "How do I redeem Portfolio Pro access and when does it expire?",
    answer:
      "You can redeem 30 days of Portfolio Pro at any time for 1,500 points. The 30-day Pro license begins the day you claim it and expires after 30 days, regardless of whether you keep a portfolio published or not.",
  },
  {
    question: "How is my student status verified?",
    answer:
      "Submit your application using a valid university email domain (.edu or your institution's local equivalent). Once validated, your account is activated as a Campus Ambassador.",
  },
];

export function AmbassadorFAQ() {
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
        {/* Left Column: Sticky Title */}
        <div className="space-y-4 lg:sticky lg:top-32">
          <h2 className="text-5xl leading-[0.85] font-black tracking-tight text-zinc-950 uppercase sm:text-6xl md:text-7xl dark:text-white">
            FREQUENTLY
            <br />
            ASKED
            <br />
            QUESTIONS
          </h2>
          <p className="text-zinc-555 max-w-xs text-sm leading-relaxed dark:text-zinc-400">
            Need clarification on points verification, caps, or voucher expirations?
          </p>

          <div className="max-w-xs space-y-1 border-t border-zinc-200 pt-6 dark:border-white/10">
            <span className="block text-[9px] font-black tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
              Direct Support
            </span>
            <a
              href={`mailto:${siteConfig.email}`}
              className="hover:text-indigo-650 font-mono text-xs font-bold text-zinc-900 underline transition-colors dark:text-white dark:hover:text-indigo-400"
            >
              {siteConfig.email}
            </a>
          </div>
        </div>

        {/* Right Column: Accordion rows (No boxed cards!) */}
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

                  {/* Rotating Indicator */}
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
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="text-zinc-555 pr-8 pb-6 text-xs leading-relaxed font-medium md:text-sm dark:text-zinc-400">
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
}
