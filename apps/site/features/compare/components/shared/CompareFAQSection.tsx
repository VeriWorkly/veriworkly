import { HelpCircle } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@veriworkly/ui";

import { type Competitor } from "../../types";

interface CompareFAQSectionProps {
  competitor: Competitor;
}

export const CompareFAQSection = ({ competitor }: CompareFAQSectionProps) => {
  if (!competitor.faqs || competitor.faqs.length === 0) return null;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="text-accent size-4" />

          <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
            Questions & Answers
          </span>
        </div>

        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Common questions about VeriWorkly vs {competitor.name}
        </h2>

        <p className="text-muted max-w-2xl text-sm">
          Quick, honest answers to help you choose the easiest tool for your job search.
        </p>
      </div>

      <Accordion type="single" collapsible defaultValue="faq-0">
        {competitor.faqs.map((faq, index) => (
          <AccordionItem key={index} value={`faq-${index}`}>
            <AccordionTrigger className="text-sm font-semibold sm:text-base">
              {faq.question}
            </AccordionTrigger>

            <AccordionContent className="text-xs leading-relaxed sm:text-sm">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default CompareFAQSection;
