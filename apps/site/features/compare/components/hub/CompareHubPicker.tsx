"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

import { COMPETITORS } from "../../data";
import CompareScoreboard from "../shared/CompareScoreboard";

export const CompareHubPicker = () => {
  const [index, setIndex] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const selected = COMPETITORS[index]!;

  const select = (next: number) => {
    const wrapped = (next + COMPETITORS.length) % COMPETITORS.length;
    setIndex(wrapped);
    tabs.current[wrapped]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowRight: index + 1,
      ArrowUp: index - 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: COMPETITORS.length - 1,
    };

    if (event.key in moves) {
      event.preventDefault();
      select(moves[event.key]!);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[.55fr_1.45fr] lg:gap-10">
      <div
        role="tablist"
        aria-label="Choose a resume builder to compare"
        aria-orientation="vertical"
        onKeyDown={onKeyDown}
        className="hide-scrollbar relative -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0"
      >
        {COMPETITORS.map((competitor, i) => {
          const active = i === index;

          return (
            <button
              key={competitor.id}
              ref={(node) => {
                tabs.current[i] = node;
              }}
              type="button"
              role="tab"
              id={`compare-tab-${competitor.id}`}
              aria-selected={active}
              aria-controls="compare-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => setIndex(i)}
              className={`focus-visible:ring-accent/40 flex shrink-0 cursor-pointer items-center justify-between gap-4 rounded-2xl px-5 py-3 text-left text-lg font-bold tracking-tight transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98] lg:py-3.5 lg:text-xl ${
                active ? "bg-foreground text-background" : "text-muted hover:text-foreground"
              }`}
            >
              <span>
                <span className="sr-only">VeriWorkly vs </span>
                {competitor.name}
              </span>
              <ArrowRight
                aria-hidden="true"
                className={`hidden size-5 transition-opacity duration-200 lg:block ${
                  active ? "opacity-100" : "opacity-0"
                }`}
              />
            </button>
          );
        })}
      </div>

      <div
        id="compare-panel"
        role="tabpanel"
        aria-labelledby={`compare-tab-${selected.id}`}
        aria-live="polite"
      >
        <CompareScoreboard competitor={selected} headingLevel="h3" />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-muted max-w-xl text-base leading-7">{selected.positioning}</p>
          <Link
            href={`/compare/${selected.id}`}
            className="group text-accent focus-visible:ring-accent/40 inline-flex shrink-0 items-center gap-2 rounded-full text-base font-semibold focus-visible:ring-2 focus-visible:outline-none"
          >
            Full {selected.name} comparison
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:translate-x-1"
            />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CompareHubPicker;
