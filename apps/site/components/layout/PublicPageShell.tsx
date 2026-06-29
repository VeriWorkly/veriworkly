import type { ReactNode } from "react";

import Link from "next/link";

import { siteConfig } from "@/config/site";
import { Button, Container } from "@veriworkly/ui";

type PublicPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction?: {
    href: string;
    label: string;
  };
  secondaryAction?: {
    href: string;
    label: string;
  };
  children?: ReactNode;
};

export function PublicPageShell({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
}: PublicPageShellProps) {
  return (
    <main className="surface-grid min-h-screen pt-28 pb-20 lg:pt-36">
      <Container className="space-y-10 md:space-y-12">
        <section className="border-border bg-card relative overflow-hidden rounded-4xl border px-6 py-10 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.15)] md:px-10 md:py-14">
          <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(currentColor_0.7px,transparent_0.7px)] [background-size:16px_16px] opacity-[0.06] dark:opacity-[0.03]" />
          <div className="bg-accent/12 pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full blur-3xl" />
          <div className="bg-accent/10 pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full blur-3xl" />

          <div className="relative space-y-6">
            <Link
              href="/"
              className="text-muted hover:text-foreground text-xs font-bold tracking-[0.28em] uppercase transition-colors"
            >
              {siteConfig.shortName}
            </Link>

            <div className="space-y-4">
              <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
                {eyebrow}
              </p>

              <h1 className="text-foreground text-wrap-balance max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
                {title}
              </h1>

              <p className="text-muted max-w-3xl text-base leading-8 md:text-lg">{description}</p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" variant="secondary">
                <Link href="/">Back to Home</Link>
              </Button>

              {primaryAction ? (
                <Button asChild size="lg" variant="primary">
                  <Link href={primaryAction.href}>{primaryAction.label}</Link>
                </Button>
              ) : null}

              {secondaryAction ? (
                <Button asChild size="lg" variant="secondary">
                  <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        {children}
      </Container>
    </main>
  );
}
