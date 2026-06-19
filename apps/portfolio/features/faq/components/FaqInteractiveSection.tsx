"use client";

import { Search, X, HelpCircle } from "lucide-react";
import { useState, useMemo, useDeferredValue } from "react";

import { categories, faqs } from "../constants";

import FaqAccordionItem from "./FaqAccordionItem";

interface FaqInteractiveSectionProps {
  sidebar?: React.ReactNode;
}

const FaqInteractiveSection = ({ sidebar }: FaqInteractiveSectionProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [openId, setOpenId] = useState<string | null>("diff");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

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

  return (
    <>
      <div className="border-line mb-16 border-b pb-12">
        <div className="max-w-3xl">
          <p className="border-line bg-panel/60 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold tracking-[0.12em] uppercase backdrop-blur-sm">
            <HelpCircle className="text-accent size-3.5 animate-pulse" /> Support Portal
          </p>

          <h1 className="text-ink mt-6 text-[clamp(2.8rem,7vw,5.5rem)] leading-none font-bold tracking-tighter">
            <span className="sr-only">VeriWorkly Portfolio FAQ: </span>
            Common questions. <br />
            <span className="text-accent">Clear answers.</span>
          </h1>

          <p className="text-ink/75 mt-6 max-w-xl text-base leading-7">
            Can&apos;t find what you are looking for? Filter questions by category or use the
            instant search below to find solutions.
          </p>
        </div>

        <div className="mt-10 max-w-xl">
          <div className="bg-panel/75 border-line focus-within:border-accent relative flex items-center rounded-2xl border px-4 py-3.5 backdrop-blur-sm transition-all duration-300 focus-within:shadow-[0_8px_30px_rgba(37,99,235,0.06)]">
            <Search className="text-muted/60 mr-3 size-5 shrink-0" />

            <input
              type="text"
              value={searchQuery}
              placeholder="Search questions or answers..."
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-ink placeholder:text-muted/50 w-full bg-transparent text-sm font-bold outline-none"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="cursor-pointer rounded-full p-1 transition hover:bg-black/5 dark:hover:bg-white/5"
              >
                <X className="text-muted size-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2.5">
          {categories.map((cat) => {
            const CatIcon = cat.icon;
            const isActive = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setOpenId(null);
                }}
                className={`flex cursor-pointer items-center gap-2 rounded-full px-4.5 py-2.5 text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${
                  isActive
                    ? "bg-accent text-white shadow-[0_8px_16px_rgba(37,99,235,0.15)]"
                    : "bg-panel border-line hover:border-line-strong text-ink/80 hover:text-ink border shadow-sm"
                }`}
              >
                <CatIcon className="size-3.5" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid items-start gap-12 lg:grid-cols-[380px_1fr]">
        {sidebar}

        <div className="space-y-4">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => (
              <FaqAccordionItem
                id={faq.id}
                key={faq.id}
                answer={faq.answer}
                question={faq.question}
                isOpen={openId === faq.id}
                onToggle={() => toggle(faq.id)}
              />
            ))
          ) : (
            <div className="border-line bg-panel/40 rounded-2xl border border-dashed p-12 text-center">
              <HelpCircle className="text-muted/40 mx-auto size-12 animate-bounce" />

              <h3 className="text-ink mt-4 text-base font-bold">
                No questions matched your search
              </h3>

              <p className="text-muted mx-auto mt-2 max-w-sm text-xs">
                Try using broader keywords or select a specific category from the tabs above.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="border-line hover:bg-panel text-ink mt-5 inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border px-5 text-xs font-bold transition"
              >
                Clear Filter
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FaqInteractiveSection;
