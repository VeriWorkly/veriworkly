"use client";

import * as React from "react";

import { cn } from "../../utils";

import { Button, type ButtonSize, type ButtonVariant } from "./Button";

type MenuRenderProps = {
  close: () => void;
  menuId: string;
  open: boolean;
  toggle: () => void;
};

interface MenuProps {
  align?: "left" | "right";
  children: (props: MenuRenderProps) => React.ReactNode;
  panelClassName?: string;
  size?: "sm" | "md";
  trigger: (props: MenuRenderProps) => React.ReactNode;
}

export function Menu({
  align = "right",
  children,
  panelClassName,
  size = "md",
  trigger,
}: MenuProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const menuId = React.useId();
  const [open, setOpen] = React.useState(false);

  const close = React.useCallback(() => setOpen(false), []);
  const toggle = React.useCallback(() => setOpen((value) => !value), []);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current) {
        return;
      }

      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      {trigger({ close, menuId, open, toggle })}

      {open ? (
        <div
          aria-orientation="vertical"
          className={cn(
            "border-border bg-card absolute z-30 mt-2 border shadow-xl ring-1 ring-black/5",
            size === "sm" ? "min-w-40 rounded-xl p-1" : "min-w-44 rounded-2xl p-1.5",
            align === "right" ? "right-0" : "left-0",
            panelClassName,
          )}
          id={menuId}
          onKeyDown={(event) => {
            const items = Array.from(
              rootRef.current?.querySelectorAll<HTMLButtonElement>(
                '[role="menuitem"]:not([disabled])',
              ) ?? [],
            );

            if (!items.length) {
              return;
            }

            const activeIndex = items.findIndex((item) => item === document.activeElement);

            if (event.key === "ArrowDown") {
              event.preventDefault();
              const next = activeIndex < 0 ? 0 : (activeIndex + 1) % items.length;
              items[next]?.focus();
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              const next =
                activeIndex < 0
                  ? items.length - 1
                  : (activeIndex - 1 + items.length) % items.length;
              items[next]?.focus();
            }

            if (event.key === "Home") {
              event.preventDefault();
              items[0]?.focus();
            }

            if (event.key === "End") {
              event.preventDefault();
              items[items.length - 1]?.focus();
            }
          }}
          role="menu"
        >
          {children({ close, menuId, open, toggle })}
        </div>
      ) : null}
    </div>
  );
}

interface MenuItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
  size?: ButtonSize;
  variant?: ButtonVariant;
}

export function MenuItem({
  children,
  className,
  size = "sm",
  variant = "ghost",
  ...props
}: MenuItemProps) {
  return (
    <Button
      className={cn(
        "hover:bg-accent/10 focus-visible:bg-accent/10 h-9 w-full justify-start gap-2 rounded-xl px-3 text-sm",
        className,
      )}
      role="menuitem"
      size={size}
      variant={variant}
      {...props}
    >
      {children}
    </Button>
  );
}

export function MenuSeparator({ className }: { className?: string }) {
  return <div className={cn("bg-border my-1 h-px", className)} />;
}
