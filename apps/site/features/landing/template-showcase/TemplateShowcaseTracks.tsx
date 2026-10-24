"use client";

import { Check } from "lucide-react";
import { m } from "framer-motion";

import { useMediaQuery } from "@/hooks/use-media-query";

interface TemplateCardProps {
  name: string;
  tag: string;
  themeColor: string;
  layout: "modern" | "executive" | "minimalist" | "creative";
  canHover?: boolean;
}

const TemplateCard = ({ name, tag, themeColor, layout, canHover = true }: TemplateCardProps) => {
  return (
    <m.div
      whileHover={canHover ? { y: -10, scale: 1.03 } : {}}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      style={{ "--glow-color": themeColor } as React.CSSProperties}
      className="group relative h-90 w-65 shrink-0 overflow-hidden rounded-4xl border border-zinc-200 bg-white p-6 shadow-xs transition-shadow duration-500 hover:shadow-[0_30px_70px_-25px_var(--glow-color)] dark:border-zinc-800 dark:bg-[#0c0c0c]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--glow-color)_0%,transparent_50%)] opacity-35 transition-opacity duration-500 group-hover:opacity-50 dark:opacity-20 dark:group-hover:opacity-30" />

      <div className="relative z-10 flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-900">
        <div>
          <span className="font-mono text-[10px] tracking-widest text-zinc-400 uppercase">
            {tag}
          </span>

          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{name}</h3>
        </div>

        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Check className="h-3 w-3" strokeWidth={3} />
        </div>
      </div>

      <div className="relative z-10 mt-5 h-40 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-900 dark:bg-zinc-950/40">
        {layout === "modern" && (
          <div className="flex h-full gap-3">
            <div className="w-1/3 border-r border-zinc-200/50 pr-2 dark:border-zinc-800/50">
              <div className="h-4 w-full rounded bg-zinc-300 dark:bg-zinc-700" />

              <div className="mt-4 space-y-1.5">
                <div className="h-1.5 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-1.5 w-5/6 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-1.5 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div className="space-y-1">
                <div className="h-2 w-1/2 rounded bg-zinc-300 dark:bg-zinc-700" />
                <div className="h-1.5 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>

              <div className="space-y-1.5">
                <div className="h-1.5 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-1.5 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-1.5 w-4/5 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>
          </div>
        )}

        {layout === "executive" && (
          <div className="flex h-full flex-col justify-between">
            <div className="flex flex-col items-center space-y-1">
              <div className="h-3 w-1/3 rounded bg-zinc-300 dark:bg-zinc-700" />
              <div className="h-1.5 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>

            <div className="flex gap-4">
              <div className="flex-1 space-y-1.5">
                <div className="h-2 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-1.5 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
                <div className="h-1.5 w-5/6 rounded bg-zinc-100 dark:bg-zinc-900" />
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="h-2 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-1.5 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
                <div className="h-1.5 w-5/6 rounded bg-zinc-100 dark:bg-zinc-900" />
              </div>
            </div>
          </div>
        )}

        {layout === "minimalist" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="h-3 w-1/4 rounded bg-zinc-300 dark:bg-zinc-700" />
              <div className="h-1.5 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <div className="h-1.5 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>

              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <div className="h-1.5 w-5/6 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>

              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <div className="h-1.5 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>
          </div>
        )}

        {layout === "creative" && (
          <div className="flex h-full gap-3">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <div className="h-2 w-1/2 rounded bg-zinc-300 dark:bg-zinc-700" />
              </div>

              <div className="space-y-1.5">
                <div className="h-1.5 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-1.5 w-5/6 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-1.5 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>

            <div className="w-2 rounded-full" style={{ backgroundColor: themeColor }} />
          </div>
        )}
      </div>

      <div className="relative z-10 mt-6 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          ATS Match Rate
        </span>

        <span className="text-sm font-black text-zinc-900 dark:text-white">99%</span>
      </div>
    </m.div>
  );
};

const TemplateShowcaseTracks = () => {
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");

  return (
    <div
      className="relative flex w-full flex-col gap-6 overflow-x-hidden py-4 pb-16"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
      }}
    >
      <div className="scroll-shift flex gap-6 pl-[10%] whitespace-nowrap [--sx0:20px] [--sx1:-60px] lg:[--sx0:100px] lg:[--sx1:-700px]">
        <TemplateCard
          name="The Modernist"
          tag="ATS Standard"
          themeColor="#3b82f6"
          layout="modern"
          canHover={canHover}
        />

        <TemplateCard
          name="The Executive"
          tag="Editorial Accent"
          themeColor="#10b981"
          layout="executive"
          canHover={canHover}
        />

        <TemplateCard
          name="The Minimalist"
          tag="Austere Clean"
          themeColor="#6b7280"
          layout="minimalist"
          canHover={canHover}
        />

        <TemplateCard
          name="The Creative"
          tag="Bold Spotlight"
          themeColor="#ec4899"
          layout="creative"
          canHover={canHover}
        />

        <TemplateCard
          name="The Modernist"
          tag="ATS Standard"
          themeColor="#3b82f6"
          layout="modern"
          canHover={canHover}
        />

        <TemplateCard
          name="The Executive"
          tag="Editorial Accent"
          themeColor="#10b981"
          layout="executive"
          canHover={canHover}
        />
      </div>

      <div className="scroll-shift flex gap-6 pl-[5%] whitespace-nowrap [--sx0:-60px] [--sx1:20px] lg:[--sx0:-700px] lg:[--sx1:100px]">
        <TemplateCard
          name="The Creative"
          tag="Bold Spotlight"
          themeColor="#ec4899"
          layout="creative"
          canHover={canHover}
        />

        <TemplateCard
          name="The Minimalist"
          tag="Austere Clean"
          themeColor="#6b7280"
          layout="minimalist"
          canHover={canHover}
        />

        <TemplateCard
          name="The Executive"
          tag="Editorial Accent"
          themeColor="#10b981"
          layout="executive"
          canHover={canHover}
        />

        <TemplateCard
          name="The Modernist"
          tag="ATS Standard"
          themeColor="#3b82f6"
          layout="modern"
          canHover={canHover}
        />

        <TemplateCard
          name="The Creative"
          tag="Bold Spotlight"
          themeColor="#ec4899"
          layout="creative"
          canHover={canHover}
        />

        <TemplateCard
          name="The Minimalist"
          tag="Austere Clean"
          themeColor="#6b7280"
          layout="minimalist"
          canHover={canHover}
        />
      </div>
    </div>
  );
};

export default TemplateShowcaseTracks;
