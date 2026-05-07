import Link from "next/link";
import { Shield } from "lucide-react";

import { Button, Card } from "@veriworkly/ui";

export const DocsHero = () => {
  return (
    <section
      aria-labelledby="docs-hero-heading"
      className="border-border bg-card relative overflow-hidden rounded-4xl border px-6 py-10 shadow-[0_30px_90px_-50px_rgba(0,0,0,0.45)] md:px-10 md:py-14"
    >
      <div className="bg-accent/12 pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full blur-3xl" />
      <div className="bg-accent/10 pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full blur-3xl" />

      <div className="relative grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div className="space-y-8">
          <p className="text-muted text-xs font-semibold tracking-[0.28em] uppercase">
            VeriWorkly Docs
          </p>

          <h1
            id="docs-hero-heading"
            className="text-foreground text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
          >
            The Architecture of <span className="text-accent">Career Tech.</span>
          </h1>

          <p className="text-muted max-w-2xl text-base leading-8 md:text-lg">
            Deep dive into our privacy-first engine, explore the API specs, and learn how we&apos;re
            redefining professional identity with local-first engineering.
          </p>

          <div className="flex flex-wrap items-center justify-start gap-4">
            <Button asChild size="lg" variant="primary">
              <Link href="/docs" aria-label="Explore guides">
                Start Building
              </Link>
            </Button>

            <Button asChild size="lg" variant="secondary">
              <Link href="/api-reference" aria-label="API reference">
                API Reference
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3">
          <Card className="bg-background/70 p-5 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="bg-accent/10 flex size-10 items-center justify-center rounded-lg">
                <Shield className="text-accent size-5" />
              </div>

              <div>
                <p className="text-foreground font-semibold">E2EE</p>
                <p className="text-muted text-xs">Privacy Standard</p>
              </div>
            </div>
          </Card>

          <Card className="bg-background/70 p-5 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="bg-accent/10 flex size-10 items-center justify-center rounded-lg">
                <Shield className="text-accent size-5" />
              </div>

              <div>
                <p className="text-foreground font-semibold">Open Source</p>
                <p className="text-muted text-xs">MIT Licensed</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};
