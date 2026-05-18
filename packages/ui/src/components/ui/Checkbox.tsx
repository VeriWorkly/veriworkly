"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";

import { cn } from "../../utils";

export function checkboxClassName(className?: string) {
  return cn(
    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-border bg-background transition-all duration-200 ease-in-out select-none",
    "peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 peer-focus-visible:ring-offset-2",
    "peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-foreground",
    "peer-indeterminate:border-accent peer-indeterminate:bg-accent peer-indeterminate:text-accent-foreground",
    "peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-disabled:grayscale-[0.5]",
    "active:scale-95",
    className,
  );
}

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  onCheckedChange?: (checked: boolean) => void;
  indeterminate?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      checked: controlledChecked,
      onCheckedChange,
      indeterminate,
      id,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId();

    const inputId = id || generatedId;

    const internalRef = React.useRef<HTMLInputElement>(null);
    const [internalChecked, setInternalChecked] = React.useState(controlledChecked || false);

    React.useEffect(() => {
      if (controlledChecked !== undefined) {
        setInternalChecked(controlledChecked);
      }
    }, [controlledChecked]);

    const isChecked = controlledChecked !== undefined ? controlledChecked : internalChecked;

    React.useImperativeHandle(ref, () => internalRef.current!);

    React.useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = !!indeterminate;
      }
    }, [indeterminate]);

    return (
      <label
        className={cn(
          "group flex w-fit items-center gap-3 transition-opacity",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
          className,
        )}
      >
        <div className="relative flex items-center justify-center">
          <input
            id={inputId}
            type="checkbox"
            ref={internalRef}
            checked={isChecked}
            disabled={disabled}
            onChange={(e) => {
              const nextChecked = e.target.checked;

              if (controlledChecked === undefined) {
                setInternalChecked(nextChecked);
              }

              onCheckedChange?.(nextChecked);
            }}
            className="peer sr-only"
            {...props}
          />

          <div className={checkboxClassName()}>
            {indeterminate ? (
              <Minus
                className="animate-in fade-in zoom-in-50 h-3.5 w-3.5 duration-200"
                strokeWidth={4}
              />
            ) : (
              <Check
                className={cn(
                  "h-3.5 w-3.5 transition-all duration-200 ease-in-out",
                  isChecked
                    ? "text-accent-foreground scale-100 rotate-0 opacity-100"
                    : "scale-50 -rotate-12 opacity-0",
                )}
                strokeWidth={3.5}
              />
            )}
          </div>
        </div>

        {label && (
          <span
            className={cn(
              "text-muted-foreground text-sm leading-none font-medium transition-colors duration-200 select-none",
              (isChecked || indeterminate) && "text-foreground",
              disabled && "opacity-50",
            )}
          >
            {label}
          </span>
        )}
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
