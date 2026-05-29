"use client";

import type { ReactNode } from "react";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const SectionAccordion = ({
  children,
  id,
  isOpen,
  label,
  onToggle,
}: {
  children: ReactNode;
  id: string;
  isOpen: boolean;
  label: string;
  onToggle: (id: string) => void;
}) => {
  return (
    <div className="border-border bg-background/70 overflow-hidden border-b transition last:border-b-0">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between px-3 py-3 text-left text-sm font-semibold transition",
          isOpen ? "bg-card text-foreground" : "text-muted hover:bg-card hover:text-foreground",
        )}
      >
        <span className="min-w-0 truncate">{label}</span>

        <ChevronDown className={cn("h-4 w-4 shrink-0 transition", isOpen ? "rotate-180" : "")} />
      </button>

      {isOpen ? <div className="bg-card border-border/70 border-t p-3">{children}</div> : null}
    </div>
  );
};

export default SectionAccordion;
