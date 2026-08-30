import { Activity } from "lucide-react";

import { Card, Button } from "@veriworkly/ui";
import { motionTokens } from "@/config/brand";

import { SectionHeader } from "./SectionHeader";

export const MotionSection = () => {
  return (
    <section id="motion" className="scroll-mt-24 space-y-8">
      <SectionHeader icon={Activity} title="Motion & Focus" />

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="space-y-5 p-8">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Duration &amp; easing</h3>

            <p className="text-muted text-sm leading-relaxed">
              Motion confirms an action; it never announces itself. Anything longer than 250ms on an
              interaction feels like latency.
            </p>
          </div>

          <dl className="divide-border divide-y">
            {motionTokens.map((token) => (
              <div key={token.name} className="space-y-1 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <dt className="text-foreground text-sm font-medium">{token.name}</dt>
                  <dd className="text-muted font-mono text-xs tabular-nums">{token.value}</dd>
                </div>

                <p className="text-muted font-mono text-[11px]">{token.easing}</p>
                <p className="text-muted text-xs leading-relaxed">{token.usage}</p>
              </div>
            ))}
          </dl>
        </Card>

        <div className="space-y-8">
          <Card className="space-y-5 p-8">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Focus states</h3>

              <p className="text-muted text-sm leading-relaxed">
                Every interactive element needs a visible keyboard focus state. Tab through these
                rather than clicking them - the ring appears on{" "}
                <span className="font-mono text-xs">:focus-visible</span> only, so a mouse click
                stays quiet.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary">Focusable button</Button>

              <a
                href="#motion"
                className="text-accent focus-visible:ring-accent rounded text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Focusable link
              </a>

              <input
                type="text"
                placeholder="Focusable input"
                aria-label="Focus state demonstration"
                className="border-border bg-background focus-visible:ring-accent focus-visible:border-accent rounded-xl border px-3.5 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
              />
            </div>

            <p className="text-muted font-mono text-[11px] leading-relaxed">
              focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
            </p>
          </Card>

          <Card className="space-y-4 p-8">
            <h3 className="text-lg font-semibold">Reduced motion</h3>

            <p className="text-muted text-sm leading-relaxed">
              A global{" "}
              <span className="font-mono text-xs">@media (prefers-reduced-motion: reduce)</span>{" "}
              rule collapses every animation and transition to 0.01ms and disables smooth scrolling.
              You do not need to handle this per component - but never encode meaning in motion
              alone, because for some readers there will be none.
            </p>

            <p className="text-muted font-mono text-[11px]">packages/ui/src/styles/globals.css</p>
          </Card>
        </div>
      </div>
    </section>
  );
};
