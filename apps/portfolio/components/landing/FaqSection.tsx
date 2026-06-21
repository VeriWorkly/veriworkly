"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { landingFaqs } from "@/features/faq/constants";
import FaqAccordionItem from "@/features/faq/components/FaqAccordionItem";

const FaqSection = () => {
  const [openId, setOpenId] = useState<string | null>("diff");

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="mx-auto grid w-[min(1360px,calc(100%-48px))] gap-12 pb-32 max-sm:w-[min(calc(100%-30px),1360px)] md:pb-44 lg:grid-cols-[0.82fr_1.18fr]">
      <div data-reveal className="lg:sticky lg:top-30 lg:self-start">
        <p className="mb-5 text-[0.72rem] font-bold tracking-[0.16em] uppercase">Got questions?</p>

        <h2 className="max-w-4xl text-[clamp(3.4rem,7vw,7rem)] leading-none tracking-tighter wrap-normal">
          <span className="sr-only">Portfolio builder FAQ: </span>
          Frequently asked. <br />
          <span className="text-accent">Clearly answered.</span>
        </h2>

        <p className="text-ink-2/60 mt-10 max-w-md text-sm leading-6">
          Everything you need to know about custom subdomains, layout template switches, image
          hosting, and exports.
        </p>

        <div className="mt-10">
          <Link
            href="/faq"
            className="border-ink-2 bg-ink-2 hover:text-ink-2 text-paper inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 px-6 text-sm font-bold transition-all duration-300 hover:-translate-y-1 hover:bg-transparent active:scale-[0.97]"
          >
            Browse all FAQs <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {landingFaqs.map((faq) => (
          <FaqAccordionItem
            id={faq.id}
            key={faq.id}
            answer={faq.answer}
            question={faq.question}
            isOpen={openId === faq.id}
            onToggle={() => toggle(faq.id)}
          />
        ))}
      </div>
    </section>
  );
};

export default FaqSection;
