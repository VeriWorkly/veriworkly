import { Type } from "lucide-react";

import { Card } from "@veriworkly/ui";
import { fontStack, typeScale } from "@/config/brand";

import BrandSectionHeader from "./BrandSectionHeader";

/** The steps an outside designer actually needs; the rest live on /style-guide. */
const PRESS_STEPS = ["Display", "Section", "Component", "Eyebrow"];

const BrandTypographySection = () => {
  const steps = typeScale.filter((step) => PRESS_STEPS.includes(step.label));

  return (
    <section id="typography" className="scroll-mt-24 space-y-8">
      <BrandSectionHeader
        icon={Type}
        title="Typography"
        description="Geist Sans for interface and body copy, Geist Mono for labels, code, and metadata. Both are open source, so you can set the VeriWorkly name correctly without licensing anything."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-3 p-8">
          <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
            Primary - {fontStack.sans.family}
          </p>

          <p className="text-4xl font-semibold tracking-tight">VeriWorkly</p>

          <p className="text-muted font-mono text-xs">var({fontStack.sans.variable})</p>
          <p className="text-muted text-sm leading-relaxed">{fontStack.sans.usage}</p>
        </Card>

        <Card className="space-y-3 p-8">
          <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
            Monospace - {fontStack.mono.family}
          </p>

          <p className="font-mono text-4xl font-semibold tracking-tight">VeriWorkly</p>

          <p className="text-muted font-mono text-xs">var({fontStack.mono.variable})</p>
          <p className="text-muted text-sm leading-relaxed">{fontStack.mono.usage}</p>
        </Card>
      </div>

      <Card className="divide-border divide-y overflow-hidden p-0">
        {steps.map((step) => (
          <div key={step.label} className="space-y-3 p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
                {step.label}
              </p>

              <p className="text-muted font-mono text-xs tabular-nums">
                {step.sizes} · weight {step.weight} · tracking {step.tracking}
              </p>
            </div>

            <p className={step.className}>{step.usage}</p>
          </div>
        ))}

        <div className="space-y-3 p-8">
          <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">Licensing</p>

          <p className="text-sm leading-relaxed">
            Geist Sans and Geist Mono are released by Vercel under the SIL Open Font License 1.1. We
            load them through <span className="font-mono">next/font</span> in{" "}
            <span className="font-mono">@veriworkly/ui</span>, which self-hosts them at build time.
            Nothing needs to be purchased or requested to typeset the VeriWorkly name - download
            them from Google Fonts.
          </p>
        </div>
      </Card>
    </section>
  );
};

export default BrandTypographySection;
