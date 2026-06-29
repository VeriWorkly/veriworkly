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
      <div className="flex flex-col gap-6 border-b border-zinc-200/20 pb-6 md:flex-row md:items-center md:justify-between">
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
                    ? "bg-blue-600 text-white shadow-[2px_2px_0_0_rgba(37,99,235,0.25)]"
                    : "border-border bg-card text-muted hover:text-foreground border shadow-[2px_2px_0_0_rgba(23,23,23,0.03)] hover:border-blue-500/40 dark:shadow-[2px_2px_0_0_rgba(255,255,255,0.02)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        <div className="border-border bg-card relative flex w-full items-center rounded-full border px-4 py-2 shadow-[2px_2px_0_0_rgba(23,23,23,0.03)] focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 md:max-w-xs dark:shadow-[2px_2px_0_0_rgba(255,255,255,0.02)]">
          <Search className="text-muted mr-2.5 h-4 w-4 shrink-0" />

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs..."
            className="text-foreground placeholder:text-muted w-full bg-transparent text-sm outline-none"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="hover:bg-border/30 rounded-full p-0.5"
            >
              <X className="text-muted h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {filteredFaqs.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
          <Accordion type="single" collapsible className="gap-4">
            {leftColumn.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <Accordion type="single" collapsible className="gap-4">
            {rightColumn.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ) : (
        <div className="border-border/80 bg-card/50 rounded-2xl border border-dashed p-12 text-center">
          <HelpCircle className="text-muted mx-auto h-10 w-10 animate-pulse" />

          <h3 className="text-foreground mt-4 text-base font-semibold">No matches found</h3>

          <p className="text-muted mx-auto mt-2 max-w-sm text-xs">
            We couldn&apos;t find any questions matching your query. Try clearing filters or using
            another keyword.
          </p>

          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
            className="border-border text-foreground hover:bg-border/30 mt-4 rounded-full border px-4 py-1.5 text-xs font-semibold"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};
