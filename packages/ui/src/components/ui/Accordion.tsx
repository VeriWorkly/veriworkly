"use client";

import {
  type ReactNode,
  type KeyboardEvent,
  useId,
  useMemo,
  useState,
  useContext,
  useCallback,
  createContext,
} from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "../../utils";

type AccordionType = "single" | "multiple";

type AccordionContextValue = {
  type: AccordionType;
  collapsible: boolean;
  expanded: string[];
  toggleItem: (value: string) => void;
};

type AccordionItemContextValue = {
  value: string;
  triggerId: string;
  contentId: string;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);
const AccordionItemContext = createContext<AccordionItemContextValue | null>(null);

function useAccordionContext() {
  const ctx = useContext(AccordionContext);

  if (!ctx) {
    throw new Error("Accordion components must be used inside Accordion.");
  }

  return ctx;
}

function useAccordionItemContext() {
  const ctx = useContext(AccordionItemContext);

  if (!ctx) {
    throw new Error("AccordionTrigger and AccordionContent must be used inside AccordionItem.");
  }

  return ctx;
}

type AccordionProps = {
  children: ReactNode;
  className?: string;
  type?: AccordionType;
  collapsible?: boolean;
  defaultValue?: string | string[];
};

export function Accordion({
  children,
  className,
  type = "single",
  collapsible = true,
  defaultValue,
}: AccordionProps) {
  const [expanded, setExpanded] = useState<string[]>(() => {
    if (!defaultValue) {
      return [];
    }

    return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
  });

  const toggleItem = useCallback(
    (value: string) => {
      setExpanded((prev) => {
        if (type === "single") {
          return prev.includes(value) && !collapsible ? prev : [value];
        }

        if (prev.includes(value)) return prev.filter((item) => item !== value);

        return [...prev, value];
      });
    },
    [type, collapsible],
  );

  const contextValue = useMemo(
    () => ({
      type,
      collapsible,
      expanded,
      toggleItem,
    }),
    [type, collapsible, expanded, toggleItem],
  );

  return (
    <AccordionContext.Provider value={contextValue}>
      <div data-accordion-root="true" className={cn("flex flex-col gap-3", className)}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

type AccordionItemProps = {
  value: string;
  children: ReactNode;
  className?: string;
};

export function AccordionItem({ value, children, className }: AccordionItemProps) {
  const generatedId = useId();

  return (
    <AccordionItemContext.Provider
      value={{
        value,
        triggerId: `accordion-trigger-${generatedId}`,
        contentId: `accordion-content-${generatedId}`,
      }}
    >
      <div
        data-accordion-item=""
        className={cn(
          "border-border/70 bg-card/90 overflow-hidden rounded-2xl border shadow-[0_12px_35px_-28px_rgba(15,23,42,0.65)] transition-colors",
          className,
        )}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

type AccordionTriggerProps = {
  children: ReactNode;
  className?: string;
};

export function AccordionTrigger({ children, className }: AccordionTriggerProps) {
  const { value, triggerId, contentId } = useAccordionItemContext();
  const { expanded, toggleItem } = useAccordionContext();

  const isOpen = expanded.includes(value);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const root = event.currentTarget.closest('[data-accordion-root="true"]');

    if (!root) {
      return;
    }

    const triggerNodes = Array.from(
      root.querySelectorAll<HTMLButtonElement>('[data-accordion-trigger="true"]'),
    );
    const currentIndex = triggerNodes.findIndex((node) => node.id === event.currentTarget.id);

    if (currentIndex === -1) {
      return;
    }

    const focusByIndex = (nextIndex: number) => {
      const target = triggerNodes[nextIndex];

      if (!target) {
        return;
      }

      target.focus();
    };

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusByIndex((currentIndex + 1) % triggerNodes.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = currentIndex - 1 < 0 ? triggerNodes.length - 1 : currentIndex - 1;
      focusByIndex(nextIndex);
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusByIndex(0);
    }

    if (event.key === "End") {
      event.preventDefault();
      focusByIndex(triggerNodes.length - 1);
    }
  };

  return (
    <h3>
      <button
        type="button"
        id={triggerId}
        onKeyDown={onKeyDown}
        aria-expanded={isOpen}
        aria-controls={contentId}
        data-accordion-trigger="true"
        onClick={() => toggleItem(value)}
        className={cn(
          "text-foreground hover:bg-background/70 focus-visible:ring-accent/40 flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left text-base font-semibold tracking-tight transition-all focus-visible:ring-2 focus-visible:outline-none",
          className,
        )}
      >
        <span className="pr-4">{children}</span>

        <ChevronDown
          aria-hidden
          className={cn(
            "text-muted h-5 w-5 shrink-0 transition-transform duration-300",
            isOpen && "text-foreground rotate-180",
          )}
        />
      </button>
    </h3>
  );
}

type AccordionContentProps = {
  children: ReactNode;
  className?: string;
};

export function AccordionContent({ children, className }: AccordionContentProps) {
  const { value, triggerId, contentId } = useAccordionItemContext();
  const { expanded } = useAccordionContext();

  const isOpen = expanded.includes(value);

  return (
    <div
      role="region"
      id={contentId}
      aria-hidden={!isOpen}
      aria-labelledby={triggerId}
      className={cn(
        "border-border/60 grid overflow-hidden border-t px-5 transition-[grid-template-rows,padding,opacity,visibility] duration-300 ease-in-out",
        isOpen
          ? "visible grid-rows-[1fr] py-4 opacity-100"
          : "invisible grid-rows-[0fr] py-0 opacity-0",
        className,
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="text-muted text-sm leading-7">{children}</div>
      </div>
    </div>
  );
}
