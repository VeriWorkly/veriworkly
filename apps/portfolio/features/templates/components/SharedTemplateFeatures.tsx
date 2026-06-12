import { CheckCircle2 } from "lucide-react";

import { sharedTemplateFeatures, templatesShell } from "../constants";

export function SharedTemplateFeatures() {
  return (
    <section className="bg-[#11110f] py-24 text-white md:py-32">
      <div className={`${templatesShell} grid gap-10 lg:grid-cols-[0.75fr_1.25fr]`}>
        <div>
          <p className="mb-5 text-[0.72rem] font-black tracking-[0.16em] text-[#93c5fd] uppercase">
            What every template shares
          </p>
          <h2 className="max-w-2xl text-[clamp(3rem,6vw,6rem)] leading-[0.88] font-black tracking-[-0.08em]">
            The design changes. The portfolio engine stays reliable.
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {sharedTemplateFeatures.map((feature) => (
            <div
              className="flex min-h-28 items-start gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-5"
              key={feature}
            >
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#93c5fd]" />
              <span className="text-sm leading-6 font-black">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
