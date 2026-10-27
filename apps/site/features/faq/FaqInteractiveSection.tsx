"use client";

import { blogGuideUrl } from "@/config/blog-guides";
import { Search, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { cn, Accordion, AccordionItem, AccordionContent, AccordionTrigger } from "@veriworkly/ui";

import { FRAME, TYPE } from "@/components/marketing/PageLayout";

import { categories, faqs } from "./data/faqItems";

const TOPICS = categories.filter((category) => category.id !== "all");

const COUNTS: Record<string, number> = Object.fromEntries(
  categories.map((category) => [
    category.id,
    category.id === "all" ? faqs.length : faqs.filter((faq) => faq.category === category.id).length,
  ]),
);

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

  const groups = useMemo(
    () =>
      TOPICS.map((topic) => ({
        ...topic,
        items: filteredFaqs.filter((faq) => faq.category === topic.id),
      })).filter((group) => group.items.length > 0),
    [filteredFaqs],
  );

  const isFiltered = searchQuery !== "" || selectedCategory !== "all";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
  };

  return (
    <section aria-label="Questions" className="py-16 lg:py-24">
      <div
        className={cn(
          FRAME,
          "grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-16",
        )}
      >
        <div className="min-w-0 space-y-6 lg:sticky lg:top-28 lg:self-start">
          <div className="bg-card focus-within:ring-accent/40 flex h-12 items-center gap-3 rounded-full px-5 transition-shadow focus-within:ring-2">
            <Search className="text-muted size-4 shrink-0" aria-hidden="true" />

            <input
              type="search"
              value={searchQuery}
              aria-label="Search frequently asked questions"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions"
              className="text-foreground placeholder:text-muted w-full min-w-0 bg-transparent text-base outline-none [&::-webkit-search-cancel-button]:hidden"
            />

            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
                className="text-muted hover:text-foreground focus-visible:ring-accent/40 -mr-2 cursor-pointer rounded-full p-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Filter questions by topic"
            className="hide-scrollbar relative -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0"
          >
            {categories.map((category) => {
              const isActive = selectedCategory === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "focus-visible:ring-accent/40 flex shrink-0 cursor-pointer items-center justify-between gap-3 rounded-full px-4 py-2.5 text-left text-base font-medium whitespace-nowrap transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98] lg:w-full lg:rounded-xl lg:px-3",
                    isActive
                      ? "bg-foreground text-background"
                      : "bg-card text-foreground hover:bg-foreground/10 lg:bg-transparent",
                  )}
                >
                  <span>{category.name}</span>
                  <span className={cn("tabular-nums", isActive ? "opacity-70" : "text-muted")}>
                    {COUNTS[category.id]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-3 text-base">
            <p className="text-muted">
              Showing{" "}
              <strong className="text-foreground font-semibold">{filteredFaqs.length}</strong> of{" "}
              {faqs.length} questions
            </p>

            {isFiltered && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-accent focus-visible:ring-accent/40 cursor-pointer rounded-full font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
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

          {groups.length > 0 ? (
            <div className="space-y-14">
              {groups.map((group) => (
                <section key={group.id} aria-labelledby={`faq-${group.id}`}>
                  <h2
                    id={`faq-${group.id}`}
                    className={cn("flex items-baseline justify-between gap-4", TYPE.title)}
                  >
                    {group.name}
                    <span className="text-muted text-base font-medium tabular-nums">
                      {group.items.length}
                    </span>
                  </h2>

                  <Accordion
                    type="single"
                    collapsible
                    className="bg-card mt-5 gap-0 overflow-hidden rounded-3xl"
                  >
                    {group.items.map((faq) => (
                      <AccordionItem
                        key={faq.id}
                        value={faq.id}
                        className="border-border rounded-none border-x-0 border-t-0 border-b bg-transparent shadow-none last:border-b-0"
                      >
                        <AccordionTrigger
                          headingLevel="h3"
                          className="hover:bg-foreground/4 px-5 py-5 text-base leading-7 font-semibold sm:px-7 sm:text-lg"
                        >
                          {faq.question}
                        </AccordionTrigger>

                        <AccordionContent className="text-foreground/80 max-w-3xl border-t-0 px-5 pt-0 pb-6 text-base leading-7 text-pretty sm:px-7">
                          <p>{faq.answer}</p>
                          {faq.readMore ? (
                            <p className="mt-3">
                              <a
                                href={blogGuideUrl(faq.readMore)}
                                className="text-accent font-medium underline-offset-4 hover:underline"
                              >
                                Read the full guide: {faq.readMore.title}
                              </a>
                            </p>
                          ) : null}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </section>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-3xl px-6 py-16 text-center sm:px-10">
              <h2 className={TYPE.title}>No matching questions</h2>

              <p className="text-muted mx-auto mt-3 max-w-md text-base leading-7">
                Nothing matches &ldquo;{searchQuery}&rdquo;
                {selectedCategory !== "all" ? " in this topic" : ""}. Try another word, or show
                every question.
              </p>

              <button
                type="button"
                onClick={resetFilters}
                className="bg-foreground text-background focus-visible:ring-accent/40 mt-8 inline-flex h-12 cursor-pointer items-center rounded-full px-6 text-base font-semibold transition-transform duration-150 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97]"
              >
                Show all questions
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default FaqInteractiveSection;
