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

/**
 * Elements drift toward the pointer. The frame loop runs only while something is still
 * moving: a mousemove starts it, and it stops once every element has settled. It used to be
 * a framer useAnimationFrame that ran every frame for the life of the page, plus window
 * mousemove/touchmove listeners that read layout on each event (W-035). Touch input never
 * drove anything useful here, so it no longer registers a listener.
 */
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
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

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

    const onMove = (event: MouseEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (!frame) frame = requestAnimationFrame(step);
    };

    window.addEventListener("mousemove", onMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
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
