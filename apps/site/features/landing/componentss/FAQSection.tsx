import Link from "next/link";

import { Button } from "@veriworkly/ui";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@veriworkly/ui";

import { faqs } from "../data/faqItems";

const FAQSection = () => {
  return (
    <section className="space-y-8" aria-labelledby="faq-heading">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div className="space-y-3 lg:sticky lg:top-24">
          <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">Questions</p>

          <h2 id="faq-heading" className="text-foreground text-3xl font-semibold tracking-tight">
            Frequently asked questions
          </h2>

          <p className="text-muted text-sm leading-7 md:text-base">
            Quick answers for privacy, exports, template control, sharing, and account-free usage.
          </p>

          <div className="pt-2">
            <Button asChild variant="secondary" size="md">
              <Link href="/faq">View full FAQ</Link>
            </Button>
          </div>
        </div>

        <Accordion type="single" collapsible className="gap-3">
          {faqs.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQSection;
