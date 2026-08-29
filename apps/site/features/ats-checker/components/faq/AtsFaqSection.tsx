"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@veriworkly/ui";
import { Reveal } from "@/components/marketing/Reveal";
import type { FaqItem } from "@/features/faq/data/faqItems";

interface AtsFaqSectionProps {
  faqs: FaqItem[];
}

export function AtsFaqSection({ faqs }: AtsFaqSectionProps) {
  return (
    <section className="space-y-10 border-t border-border/40 pt-16">
      <div className="space-y-2 text-left">
        <div className="flex items-center gap-2">
          <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
            FAQ &amp; Clarifications
          </span>
          <span className="border-border/60 bg-background text-muted rounded-full border px-2.5 py-0.5 font-mono text-[10px]">
            {faqs.length} Answers
          </span>
        </div>
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
          Frequently asked questions about ATS checking
        </h2>
        <p className="text-muted max-w-2xl text-xs sm:text-sm leading-relaxed">
          Common questions about how resume parsing works, scoring methods, keyword match calculations, and privacy boundaries.
        </p>
      </div>

      <Reveal>
        <Accordion
          type="single"
          collapsible
          defaultValue={faqs[0]?.id}
          className="gap-3.5"
        >
          {faqs.map((faq) => (
            <AccordionItem
              key={faq.id}
              value={faq.id}
              className="border-border/60 bg-card/40 hover:border-accent/40 rounded-2xl border backdrop-blur-sm transition-all"
            >
              <AccordionTrigger className="px-5 py-4.5 text-sm sm:text-base font-bold tracking-tight">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm leading-relaxed text-muted px-5 py-4">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  );
}

export default AtsFaqSection;
