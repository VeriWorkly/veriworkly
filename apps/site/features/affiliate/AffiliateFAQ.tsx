"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";

const faqItems = [
  {
    question: "How do referrals get tracked?",
    answer:
      "When someone clicks your partner link, a cookie is saved in their browser with a 60-day duration. If they subscribe to any paid plan within those 60 days, the conversion is linked to your partner dashboard.",
  },
  {
    question: "When and how are payouts processed?",
    answer:
      "Commission payouts are processed monthly. Once your dashboard balance reaches the minimum threshold of $25.00, you can request a payout. Transactions are reviewed manually to prevent abuse and processed via Stripe or local payout methods.",
  },
  {
    question: "Why are VeriWorkly's commission rates set to 2% - 5% recurring?",
    answer:
      "VeriWorkly is an open-source, bootstrapped project. We keep our premium plans highly affordable (starting at $2.99 for passes or $5.99/mo for subscriptions) with thin margins, rather than charging typical high-margin SaaS rates. Our 2% to 5% recurring commission structure is designed to be sustainable long-term without forcing price hikes on job seekers and students.",
  },
  {
    question: "Does my earned commission ever expire?",
    answer:
      "For active accounts with balances under $25.00, your earnings will not expire. If your balance exceeds $25.00, we will send automatic reminders asking you to submit a withdrawal request. If your account is inactive (no logins for 3 months / 90 days), your status changes to 'Inactive'. You then have exactly 60 days to claim your accumulated balance. If unclaimed within this grace period, your balance expires and all associated referrals are lost.",
  },
  {
    question: "Are self-referrals permitted?",
    answer:
      "No. Self-referrals are strictly prohibited. The system filters IP addresses, devices, and payment email domains to identify and flag self-referral attempts automatically. Referrals must be genuine, independent users.",
  },
  {
    question: "Can I run paid advertisements to my link?",
    answer:
      "Yes, you are allowed to promote your affiliate link via paid advertisements. However, you are strictly prohibited from bidding on brand keywords (e.g. search terms containing 'VeriWorkly') on Google, Bing, or social platforms.",
  },
];

const AffiliateFAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="border-border/30 mx-auto max-w-7xl border-t px-6 py-24 md:py-32">
      <div className="grid items-start gap-12 lg:grid-cols-[1.2fr_2fr]">
        <div className="space-y-6 lg:sticky lg:top-24">
          <h2 className="text-foreground text-4xl leading-tight font-extrabold tracking-tight md:text-5xl">
            Common <br />
            <span className="font-serif font-normal text-blue-600 italic dark:text-blue-400">
              Queries.
            </span>
          </h2>
          <p className="text-muted max-w-[28ch] text-base leading-relaxed">
            Clear details about tracking, parameters, withdrawals, and system terms.
          </p>
        </div>

        <div className="space-y-4">
          {faqItems.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                onClick={() => toggleFAQ(idx)}
                className="border-border/60 bg-card/35 cursor-pointer rounded-2xl border p-6 backdrop-blur-sm transition-all duration-300 select-none hover:border-blue-500/35 dark:border-zinc-800 dark:bg-zinc-900/25"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                    <span className="text-foreground text-base font-semibold">{faq.question}</span>
                  </div>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-muted-foreground/75"
                  >
                    <ChevronDown className="h-5 w-5" />
                  </motion.span>
                </div>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="text-muted-foreground/85 border-l-2 border-blue-500/30 pl-4 text-sm leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AffiliateFAQ;
