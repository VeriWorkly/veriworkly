import Link from "next/link";
import { Layout as LayoutIcon } from "lucide-react";

import { Card, Button } from "@veriworkly/ui";

import { SectionHeader } from "./SectionHeader";

export const LayoutSection = () => {
  return (
    <section id="layout" className="scroll-mt-24 space-y-8">
      <SectionHeader icon={LayoutIcon} title="Layout & Spacing" />

      <Card className="space-y-6 p-8">
        <p className="text-muted leading-relaxed">
          Our layout follows a modular grid system. We use standard Next.js Container components
          with consistent padding and gap values.
        </p>

        <div className="grid gap-4">
          <div className="bg-accent/5 border-accent/10 text-accent flex h-12 items-center justify-center rounded-xl border font-mono text-xs">
            Container Max-Width (1280px)
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-accent/5 border-accent/10 text-accent flex h-12 items-center justify-center rounded-xl border font-mono text-xs">
              Gap 4 (16px)
            </div>

            <div className="bg-accent/5 border-accent/10 text-accent flex h-12 items-center justify-center rounded-xl border font-mono text-xs">
              Gap 4 (16px)
            </div>
          </div>

          <div className="bg-accent/5 border-accent/10 text-accent flex h-24 items-center justify-center rounded-4xl border px-4 text-center font-mono text-xs">
            Section Rounded (32px / rounded-4xl) <br />
            Shadow: [0_30px_90px_-50px_rgba(0,0,0,0.45)]
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="secondary">
          <Link href="/">Back to Home</Link>
        </Button>

        <Button asChild variant="secondary">
          <Link href="/templates">View Templates</Link>
        </Button>

        <Button asChild variant="secondary">
          <Link href="https://docs.veriworkly.com">Read Docs</Link>
        </Button>
      </div>
    </section>
  );
};
