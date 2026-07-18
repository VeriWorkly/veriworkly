"use client";

import { Search, X, HelpCircle } from "lucide-react";
import { useState, useMemo, useDeferredValue } from "react";

import { Accordion, AccordionItem, AccordionContent, AccordionTrigger } from "@veriworkly/ui";

import { categories, faqs } from "../data/faqItems";

function splitIntoColumns<T>(items: T[]): [T[], T[]] {
  const left: T[] = [];
  const right: T[] = [];

  items.forEach((item, index) => {
    if (index % 2 === 0) {
      left.push(item);
      return;
    }

    right.push(item);
  });

  return [left, right];
}

export const FaqInteractiveSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredFaqs = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();

    return faqs.filter((faq) => {
      const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory;

      if (!query) return matchesCategory;

      return (
        matchesCategory &&
        (faq.question.toLowerCase().includes(query) || faq.answer.toLowerCase().includes(query))
      );
    });
  }, [deferredSearchQuery, selectedCategory]);

  const [leftColumn, rightColumn] = useMemo(() => {
    return splitIntoColumns(filteredFaqs);
  }, [filteredFaqs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 border-b border-zinc-200/60 pb-6 md:flex-row md:items-center md:justify-between dark:border-zinc-800/60">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)]"
                    : "border border-zinc-200 bg-white text-zinc-500 hover:border-blue-500/30 hover:text-zinc-900 dark:border-zinc-800 dark:bg-[#0c0c0c] dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        <div className="relative flex w-full items-center rounded-full border border-zinc-200 bg-white px-4 py-2 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 md:max-w-xs dark:border-zinc-800 dark:bg-[#0c0c0c]">
          <Search className="mr-2.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs..."
            className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-white"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="rounded-full p-0.5 hover:bg-zinc-100 dark:hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {filteredFaqs.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
          <Accordion type="single" collapsible className="gap-4">
            {leftColumn.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="rounded-2xl border border-zinc-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-800/80 dark:bg-[#0c0c0c]"
              >
                <AccordionTrigger className="text-zinc-900 dark:text-white">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="border-zinc-100 dark:border-zinc-900">
                  <span className="text-zinc-500 dark:text-zinc-400">{faq.answer}</span>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <Accordion type="single" collapsible className="gap-4">
            {rightColumn.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="rounded-2xl border border-zinc-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-800/80 dark:bg-[#0c0c0c]"
              >
                <AccordionTrigger className="text-zinc-900 dark:text-white">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="border-zinc-100 dark:border-zinc-900">
                  <span className="text-zinc-500 dark:text-zinc-400">{faq.answer}</span>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/50 p-12 text-center dark:border-zinc-800 dark:bg-white/5">
          <HelpCircle className="mx-auto h-10 w-10 animate-pulse text-zinc-400" aria-hidden="true" />

          <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">
            No matches found
          </h3>

          <p className="mx-auto mt-2 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            We couldn&apos;t find any questions matching your query. Try clearing filters or using
            another keyword.
          </p>

          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
            className="mt-4 rounded-full border border-zinc-200 px-4 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-white dark:hover:bg-white/5"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};
