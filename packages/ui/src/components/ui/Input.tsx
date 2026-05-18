import * as React from "react";

import { cn } from "../../utils";

const inputVariants = {
  outline:
    "border-border bg-background focus-visible:border-accent/40 focus-visible:ring-accent/10 hover:border-border-hover",
  filled:
    "border-transparent bg-zinc-500/10 focus-visible:bg-background focus-visible:border-accent/40 focus-visible:ring-accent/10 hover:bg-zinc-500/15",
  ghost:
    "border-transparent bg-transparent hover:bg-accent/5 focus-visible:bg-background focus-visible:border-accent/40 focus-visible:ring-accent/10",
} as const;

const inputSizes = {
  sm: "h-9 px-3 text-xs rounded-lg",
  md: "h-11 px-4 text-sm rounded-xl",
  lg: "h-12 px-5 text-base rounded-2xl",
} as const;

export type InputVariant = keyof typeof inputVariants;
export type InputSize = keyof typeof inputSizes;

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  variant?: InputVariant;
  inputSize?: InputSize;
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "outline", inputSize = "md", error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "text-foreground flex w-full border transition-all duration-200 outline-none",
          "placeholder:text-muted-foreground/40",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "focus-visible:ring-2",
          "disabled:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50",

          // Size & Variant logic
          inputSizes[inputSize],
          inputVariants[variant],

          // Error override
          error &&
            "border-destructive/50 focus-visible:border-destructive focus-visible:ring-destructive/10",

          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };
