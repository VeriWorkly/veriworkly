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
      {/* The heading wraps the button, never the reverse: a button's content is flattened to plain text. */}
      <h3 className="text-ink text-base font-bold tracking-[-0.02em] sm:text-lg">
        <button
          id={titleId}
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="flex w-full cursor-pointer items-center justify-between gap-4 p-6 text-left transition-transform active:scale-[0.99] sm:p-7"
        >
          {question}

          <span
            aria-hidden="true"
            className={`bg-paper/60 border-line flex size-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
              isOpen ? "text-accent bg-accent/10 border-accent/25 rotate-180" : "text-muted"
            }`}
          >
            <ChevronDown className="size-4" />
          </span>
        </button>
      </h3>

      {/* Grid rows animate to the answer's real height, so no answer is ever clipped (P-075); inert keeps a closed answer out of the reading order. */}
      <div
        id={contentId}
        role="region"
        aria-labelledby={titleId}
        inert={!isOpen || undefined}
        className={`grid transition-all duration-300 ease-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-muted border-line/30 max-w-3xl border-t px-6 pt-4 pb-7 text-sm leading-relaxed sm:px-7 sm:pb-8">
            {answer}
          </p>
        </div>
      </div>
    </article>
  );
};

export default FaqAccordionItem;
