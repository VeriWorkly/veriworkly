"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { COMPETITORS } from "../../data";

import { siteConfig } from "@/config/site";

export const CompareHubHero = () => {
  const [selectedId, setSelectedId] = useState<string>("rezi");
  const selected = COMPETITORS.find((c) => c.id === selectedId) || COMPETITORS[0]!;

  return (
    <div className="border-border/40 relative flex flex-col gap-10 border-b pb-16">
      <div
        aria-hidden="true"
        style={{ backgroundColor: selected.color }}
        className="pointer-events-none absolute -top-10 right-0 size-96 rounded-full opacity-15 blur-[120px] transition-all duration-700"
      />
      <div className="bg-accent/10 pointer-events-none absolute top-1/2 left-0 size-80 -translate-y-1/2 rounded-full blur-[100px]" />

      <div className="max-w-5xl space-y-5">
        <div className="border-border/80 bg-card/60 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs backdrop-blur-md">
          <span className="bg-accent h-2 w-2 animate-pulse rounded-full" />

          <span className="text-foreground font-mono text-[10px] font-bold tracking-widest uppercase">
            Honest Comparisons
          </span>

          <span className="text-muted/60 font-mono text-[10px]">|</span>

          <span className="text-muted text-[11px]">6 Major Resume Builders</span>
        </div>

        <h1 className="text-foreground text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.02] font-bold tracking-tight text-balance">
          See How VeriWorkly Compares to Other Resume Builders
        </h1>

        <p className="text-muted max-w-3xl text-base leading-relaxed sm:text-lg">
          Looking for the right resume tool? Here is an honest, straightforward look at how
          VeriWorkly stacks up against Rezi, Teal, Kickresume, Novoresume, Zety, and Enhancv,
          covering real pricing, download limits, ATS checks, and data privacy.
        </p>
      </div>

      <div className="space-y-4">
        <span className="text-muted block font-mono text-[10px] font-bold tracking-widest uppercase">
          Click any builder to see a quick side-by-side snapshot:
        </span>

        <div
          role="tablist"
          aria-label="Resume builder comparisons"
          className="flex flex-wrap gap-2 sm:gap-3"
        >
          {COMPETITORS.map((comp) => {
            const isSelected = comp.id === selected.id;
            return (
              <button
                role="tab"
                key={comp.id}
                type="button"
                aria-selected={isSelected}
                onClick={() => setSelectedId(comp.id)}
                aria-label={`View comparison with ${comp.name}`}
                className={`group flex cursor-pointer items-center gap-2.5 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                  isSelected
                    ? "bg-foreground text-background ring-foreground/20 scale-[1.02] shadow-md ring-2"
                    : "border-border/60 bg-card/60 text-muted hover:text-foreground hover:border-border hover:bg-card/90 border"
                }`}
              >
                <span
                  aria-hidden="true"
                  style={{ backgroundColor: comp.color }}
                  className="flex size-5 items-center justify-center rounded-full font-mono text-[9px] font-bold text-white transition-transform group-hover:scale-110"
                >
                  {comp.initials}
                </span>
                <span>{comp.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-border/60 bg-card/50 relative overflow-hidden rounded-3xl border p-6 shadow-xl backdrop-blur-md transition-all duration-500 sm:p-8">
        <div
          aria-hidden="true"
          style={{ backgroundColor: selected.color }}
          className="pointer-events-none absolute top-0 right-0 size-64 rounded-full opacity-10 blur-3xl transition-all duration-700"
        />

        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="space-y-4 lg:col-span-7">
            <div className="flex items-center gap-3">
              <div className="border-border/80 bg-background/80 flex items-center gap-2 rounded-xl border px-3 py-1.5 shadow-xs">
                <Image src="/veriworkly-logo.png" alt="VeriWorkly" width={20} height={20} />
                <span className="text-foreground text-xs font-bold">VeriWorkly</span>
              </div>

              <span className="text-muted/60 font-mono text-xs font-bold uppercase">vs</span>

              <div className="border-border/80 bg-background/80 flex items-center gap-2 rounded-xl border px-3 py-1.5 shadow-xs">
                <span
                  style={{ backgroundColor: selected.color }}
                  className="flex size-5 items-center justify-center rounded-md font-mono text-[9px] font-bold text-white"
                >
                  {selected.initials}
                </span>

                <span className="text-foreground text-xs font-bold">{selected.name}</span>
              </div>
            </div>

            <h3 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
              VeriWorkly vs {selected.name}
            </h3>

            <p className="text-muted text-xs leading-relaxed sm:text-sm">{selected.verdict}</p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href={`/compare/${selected.id}`}
                className="bg-foreground text-background hover:bg-foreground/90 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold shadow-sm transition-all duration-200 active:scale-95"
              >
                <span>Read full {selected.name} comparison</span>
                <ArrowRight className="size-3.5" />
              </Link>

              <Link
                href={siteConfig.links.app}
                className="border-border/80 bg-background/60 text-foreground hover:bg-card inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-xs font-semibold transition-all duration-200 active:scale-95"
              >
                <span>Try VeriWorkly Free</span>
              </Link>
            </div>
          </div>

          <div className="border-border/50 bg-background/60 space-y-3 rounded-2xl border p-5 backdrop-blur-xs lg:col-span-5">
            <span className="text-muted block font-mono text-[10px] font-bold tracking-widest uppercase">
              Quick Highlights
            </span>

            <div className="space-y-2 text-xs">
              <div className="border-border/40 flex items-center justify-between border-b pb-2">
                <span className="text-muted">Monthly Price</span>

                <div className="flex items-center gap-2 font-mono font-medium">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">$0 Free</span>
                  <span className="text-muted/40">vs</span>
                  <span className="text-muted">{selected.pricingModel.split("-")[0]?.trim()}</span>
                </div>
              </div>

              <div className="border-border/40 flex items-center justify-between border-b pb-2">
                <span className="text-muted">Sign-Up Required</span>

                <div className="flex items-center gap-2 font-medium">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    No login needed
                  </span>

                  <span className="text-muted/40 font-mono">vs</span>
                  <span className="text-destructive/90">Sign-up required</span>
                </div>
              </div>

              <div className="border-border/40 flex items-center justify-between border-b pb-2">
                <span className="text-muted">Free Downloads</span>

                <div className="flex items-center gap-2 font-medium">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Unlimited
                  </span>

                  <span className="text-muted/40 font-mono">vs</span>

                  <span className="text-muted max-w-35 truncate">
                    {selected.id === "rezi" && "3 downloads only"}
                    {selected.id === "teal" && "Unlimited PDF"}
                    {selected.id === "kickresume" && "Limited styling"}
                    {selected.id === "novoresume" && "1-page PDF only"}
                    {selected.id === "zety" && "Plain text only"}
                    {selected.id === "enhancv" && "Watermarked"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <span className="text-muted">ATS Resume Check</span>

                <div className="flex items-center gap-2 font-medium">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Matches target job post
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompareHubHero;
