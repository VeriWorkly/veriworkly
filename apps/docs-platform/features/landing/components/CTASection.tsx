import Link from "next/link";

import { Button } from "@veriworkly/ui";
import { siteConfig } from "@/config/site";

export const CTASection = () => {
  return (
    <section className="border-border bg-card relative overflow-hidden rounded-4xl border px-6 py-12 text-center md:px-10 md:py-24">
      <div className="bg-accent/10 pointer-events-none absolute inset-0 blur-3xl" />
      <div className="relative mx-auto max-w-3xl space-y-8">
        <div className="space-y-4">
          <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
            Get Started
          </p>

          <h2 className="text-foreground text-4xl font-semibold tracking-tight md:text-6xl">
            Ready to dive in?
          </h2>
        </div>

        <p className="text-muted mx-auto max-w-2xl text-xl leading-relaxed font-medium">
          Use the docs to understand the architecture, run the project locally, and integrate with
          the API. Then jump into the builder to see everything in action.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-6">
          <Button
            asChild
            size="lg"
            variant="primary"
            className="h-14 rounded-2xl px-10 text-base font-bold shadow-xl shadow-blue-500/20"
          >
            <Link href="/docs">Get Started Now</Link>
          </Button>

          <Button
            asChild
            size="lg"
            variant="secondary"
            className="h-14 rounded-2xl border-zinc-200/50 px-10 text-base font-bold"
          >
            <Link href={siteConfig.links.app}>Open Resume Builder</Link>
          </Button>

          <Button
            asChild
            size="lg"
            variant="secondary"
            className="h-14 rounded-2xl border-zinc-200/50 px-10 text-base font-bold"
          >
            <Link href={siteConfig.links.github} target="_blank" rel="noopener noreferrer">
              Star on GitHub
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
