"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { cn } from "@veriworkly/ui";

export type LandingButtonVariant = "primary" | "glass" | "solid" | "outline" | "ghost";
export type LandingButtonSize = "hero" | "lg" | "md" | "sm";

export interface LandingButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  href?: string;
  external?: boolean;
  variant?: LandingButtonVariant;
  size?: LandingButtonSize;
  className?: string;
  icon?: LucideIcon;
  showArrow?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

const variantStyles: Record<LandingButtonVariant, string> = {
  primary:
    "group relative border border-blue-500/40 bg-[#0A0A0A] text-white shadow-[0_0_24px_rgba(59,130,246,0.18)] transition-all duration-200 ease-out hover:border-blue-400 hover:shadow-[0_0_36px_rgba(59,130,246,0.35)]",
  glass:
    "border border-black/10 bg-white/70 text-zinc-800 backdrop-blur-md transition-colors duration-200 ease-out hover:border-blue-500/30 hover:text-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:text-blue-400",
  solid:
    "bg-zinc-950 text-white shadow-sm transition-all duration-200 ease-out hover:bg-blue-600 dark:bg-white dark:text-zinc-950 dark:hover:bg-blue-500 dark:hover:text-white",
  outline:
    "border border-zinc-200 bg-transparent text-zinc-800 transition-colors duration-200 ease-out hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900",
  ghost:
    "bg-transparent text-zinc-600 transition-colors duration-200 ease-out hover:bg-black/5 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white",
};

const sizeStyles: Record<LandingButtonSize, string> = {
  hero: "h-12 px-7 text-sm sm:h-13 sm:px-8 sm:text-base lg:h-13.5 lg:px-9",
  lg: "h-11.5 px-6 text-sm sm:h-12 sm:px-7 sm:text-base",
  md: "h-10 px-5 text-xs sm:h-11 sm:px-6 sm:text-sm",
  sm: "h-8.5 px-3.5 text-xs sm:h-9 sm:px-4",
};

export const LandingButton = React.forwardRef<
  HTMLAnchorElement | HTMLButtonElement,
  LandingButtonProps
>(
  (
    {
      children,
      href,
      external,
      variant = "primary",
      size = "md",
      className,
      target,
      rel,
      icon: Icon,
      showArrow = false,
      disabled = false,
      onClick,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const combinedClassName = cn(
      "inline-flex items-center justify-center gap-2 rounded-full font-medium select-none cursor-pointer active:scale-[0.97] transition-transform",
      variantStyles[variant],
      sizeStyles[size],
      disabled && "pointer-events-none opacity-50 cursor-not-allowed",
      className,
    );

    const content = (
      <>
        {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}

        <span>{children}</span>

        {showArrow && (
          <ArrowRight
            aria-hidden="true"
            className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
          />
        )}
      </>
    );

    if (href) {
      const isInternal =
        !external && href.startsWith("/") && !href.startsWith("//") && target !== "_blank";

      if (isInternal) {
        return (
          <Link
            href={href}
            aria-disabled={disabled}
            className={combinedClassName}
            ref={ref as React.Ref<HTMLAnchorElement>}
            onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
            {...props}
          >
            {content}
          </Link>
        );
      }

      return (
        <a
          href={href}
          target={target}
          aria-disabled={disabled}
          className={combinedClassName}
          ref={ref as React.Ref<HTMLAnchorElement>}
          onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
          rel={target === "_blank" ? (rel ?? "noopener noreferrer") : rel}
          {...props}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        type={type}
        disabled={disabled}
        className={combinedClassName}
        ref={ref as React.Ref<HTMLButtonElement>}
        onClick={onClick as unknown as React.MouseEventHandler<HTMLButtonElement>}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {content}
      </button>
    );
  },
);

LandingButton.displayName = "LandingButton";

export default LandingButton;
