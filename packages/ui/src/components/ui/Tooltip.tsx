"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "../../utils";

export interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  delay?: number;
  onlyShowIfTruncated?: boolean;
}

export function Tooltip({
  children,
  content,
  className,
  side = "top",
  delay = 200,
  onlyShowIfTruncated = false,
}: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0, height: 0 });

  const triggerRef = React.useRef<HTMLDivElement>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    return () => setMounted(false);
  }, []);

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();

    setCoords({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }, []);

  const show = React.useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (onlyShowIfTruncated && triggerRef.current) {
      const child = triggerRef.current.firstElementChild as HTMLElement;

      if (child) {
        const isTruncated =
          child.scrollHeight > child.clientHeight || child.scrollWidth > child.clientWidth;

        if (!isTruncated) return;
      }
    }

    updatePosition();

    timeoutRef.current = setTimeout(() => {
      setOpen(true);
    }, delay);
  }, [delay, updatePosition, onlyShowIfTruncated]);

  const hide = React.useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setOpen(false);
  }, []);

  React.useEffect(() => {
    if (open) {
      const handleEvent = () => hide();

      window.addEventListener("scroll", handleEvent, true);
      window.addEventListener("resize", handleEvent);

      return () => {
        window.removeEventListener("scroll", handleEvent, true);
        window.removeEventListener("resize", handleEvent);
      };
    }
  }, [open, hide]);

  const sideClasses = {
    top: "-translate-x-1/2 -translate-y-full mt-[-10px]",
    bottom: "-translate-x-1/2 mt-[10px]",
    left: "-translate-x-full -translate-y-1/2 ml-[-10px]",
    right: "ml-[10px] -translate-y-1/2",
  };

  const getStyle = (): React.CSSProperties => {
    if (!coords.width) return { display: "none" };

    const style: React.CSSProperties = {
      position: "fixed",
      zIndex: 9999,
      pointerEvents: "none",
    };

    if (side === "top") {
      style.top = coords.top;
      style.left = coords.left + coords.width / 2;
    } else if (side === "bottom") {
      style.top = coords.top + coords.height;
      style.left = coords.left + coords.width / 2;
    } else if (side === "left") {
      style.top = coords.top + coords.height / 2;
      style.left = coords.left;
    } else if (side === "right") {
      style.top = coords.top + coords.height / 2;
      style.left = coords.left + coords.width;
    }

    return style;
  };

  return (
    <>
      <div
        onBlur={hide}
        onFocus={show}
        ref={triggerRef}
        onMouseLeave={hide}
        onMouseEnter={show}
        className="block w-full"
        onClick={(e) => {
          e.stopPropagation();
          if (open) hide();
          else show();
        }}
      >
        {children}
      </div>

      {mounted &&
        open &&
        createPortal(
          <div
            style={getStyle()}
            className={cn(
              "animate-in fade-in zoom-in-95 slide-in-from-top-1 fill-mode-both duration-200",
              sideClasses[side],
              className,
            )}
          >
            <div
              className={cn(
                "rounded-2xl px-4 py-2.5 text-[12px] font-medium shadow-[0_10px_40px_rgba(0,0,0,0.2)] backdrop-blur-2xl",
                "border border-white/10 bg-zinc-950/90 text-zinc-50",
                "dark:border-black/5 dark:bg-white/95 dark:text-zinc-950",
                "max-w-[280px] text-center leading-relaxed wrap-break-word whitespace-normal",
              )}
            >
              {content}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
