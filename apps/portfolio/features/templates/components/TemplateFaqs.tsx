"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";

type FaqItem = {
  question: string;
  answer: string;
};

type FaqProps = {
  faqs: FaqItem[];
  templateName: string;
};

export default function TemplateFaqs({ faqs, templateName }: FaqProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  if (!faqs || faqs.length === 0) return null;

  return (
    <section className="mx-auto w-[min(1200px,calc(100%-48px))] pb-24">
      <div className="border-ink-2 bg-panel rounded-4xl border-2 p-6 shadow-[14px_16px_0_rgba(37,99,235,0.12)] sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-accent flex items-center gap-2 text-xs font-bold tracking-[0.16em] uppercase">
              <HelpCircle size={14} className="animate-pulse" /> Frequently Asked Questions
            </p>

            <h2 className="text-ink-2 mt-4 max-w-xl text-[clamp(2.8rem,5vw,5.5rem)] leading-[1.05] font-bold tracking-tighter">
              Got questions about {templateName}?
            </h2>

            <p className="text-ink-2/62 mt-5 max-w-md text-sm leading-7">
              Explore answers to common questions about this layout, design styling choices, and
              performance optimizations.
            </p>
          </div>

          <div className="space-y-3.5">
            {faqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              const titleId = `template-faq-title-${idx}`;
              const contentId = `template-faq-content-${idx}`;

              return (
                <article
                  key={idx}
                  className={`bg-paper rounded-2xl border-2 transition-all duration-300 ${
                    isOpen
                      ? "border-accent shadow-[6px_8px_0_rgba(37,99,235,0.06)]"
                      : "border-ink-2/10 hover:border-ink-2/25 shadow-sm"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(idx)}
                    aria-expanded={isOpen}
                    aria-controls={contentId}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-left transition-transform active:scale-[0.99] sm:p-6"
                  >
                    <h3
                      id={titleId}
                      className="text-ink-2 text-sm font-bold tracking-tight sm:text-base"
                    >
                      {faq.question}
                    </h3>

                    <span
                      className={`bg-panel border-ink-2/10 flex size-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                        isOpen
                          ? "text-accent bg-accent/8 border-accent/20 rotate-180"
                          : "text-ink-2/45"
                      }`}
                    >
                      <ChevronDown className="size-4" />
                    </span>
                  </button>

                  <div
                    id={contentId}
                    role="region"
                    aria-labelledby={titleId}
                    className={`overflow-hidden transition-all duration-300 ease-out ${
                      isOpen ? "max-h-[300px] opacity-100" : "pointer-events-none max-h-0 opacity-0"
                    }`}
                  >
                    <p className="text-ink-2/65 border-ink-2/5 border-t px-5 pt-3.5 pb-5.5 text-xs leading-relaxed sm:px-6 sm:text-sm">
                      {faq.answer}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
