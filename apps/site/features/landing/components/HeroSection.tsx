import Link from "next/link";

import { Card, Button } from "@veriworkly/ui";
import { siteConfig } from "@/config/site";

const HeroSection = () => {
  return (
    <header
      aria-labelledby="hero-heading"
      className="border-border bg-card relative overflow-hidden rounded-4xl border px-6 pt-14 pb-10 shadow-[0_30px_90px_-50px_rgba(0,0,0,0.45)] md:px-10 md:pt-20 md:pb-14"
    >
      <div className="bg-accent/12 pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full blur-3xl" />
      <div className="bg-accent/10 pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full blur-3xl" />

      <div className="relative grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
        <div className="space-y-6">
          <p className="text-muted text-xs font-semibold tracking-[0.28em] uppercase">VeriWorkly</p>

          <h1
            id="hero-heading"
            className="text-foreground text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
          >
            Build professional resumes in minutes - no login required.
          </h1>

          <p className="text-muted max-w-2xl text-base leading-8 md:text-lg">
            A modern, ATS-friendly resume builder with full control over layout, sections, and
            structure. Fast by default. Private by design.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-start gap-3">
            <Button asChild size="lg" variant="primary">
              <Link href={siteConfig.links.app} aria-label="Start building resume">
                Start Building Free
              </Link>
            </Button>

            <Button asChild size="lg" variant="secondary">
              <Link href="https://docs.veriworkly.com" aria-label="Read documentation">
                Read Documentation
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <Card className="bg-background/70 p-5 backdrop-blur">
            <p className="text-foreground text-2xl font-semibold">No</p>
            <p className="text-muted mt-1 text-sm">Accounts required</p>
          </Card>

          <Card className="bg-background/70 p-5 backdrop-blur">
            <p className="text-foreground text-2xl font-semibold">100%</p>
            <p className="text-muted mt-1 text-sm">Your data stays local</p>
          </Card>
        </div>
      </div>
    </header>
  );
};

export default HeroSection;
