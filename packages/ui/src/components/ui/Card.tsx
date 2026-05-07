import * as React from "react";

import { cn } from "../../utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
}

export function Card({ className, as: Component = "div", ...props }: CardProps) {
  return (
    <Component
      className={cn(
        "bg-card text-foreground overflow-hidden rounded-3xl border border-zinc-200/50 shadow-sm p-5",
        className,
      )}
      {...props}
    />
  );
}
