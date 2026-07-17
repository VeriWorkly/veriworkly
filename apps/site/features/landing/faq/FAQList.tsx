"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { faqs } from "@/features/landing/faq/data/faqItems";

interface FAQCardProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}

const FAQCard = ({ question, answer, isOpen, onToggle, index }: FAQCardProps) => {
  const number = String(index + 1).padStart(2, "0");

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        type: "spring",
        stiffness: 80,
        damping: 18,
        delay: (index % 2) * 0.05,
      }}
      className={`group relative overflow-hidden rounded-[1.75rem] border transition-all duration-300 ${
        isOpen
          ? "border-blue-500/25 bg-blue-50/40 shadow-md dark:border-blue-500/20 dark:bg-blue-500/4"
          : "border-zinc-200 bg-white shadow-xs hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800/80 dark:bg-[#080808] dark:hover:border-zinc-700"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-4 p-6 text-left transition-transform duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 active:scale-[0.99]"
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold transition-colors duration-300 ${
            isOpen
              ? "bg-blue-600 text-white"
              : "bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600"
          }`}
        >
          {number}
        </span>
        <span className="flex-1 text-base font-bold text-zinc-900 transition-colors dark:text-white">
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
            isOpen
              ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
              : "border-zinc-100 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
          }`}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="overflow-hidden"
          >
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={isOpen}
              className="w-full px-6 pb-6 text-left focus:outline-none"
            >
              <p className="pl-13 text-[14px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                {answer}
              </p>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function FAQList() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Divide FAQs into two lists for 2 columns
  const leftColFaqs = faqs.filter((_, idx) => idx % 2 === 0);
  const rightColFaqs = faqs.filter((_, idx) => idx % 2 !== 0);

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* Left Column */}
      <div className="flex flex-col gap-5">
        {leftColFaqs.map((faq) => {
          const globalIdx = faqs.indexOf(faq);
          const isOpen = openIndex === globalIdx;
          return (
            <FAQCard
              key={globalIdx}
              question={faq.question}
              answer={faq.answer}
              isOpen={isOpen}
              onToggle={() => setOpenIndex(isOpen ? null : globalIdx)}
              index={globalIdx}
            />
          );
        })}
      </div>

      {/* Right Column */}
      <div className="flex flex-col gap-5">
        {rightColFaqs.map((faq) => {
          const globalIdx = faqs.indexOf(faq);
          const isOpen = openIndex === globalIdx;
          return (
            <FAQCard
              key={globalIdx}
              question={faq.question}
              answer={faq.answer}
              isOpen={isOpen}
              onToggle={() => setOpenIndex(isOpen ? null : globalIdx)}
              index={globalIdx}
            />
          );
        })}
      </div>
    </div>
  );
}
