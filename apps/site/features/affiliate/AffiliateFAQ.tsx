"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { m } from "framer-motion";

import { AnimatedDetails } from "@/components/ui/animated-details";

const faqItems = [
  {
    question: "How do referrals get tracked?",
    answer:
      "When someone visits your partner link, we log the click, and the referral is attached to their account the first time they sign in through that link. It has to be attached within 30 days of their sign-up and before their first purchase; after that it stays linked, and every payment they make earns you commission.",
  },
  {
    question: "When and how are payouts processed?",
    answer:
      "Payouts are reviewed manually. Once your dashboard balance reaches the minimum threshold of $25.00, you can request a payout. Our team reviews each request to prevent abuse before releasing funds. Billing runs on Dodo Payments; payouts themselves are currently issued directly by our team rather than on an automatic schedule.",
  },
  {
    question: "Why are VeriWorkly's commission rates set to 2% - 5% recurring?",
    answer:
      "VeriWorkly is an open-source, bootstrapped project. We keep our premium plans highly affordable (starting at $2.99 for passes or $5.99/mo for subscriptions) with thin margins, rather than charging typical high-margin SaaS rates. Our 2% to 5% recurring commission structure is designed to be sustainable long-term without forcing price hikes on job seekers and students.",
  },
  {
    question: "Does my earned commission ever expire?",
    answer:
      "No. Your earned commission balance does not expire. Commissions are reviewed and released to your available balance over time, and you can request a payout whenever you're above the $25.00 minimum - there's no inactivity window or deadline to claim it.",
  },
  {
    question: "Are self-referrals permitted?",
    answer:
      "No. You can't enroll your own referral code on your own account, and each account can only ever be linked to one referrer. Our team manually reviews referral and commission activity for abuse, and we reserve the right to reverse commissions or suspend accounts that violate these terms.",
  },
  {
    question: "Can I run paid advertisements to my link?",
    answer:
      "Yes, you are allowed to promote your affiliate link via paid advertisements. However, you are strictly prohibited from bidding on brand keywords (e.g. search terms containing 'VeriWorkly') on Google, Bing, or social platforms.",
  },
];

const AffiliateFAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
              <AnimatedDetails
                key={faq.question}
                open={isOpen}
                onOpenChange={(open) => setOpenIndex(open ? idx : null)}
                panelTransition={{ duration: 0.25, ease: "easeInOut" }}
                className="reveal border-border/60 bg-card/35 rounded-2xl border p-6 backdrop-blur-sm transition-colors duration-300 hover:border-blue-500/35 dark:border-zinc-800 dark:bg-zinc-900/25"
                summaryClassName="flex cursor-pointer list-none items-center justify-between gap-4 select-none [&::-webkit-details-marker]:hidden"
                summary={
                  <>
                    <span className="flex items-center gap-3">
                      <HelpCircle
                        aria-hidden="true"
                        className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
                      />
                      <span className="text-foreground text-base font-semibold">
                        {faq.question}
                      </span>
                    </span>
                    <m.span
                      aria-hidden="true"
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-muted/75"
                    >
                      <ChevronDown className="h-5 w-5" />
                    </m.span>
                  </>
                }
              >
                <p className="text-muted/85 mt-4 border-l-2 border-blue-500/30 pl-4 text-sm leading-relaxed">
                  {faq.answer}
                </p>
              </AnimatedDetails>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AffiliateFAQ;
