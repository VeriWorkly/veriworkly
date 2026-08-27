import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Card } from "@veriworkly/ui";

import { type Competitor } from "../../types";

interface CompetitorCardProps {
  competitor: Competitor;
}

export const CompetitorCard = ({ competitor }: CompetitorCardProps) => {
  return (
    <Link
      href={`/compare/${competitor.id}`}
      className="group block h-full outline-none"
      aria-label={`Read full comparison between VeriWorkly and ${competitor.name}`}
    >
      <Card className="border-border/60 bg-card/40 hover:border-accent/40 hover:bg-card/70 hover:shadow-accent/5 relative flex h-full flex-col justify-between overflow-hidden rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-2xl sm:p-7">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 opacity-75 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `linear-gradient(90deg, ${competitor.color}, transparent)`,
          }}
        />

        <div
          aria-hidden="true"
          style={{ backgroundColor: competitor.color }}
          className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-25"
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                aria-hidden="true"
                style={{ backgroundColor: competitor.color }}
                className="flex size-12 shrink-0 items-center justify-center rounded-2xl font-mono text-base font-bold text-white shadow-md ring-1 ring-white/20 transition-transform duration-300 ease-out group-hover:scale-105"
              >
                {competitor.initials}
              </div>

              <div>
                <span className="text-muted/80 block font-mono text-[10px] font-bold tracking-widest uppercase">
                  Alternative to
                </span>

                <h3 className="text-foreground group-hover:text-accent text-lg font-bold tracking-tight transition-colors">
                  {competitor.name}
                </h3>
              </div>
            </div>

            <span className="border-border/60 bg-muted/20 text-muted rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-medium">
              vs VeriWorkly
            </span>
          </div>

          <p className="text-muted line-clamp-3 text-xs leading-relaxed sm:text-sm">
            {competitor.positioning}
          </p>

          <div className="border-border/40 bg-background/50 space-y-2 rounded-xl border p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted text-[11px]">Pricing:</span>

              <span className="text-foreground/90 font-mono text-xs font-semibold">
                {competitor.pricingModel.split("-")[0]?.trim() || "Subscription"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted text-[11px]">Downloads:</span>
              <span className="text-foreground/90 max-w-37.5 truncate text-[11px] font-medium">
                {competitor.matrix.freeExport}
              </span>
            </div>
          </div>
        </div>

        <div className="border-border/40 mt-5 space-y-3 border-t pt-4">
          <div className="flex items-start gap-2">
            <Sparkles className="text-accent mt-0.5 size-3.5 shrink-0" aria-hidden="true" />

            <p className="text-muted line-clamp-2 text-xs leading-relaxed">
              <span className="text-foreground font-medium">Good for:</span>{" "}
              {competitor.standoutFeature}
            </p>
          </div>

          <div className="text-accent flex items-center justify-between pt-1 text-xs font-bold">
            <span>Read full comparison</span>
            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default CompetitorCard;
