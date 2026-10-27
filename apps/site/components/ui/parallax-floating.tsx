"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useId, useRef } from "react";

import { cn } from "@veriworkly/ui";

interface FloatingContextType {
  registerElement: (id: string, element: HTMLDivElement, depth: number) => void;
  unregisterElement: (id: string) => void;
}

const FloatingContext = createContext<FloatingContextType | null>(null);

interface FloatingProps {
  children: ReactNode;
  className?: string;
  sensitivity?: number;
  easingFactor?: number;
}

/** The frame loop runs only while something is still moving, not for the life of the page. */
const Floating = ({
  children,
  className,
  sensitivity = 1,
  easingFactor = 0.05,
  ...props
}: FloatingProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsMap = useRef(
    new Map<string, { element: HTMLDivElement; depth: number; x: number; y: number }>(),
  );

  const registerElement = useCallback((id: string, element: HTMLDivElement, depth: number) => {
    elementsMap.current.set(id, { element, depth, x: 0, y: 0 });
  }, []);

  const unregisterElement = useCallback((id: string) => {
    elementsMap.current.delete(id);
  }, []);

  useEffect(() => {
    // A mouse only: on phones every scroll gesture would run a layout read and move blurred cards.
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reducedMotion) return;

    const pointer = { x: 0, y: 0 };
    let frame = 0;

    const step = () => {
      const container = containerRef.current;
      frame = 0;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const targetX = pointer.x - rect.left - rect.width / 2;
      const targetY = pointer.y - rect.top - rect.height / 2;
      let moving = false;

      elementsMap.current.forEach((data) => {
        const strength = (data.depth * sensitivity) / 20;
        const dx = targetX * strength - data.x;
        const dy = targetY * strength - data.y;

        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) moving = true;

        data.x += dx * easingFactor;
        data.y += dy * easingFactor;
        data.element.style.transform = `translate3d(${data.x}px, ${data.y}px, 0)`;
      });

      if (moving) frame = requestAnimationFrame(step);
    };

    const moveTo = (x: number, y: number) => {
      pointer.x = x;
      pointer.y = y;
      if (!frame) frame = requestAnimationFrame(step);
    };
    const onMouse = (event: MouseEvent) => moveTo(event.clientX, event.clientY);

    window.addEventListener("mousemove", onMouse, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMouse);
      cancelAnimationFrame(frame);
    };
  }, [sensitivity, easingFactor]);

  return (
    <FloatingContext.Provider value={{ registerElement, unregisterElement }}>
      <div
        ref={containerRef}
        className={cn("absolute top-0 left-0 h-full w-full", className)}
        {...props}
      >
        {children}
      </div>
    </FloatingContext.Provider>
  );
};

export default Floating;

interface FloatingElementProps {
  children: ReactNode;
  className?: string;
  depth?: number;
}

export const FloatingElement = ({ children, className, depth = 1 }: FloatingElementProps) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const context = useContext(FloatingContext);

  useEffect(() => {
    if (!elementRef.current || !context) return;

    context.registerElement(id, elementRef.current, depth ?? 0.01);
    return () => context.unregisterElement(id);
  }, [depth, context, id]);

  return (
    <div ref={elementRef} className={cn("absolute will-change-transform", className)}>
      {children}
    </div>
  );
};
