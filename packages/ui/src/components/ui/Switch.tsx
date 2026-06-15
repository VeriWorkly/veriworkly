"use client";

import * as React from "react";

import { cn } from "../../utils";

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, disabled, id, ...props }, ref) => {
    const generatedId = React.useId();
    const switchId = id || generatedId;

    return (
      <label
        htmlFor={switchId}
        className={cn(
          "focus-within:ring-accent focus-within:ring-offset-background relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus-within:ring-2 focus-within:ring-offset-2",
          checked ? "bg-accent" : "bg-muted/80",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <input
          ref={ref}
          id={switchId}
          type="checkbox"
          checked={checked}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => onCheckedChange(e.target.checked)}
          {...props}
        />

        <span
          className={cn(
            "bg-background pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform duration-200 ease-in-out",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </label>
    );
  },
);

Switch.displayName = "Switch";
