import { Globe2, Lock, ShieldCheck } from "lucide-react";

import { Reveal } from "@/components/marketing/Reveal";

const layers = [
  {
    title: "Browser sandbox",
    detail: "Documents compile locally. Nothing leaves your machine by default.",
    icon: Lock,
    tone: "text-blue-400",
    ring: "border-blue-500/25",
  },
  {
    title: "Encrypted cloud sync",
    detail: "Optional, SSL/TLS in transit, unlocked by Better Auth OTP.",
    icon: ShieldCheck,
    tone: "text-cyan-400",
    ring: "border-cyan-500/20",
  },
  {
    title: "Public portfolios",
    detail: "Served on your subdomain. Aggregate views, no cookies.",
    icon: Globe2,
    tone: "text-emerald-400",
    ring: "border-emerald-500/20",
  },
];

const SecurityBoundaryDiagram = () => {
  return (
    <div className="relative overflow-hidden rounded-[2.5rem] border border-zinc-800 bg-[#050505] p-8 md:p-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(currentColor_1px,transparent_1px)] bg-size-[20px_20px] text-zinc-800 opacity-40" />

      <div className="relative z-10 flex flex-col items-center gap-10">
        <div className="relative flex h-56 w-56 shrink-0 items-center justify-center">
          {layers.map((layer, idx) => {
            const size = 100 - idx * 30;
            return (
              <Reveal
                key={layer.title}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: idx * 0.12, ease: [0.23, 1, 0.32, 1] }}
                className={`absolute rounded-full border ${layer.ring}`}
                style={{ width: `${size}%`, height: `${size}%` }}
              />
            );
          })}

          <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-zinc-950 shadow-[0_0_40px_rgba(59,130,246,0.35)]">
            <Lock className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
          </div>
        </div>

        <div className="grid w-full gap-4 sm:grid-cols-3">
          {layers.map((layer, idx) => {
            const Icon = layer.icon;
            return (
              <Reveal
                key={layer.title}
                delay={idx * 0.08}
                className="flex flex-col gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 text-left backdrop-blur-md"
              >
                <Icon className={`h-4 w-4 ${layer.tone}`} strokeWidth={2} aria-hidden="true" />
                <h4 className="text-xs font-semibold text-white">{layer.title}</h4>
                <p className="text-[11px] leading-4 text-zinc-400">{layer.detail}</p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SecurityBoundaryDiagram;
