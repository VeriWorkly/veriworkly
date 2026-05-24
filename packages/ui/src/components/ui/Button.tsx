import * as React from "react";

import { cn } from "../../utils";
import { Loader2 } from "lucide-react";

type ChildWithProps = {
  className?: string;
  [key: string]: unknown;
};

const buttonVariants = {
  primary: "bg-accent text-accent-foreground shadow-sm hover:opacity-90",
  secondary: "bg-card text-foreground ring-1 ring-inset ring-border hover:bg-background",
  ghost: "bg-transparent text-foreground hover:bg-card",
} as const;

const buttonSizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

export function buttonClassName(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
    buttonVariants[variant],
    buttonSizes[size],
    className,
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;

  /** Render as different element (e.g. Link) */
  asChild?: boolean;

  /** Loading state */
  loading?: boolean;

  /** Loading text */
  loadingText?: string;
}

export const Button = ({
  className,
  size = "md",
  variant = "primary",
  type = "button",
  asChild = false,
  loading = false,
  loadingText = "Loading...",
  disabled,
  children,
  ...props
}: ButtonProps) => {
  const isDisabled = disabled || loading;

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<ChildWithProps>;

    return React.cloneElement(child, {
      className: buttonClassName(variant, size, child.props.className),
      "aria-disabled": isDisabled,
      "data-disabled": isDisabled ? "" : undefined,
      ...props,
    });
  }

  return (
    <button
      className={buttonClassName(variant, size, className)}
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      data-disabled={isDisabled ? "" : undefined}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{loadingText}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};
