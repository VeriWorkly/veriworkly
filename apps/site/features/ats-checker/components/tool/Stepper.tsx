"use client";

import { Check } from "lucide-react";

interface StepperProps {
  steps: string[];
  current: number;
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <nav aria-label="Scan progress">
      <ol className="flex items-center gap-2 sm:gap-3">
        {steps.map((label, index) => {
          const state = index < current ? "done" : index === current ? "active" : "upcoming";
          return (
            <li key={label} className="flex flex-1 items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    state === "done"
                      ? "bg-blue-600 text-white"
                      : state === "active"
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                        : "bg-zinc-100 text-zinc-600 dark:bg-white/5 dark:text-zinc-400"
                  }`}
                  aria-hidden="true"
                >
                  {state === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                </span>
                <span
                  aria-current={state === "active" ? "step" : undefined}
                  className={`hidden text-sm font-semibold sm:inline ${
                    state === "upcoming"
                      ? "text-zinc-500 dark:text-zinc-400"
                      : "text-zinc-900 dark:text-white"
                  }`}
                >
                  {label}
                  <span className="sr-only">
                    {state === "done"
                      ? " (completed)"
                      : state === "active"
                        ? " (current step)"
                        : ""}
                  </span>
                </span>
              </div>
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={`h-px flex-1 transition-colors ${
                    state === "done" ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-800"
                  }`}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Stepper;
