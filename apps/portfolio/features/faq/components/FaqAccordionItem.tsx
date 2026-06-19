"use client";

import { ChevronDown } from "lucide-react";

interface FaqAccordionItemProps {
  id: string;
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

const FaqAccordionItem = ({ id, question, answer, isOpen, onToggle }: FaqAccordionItemProps) => {
  const titleId = `faq-title-${id}`;
  const contentId = `faq-content-${id}`;

  return (
    <article
      className={`bg-panel rounded-2xl border-2 transition-all duration-300 ${
        isOpen
          ? "border-accent shadow-[8px_10px_0_rgba(37,99,235,0.08)]"
          : "border-line hover:border-line-strong shadow-[8px_10px_0_rgba(17,17,15,0.03)] dark:shadow-[8px_10px_0_rgba(255,255,255,0.01)]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="flex w-full cursor-pointer items-center justify-between gap-4 p-6 text-left transition-transform active:scale-[0.99] sm:p-7"
      >
        <h2 id={titleId} className="text-ink text-base font-bold tracking-[-0.02em] sm:text-lg">
          {question}
        </h2>

        <span
          className={`bg-paper/60 border-line flex size-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
            isOpen ? "text-accent bg-accent/10 border-accent/25 rotate-180" : "text-muted"
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
          isOpen ? "max-h-75 opacity-100" : "pointer-events-none max-h-0 opacity-0"
        }`}
      >
        <p className="text-muted border-line/30 max-w-3xl border-t px-6 pt-4 pb-7 text-sm leading-relaxed sm:px-7 sm:pb-8">
          {answer}
        </p>
      </div>
    </article>
  );
};

export default FaqAccordionItem;
