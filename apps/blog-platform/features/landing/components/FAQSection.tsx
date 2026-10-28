import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@veriworkly/ui";

const blogFaqs = [
  {
    question: "How often do you publish?",
    answer:
      "We publish when we have meaningful updates, implementation notes, or useful guidance to share.",
  },
  {
    question: "Can I contribute to the blog?",
    answer:
      "You can open a discussion or issue in our GitHub repository to propose a topic or collaboration.",
  },
  {
    question: "Where can I find release notes?",
    answer:
      "Release notes are published at veriworkly.com/changelog and as GitHub releases, not on this blog.",
  },
];

export const FAQSection = () => {
  return (
    <section className="space-y-8" aria-labelledby="faq-heading">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div className="space-y-3 lg:sticky lg:top-24">
          <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">Questions</p>

          <h2 id="faq-heading" className="text-foreground text-3xl font-semibold tracking-tight">
            Blog FAQ
          </h2>

          <p className="text-muted text-sm leading-7 md:text-base">
            Common questions about our content, guest posts, and engineering updates.
          </p>
        </div>

        <Accordion type="single" collapsible className="gap-3">
          {blogFaqs.map((faq) => (
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
