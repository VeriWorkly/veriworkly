import Link from "next/link";
import { Layout as LayoutIcon } from "lucide-react";

import { Card, Button } from "@veriworkly/ui";

import { SectionHeader } from "./SectionHeader";

export const LayoutSection = () => {
  return (
    <section id="layout" className="space-y-8 pb-20 scroll-mt-24">
      <SectionHeader icon={LayoutIcon} title="Layout & Spacing" />

      <Card className="p-8 space-y-6">
        <p className="text-muted leading-relaxed">
          Our layout follows a modular grid system. We use standard Next.js Container components
          with consistent padding and gap values.
        </p>

        <div className="grid gap-4">
          <div className="bg-accent/5 border border-accent/10 h-12 rounded-xl flex items-center justify-center text-accent text-xs font-mono">
            Container Max-Width (1280px)
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-accent/5 border border-accent/10 h-12 rounded-xl flex items-center justify-center text-accent text-xs font-mono">
              Gap 4 (16px)
            </div>

            <div className="bg-accent/5 border border-accent/10 h-12 rounded-xl flex items-center justify-center text-accent text-xs font-mono">
              Gap 4 (16px)
            </div>
          </div>

          <div className="bg-accent/5 border border-accent/10 h-24 rounded-4xl flex items-center justify-center text-accent text-xs font-mono text-center px-4">
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
