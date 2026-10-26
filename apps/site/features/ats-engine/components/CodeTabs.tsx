"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpRight } from "lucide-react";

import { siteConfig } from "@/config/site";
import { TYPE } from "@/components/marketing/PageLayout";
import { INSTALL_COMMAND, SURFACES as surfaces } from "../data/content";
import { CopyCommand } from "./CopyCommand";

/** Reads its data itself: the surfaces carry icon components, which cannot be passed from a server component. */
export function CodeTabs() {
  const [activeId, setActiveId] = useState(surfaces[0]?.id);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = surfaces.find((surface) => surface.id === activeId) ?? surfaces[0];

  if (!active) return null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = surfaces.findIndex((surface) => surface.id === active.id);
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;

    event.preventDefault();
    const next = (index + step + surfaces.length) % surfaces.length;
    setActiveId(surfaces[next]!.id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Ways to run the engine"
        onKeyDown={onKeyDown}
        className="bg-background inline-flex max-w-full flex-wrap gap-1 rounded-3xl p-1 sm:rounded-full"
      >
        {surfaces.map((surface, index) => {
          const Icon = surface.icon;
          const selected = surface.id === active.id;

          return (
            <button
              key={surface.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`surface-tab-${surface.id}`}
              aria-selected={selected}
              aria-controls={`surface-panel-${surface.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(surface.id)}
              className={`focus-visible:ring-accent/40 inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none ${
                selected ? "bg-foreground text-background" : "text-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {surface.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`surface-panel-${active.id}`}
        aria-labelledby={`surface-tab-${active.id}`}
        className="mt-10 grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-12"
      >
        <div className="min-w-0">
          <h3 className={TYPE.title}>{active.title}</h3>
          <p className="text-muted mt-4 max-w-md text-base leading-7">{active.body}</p>
          <a
            href={`${siteConfig.links.docs}${active.docsPath}`}
            className="group text-accent mt-6 inline-flex items-center gap-1.5 text-base font-semibold"
          >
            Read the {active.label} guide
            <ArrowUpRight
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </a>
          {active.id === "library" ? (
            <div className="mt-8">
              <CopyCommand command={INSTALL_COMMAND} className="bg-background" />
            </div>
          ) : null}
        </div>

        <pre
          data-ui
          tabIndex={0}
          aria-label={`${active.label} example`}
          className="bg-foreground text-background focus-visible:ring-accent/40 min-h-56 min-w-0 self-start overflow-x-auto rounded-3xl p-6 font-mono text-sm leading-relaxed focus-visible:ring-2 focus-visible:outline-none sm:p-8"
        >
          <code>{active.code}</code>
        </pre>
      </div>
    </div>
  );
}
