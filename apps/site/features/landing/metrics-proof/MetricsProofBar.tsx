import { EyeOff, KeyRound, ShieldCheck, Target, type LucideIcon } from "lucide-react";

interface Stat {
  icon: LucideIcon;
  value: number;
  decimals: number;
  suffix: string;
  label: string;
  detail: string;
}

/**
 * Every figure here has to be something we can point at.
 *
 * Removed: a "99.9%" ATS figure that nothing measures and that read as a parse-rate
 * guarantee, and two counters that animated *down* from 80 and 10 - start values
 * chosen for the animation, with no meaning, rendered into the SSR markup.
 *
 * What is left is countable: six export formats, four portfolio templates, zero
 * cost to export, zero accounts needed to start.
 */
const stats: Stat[] = [
  {
    icon: ShieldCheck,
    value: 0,
    decimals: 0,
    suffix: "",
    label: "Accounts Needed to Start",
    detail: "Open the editor and start writing. Sign up only when you want sync or publishing.",
  },

  {
    icon: EyeOff,
    value: 0,
    decimals: 0,
    suffix: "",
    label: "Cost to Export",
    detail: "Every format is free and ungated, with no watermark on your documents.",
  },

  {
    icon: Target,
    value: 6,
    decimals: 0,
    suffix: "",
    label: "Export Formats",
    detail: "PDF, Word (DOCX), Markdown, HTML, plain text, and JSON.",
  },

  {
    icon: KeyRound,
    value: 4,
    decimals: 0,
    suffix: "",
    label: "Portfolio Templates",
    detail: "Signal and Atelier free, Nimbus and Cipher with a paid plan.",
  },
];

const MetricsProofBar = () => {
  return (
    <section className="relative w-full overflow-hidden border-y border-zinc-800/60 bg-zinc-950 py-16 md:py-20">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(120,119,198,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,119,198,0.06)_1px,transparent_1px)] mask-[radial-gradient(ellipse_70%_60%_at_50%_50%,#000_60%,transparent_100%)] bg-size-[28px_28px]" />

      <div className="pointer-events-none absolute top-1/2 left-1/2 h-125 w-125 -translate-x-1/2 -translate-y-1/2 rounded-full bg-radial from-blue-500/10 to-transparent to-70%" />

      <div className="relative z-10 mx-auto max-w-350 px-6 md:px-8">
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 md:gap-x-8 md:divide-x md:divide-zinc-800/60 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="reveal flex flex-col gap-3 md:px-8 md:first:pl-0 md:last:pr-0"
            >
              <stat.icon className="h-5 w-5 text-blue-400" strokeWidth={1.5} />

              <div className="font-sans text-4xl font-semibold tracking-tighter text-white md:text-5xl">
                <span className="tabular-nums">
                  {stat.value.toFixed(stat.decimals)}
                  {stat.suffix}
                </span>
              </div>

              <div>
                <p className="text-sm font-semibold text-zinc-200">{stat.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{stat.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MetricsProofBar;
