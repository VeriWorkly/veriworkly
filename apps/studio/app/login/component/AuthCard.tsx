import { ReactNode } from "react";

import { Card } from "@veriworkly/ui";

import { cn } from "@/lib/utils";

interface AuthCardProps {
  children: ReactNode;
  className?: string;
  blurPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

const AuthCard = ({ children, className, blurPosition = "top-left" }: AuthCardProps) => {
  const blurClasses = {
    "top-left": "-top-24 -left-20",
    "top-right": "-top-24 -right-20",
    "bottom-left": "-bottom-24 -left-20",
    "bottom-right": "-bottom-24 -right-20",
  };

  return (
    <Card
      className={cn(
        "bg-card/85 relative flex min-h-140 flex-col overflow-hidden rounded-4xl border border-white/20 p-8 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-all duration-300 lg:h-full lg:min-h-0 dark:border-white/5 dark:shadow-[0_35px_100px_-25px_rgba(0,0,0,0.7)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-4xl border border-white/10 dark:border-white/5" />

      <div
        className={cn(
          "bg-accent/15 pointer-events-none absolute h-60 w-60 rounded-full blur-3xl transition-opacity duration-500",
          blurClasses[blurPosition],
        )}
      />

      <div className="relative flex h-full grow flex-col justify-between gap-6">{children}</div>
    </Card>
  );
};

export default AuthCard;
