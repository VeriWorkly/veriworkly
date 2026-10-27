"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { m } from "framer-motion";

import { AnimatedDetails } from "@/components/ui/animated-details";
import { faqs } from "@/features/landing/faq/data/faqItems";

/** Every answer stays in the server HTML inside a `<details>`, because the page's FAQPage markup describes them. */

interface FAQCardProps {
  index: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const FAQCard = ({ index, isOpen, onOpenChange }: FAQCardProps) => {
  const faq = faqs[index];
  const number = String(index + 1).padStart(2, "0");

  return (
    <AnimatedDetails
      open={isOpen}
      onOpenChange={onOpenChange}
      className={`reveal group relative overflow-hidden rounded-[1.75rem] border transition-all duration-300 ${
        isOpen
          ? "border-blue-500/25 bg-blue-50/40 shadow-md dark:border-blue-500/20 dark:bg-blue-500/4"
          : "border-zinc-200 bg-white shadow-xs hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800/80 dark:bg-[#080808] dark:hover:border-zinc-700"
      }`}
      summaryClassName="flex w-full cursor-pointer list-none items-center gap-4 p-6 text-left transition-transform duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 active:scale-[0.99] [&::-webkit-details-marker]:hidden"
      summary={
        <>
          <span
            aria-hidden="true"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold transition-colors duration-300 ${
              isOpen
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600"
            }`}
          >
            {number}
          </span>

          <span className="flex-1 text-base font-bold text-zinc-900 transition-colors dark:text-white">
            {faq.question}
          </span>

          <m.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
              isOpen
                ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : "border-zinc-100 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
            }`}
          >
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </m.span>
        </>
      }
    >
      <div className="w-full px-6 pb-6 text-left">
        <p className="pl-13 text-[14px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          {faq.answer}
        </p>
      </div>
    </AnimatedDetails>
  );
};

const FAQList = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const columns = [0, 1].map((column) =>
    faqs.map((_, index) => index).filter((index) => index % 2 === column),
  );

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {columns.map((indexes, column) => (
        <div key={column} className="flex flex-col gap-5">
          {indexes.map((index) => (
            <FAQCard
              key={faqs[index].id}
              index={index}
              isOpen={openIndex === index}
              onOpenChange={(open) => setOpenIndex(open ? index : null)}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default FAQList;
