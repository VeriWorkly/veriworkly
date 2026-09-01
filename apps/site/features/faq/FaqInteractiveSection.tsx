"use client";

import { Search, X, HelpCircle } from "lucide-react";
import { useState, useMemo, useDeferredValue } from "react";

import { Accordion, AccordionItem, AccordionContent, AccordionTrigger } from "@veriworkly/ui";

import { categories, faqs } from "./data/faqItems";

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

const FaqInteractiveSection = () => {
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

  const activeCategoryName =
    categories.find((c) => c.id === selectedCategory)?.name || "All Questions";

  return (
    <div className="space-y-6">
      <div className="border-border/40 flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label="Filter questions by category"
          className="flex flex-wrap gap-1.5 sm:gap-2"
        >
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-accent text-accent-foreground ring-accent/20 font-bold shadow-xs ring-2"
                    : "border-border/60 bg-card/60 text-muted hover:text-foreground hover:border-border hover:bg-card/90 border"
                }`}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        <div className="border-border/60 bg-card/50 focus-within:border-accent focus-within:ring-accent/10 relative flex w-full items-center rounded-full border px-3.5 py-2 backdrop-blur-xs transition-all duration-200 focus-within:ring-3 lg:max-w-xs">
          <Search className="text-muted mr-2 size-4 shrink-0" aria-hidden="true" />

          <input
            type="search"
            value={searchQuery}
            aria-label="Search frequently asked questions"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions..."
            className="text-foreground placeholder:text-muted/60 w-full bg-transparent text-xs outline-none"
          />

          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchQuery("")}
              className="text-muted hover:text-foreground cursor-pointer rounded-full p-0.5 transition-colors"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted text-[11px] sm:text-xs">
          Showing <strong className="text-foreground font-semibold">{filteredFaqs.length}</strong>{" "}
          of {faqs.length} questions in{" "}
          <span className="text-accent font-medium">{activeCategoryName}</span>
        </span>

        {(searchQuery || selectedCategory !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
            className="text-accent cursor-pointer text-[11px] font-semibold hover:underline sm:text-xs"
          >
            Reset filters
          </button>
        )}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {filteredFaqs.length === 0
          ? "No questions match your search."
          : `${filteredFaqs.length} question${filteredFaqs.length === 1 ? "" : "s"} shown.`}
      </p>

      {filteredFaqs.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-start">
          <Accordion type="single" collapsible className="space-y-3">
            {leftColumn.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="border-border/60 bg-card/40 hover:border-accent/40 rounded-xl border shadow-none backdrop-blur-xs transition-all duration-200"
              >
                <AccordionTrigger
                  headingLevel="h2"
                  className="text-foreground hover:text-accent px-4 py-3.5 text-left text-xs font-semibold transition-colors sm:px-4.5 sm:py-4 sm:text-sm"
                >
                  {faq.question}
                </AccordionTrigger>

                <AccordionContent className="border-border/30 border-t px-4 pt-3 pb-4 sm:px-4.5 sm:pt-3.5 sm:pb-4.5">
                  <p className="text-muted text-xs leading-relaxed sm:text-sm">{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <Accordion type="single" collapsible className="space-y-3">
            {rightColumn.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="border-border/60 bg-card/40 hover:border-accent/40 rounded-xl border shadow-none backdrop-blur-xs transition-all duration-200"
              >
                <AccordionTrigger
                  headingLevel="h2"
                  className="text-foreground hover:text-accent px-4 py-3.5 text-left text-xs font-semibold transition-colors sm:px-4.5 sm:py-4 sm:text-sm"
                >
                  {faq.question}
                </AccordionTrigger>

                <AccordionContent className="border-border/30 border-t px-4 pt-3 pb-4 sm:px-4.5 sm:pt-3.5 sm:pb-4.5">
                  <p className="text-muted text-xs leading-relaxed sm:text-sm">{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ) : (
        <div className="border-border/60 bg-card/30 rounded-2xl border border-dashed p-10 text-center backdrop-blur-xs">
          <HelpCircle className="text-accent/60 mx-auto size-8 animate-pulse" aria-hidden="true" />

          <h3 className="text-foreground mt-3 text-sm font-bold tracking-tight">
            No matching questions found
          </h3>

          <p className="text-muted mx-auto mt-1.5 max-w-sm text-xs leading-relaxed">
            We couldn&apos;t find any questions matching &ldquo;{searchQuery}&rdquo;. Try another
            keyword or reset your category filters.
          </p>

          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
            className="bg-accent text-accent-foreground mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold shadow-xs transition-all duration-200 hover:opacity-90 active:scale-95"
          >
            <span>Show all questions</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default FaqInteractiveSection;
