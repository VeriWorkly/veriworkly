import type { ReactNode } from "react";

import { Button, cn } from "@veriworkly/ui";
import { Card } from "@veriworkly/ui";
import { Input } from "@veriworkly/ui";

export function SectionCard({
  sectionId,
  title,
  description,
  badge,
  className,
  children,
}: {
  sectionId?: string;
  title: string;
  description: string;
  badge?: {
    text: string;
    tone?: "success" | "warning" | "neutral";
  };
  className?: string;
  children: ReactNode;
}) {
  const badgeClassName =
    badge?.tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
      : badge?.tone === "warning"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
        : "border-border/70 bg-card/70 text-muted-foreground";

  return (
    <Card
      id={sectionId}
      className={cn(
        "border-border/70 bg-card/95 scroll-mt-28 space-y-4 p-6 shadow-[0_20px_64px_-42px_rgba(15,23,42,0.55)]",
        className,
      )}
    >
      <div className="border-border/40 space-y-2 border-b pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-foreground text-base font-semibold tracking-tight">{title}</h4>
          {badge ? (
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                badgeClassName,
              )}
            >
              {badge.text}
            </span>
          ) : null}
        </div>
        <p className="text-muted text-sm">{description}</p>
      </div>
      {children}
    </Card>
  );
}

export function SectionItemCard({
  title,
  children,
  onRemove,
}: {
  title: string;
  children: ReactNode;
  onRemove: () => void;
}) {
  return (
    <div className="border-border/60 bg-card/45 hover:border-border space-y-4 rounded-2xl border p-4 shadow-[0_12px_40px_-32px_rgba(15,23,42,0.45)] transition">
      <div className="border-border/40 flex items-center justify-between gap-3 border-b pb-3">
        <p className="text-foreground text-sm font-semibold">{title}</p>
        <Button onClick={onRemove} variant="secondary" size="sm" aria-label={`Remove ${title}`}>
          Remove
        </Button>
      </div>
      {children}
    </div>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="border-border h-10 w-14 cursor-pointer rounded-lg border bg-transparent p-1"
          aria-label={`${label} picker`}
        />
        <Input
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}
