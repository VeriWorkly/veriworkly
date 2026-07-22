import { Cpu, Database, Lock, ShieldCheck, UploadCloud, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/marketing/Reveal";

export interface PipelineStep {
  step: string;
  title: string;
  description: string;
  tags: string[];
}

const stepIcons: Record<string, LucideIcon> = {
  "01": Database,
  "02": ShieldCheck,
  "03": Cpu,
  "04": Lock,
  "05": UploadCloud,
};

const PipelineTimeline = ({ steps }: { steps: PipelineStep[] }) => {
  return (
    <div className="relative">
      <div className="absolute top-2 bottom-2 left-6.75 w-px bg-linear-to-b from-blue-500/50 via-zinc-200 to-transparent md:left-7.75 dark:via-zinc-800" />

      <div className="flex flex-col">
        {steps.map((item, idx) => {
          const Icon = stepIcons[item.step] ?? Database;
          return (
            <Reveal
              key={item.step}
              delay={idx * 0.05}
              className="group relative flex gap-6 py-8 first:pt-0 last:pb-0 md:gap-8"
            >
              <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-blue-600 shadow-[0_8px_24px_rgb(0,0,0,0.04)] transition-colors duration-300 group-hover:border-blue-500/40 md:h-16 md:w-16 dark:border-zinc-800 dark:bg-[#0c0c0c] dark:text-blue-400">
                <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-xs font-bold text-zinc-400 dark:text-zinc-600">
                    {item.step}
                  </span>
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-900 md:text-2xl dark:text-white">
                    {item.title}
                  </h2>
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-500 md:text-base dark:text-zinc-400">
                  {item.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 font-mono text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-400"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineTimeline;
