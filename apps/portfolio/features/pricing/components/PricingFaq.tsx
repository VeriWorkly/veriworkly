"use client";

import Link from "next/link";
import { useState } from "react";
import { HelpCircle, ArrowRight } from "lucide-react";

import { pricingFaqs } from "@/features/faq/constants";
import FaqAccordionItem from "@/features/faq/components/FaqAccordionItem";

const PricingFaq = () => {
  const [openFaqId, setOpenFaqId] = useState<string | null>("credits");

  const toggleFaq = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="border-line relative border-t py-24">
      <div className="mx-auto w-[min(1160px,calc(100%-32px))]">
        <div className="grid items-start gap-12 text-left lg:grid-cols-[400px_1fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="border-line bg-panel/60 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold tracking-[0.12em] uppercase backdrop-blur">
              <HelpCircle className="text-accent size-3.5" /> Help Desk
            </p>

            <h2 className="text-ink mt-6 text-[clamp(2.2rem,5vw,3.6rem)] leading-none font-bold tracking-tighter">
              Frequently <br />
              Asked <span className="text-accent">Questions.</span>
            </h2>

            <p className="text-muted mt-6 max-w-sm text-sm leading-6">
              Everything you need to know about our flexible plans, billing cycles, AI credit
              resets, and cancellation policy.
            </p>

            <Link
              href="/faq"
              className="border-line hover:border-line-strong hover:bg-panel bg-panel/30 text-ink mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full border px-6 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
            >
              Browse Full FAQ <ArrowRight size={15} />
            </Link>
          </div>

          <div className="space-y-4">
            {pricingFaqs.map((faq) => (
              <FaqAccordionItem
                id={faq.id}
                key={faq.id}
                answer={faq.answer}
                question={faq.question}
                isOpen={openFaqId === faq.id}
                onToggle={() => toggleFaq(faq.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingFaq;
