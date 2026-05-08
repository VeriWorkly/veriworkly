import Link from "next/link";

import { Button } from "@veriworkly/ui";
import { siteConfig } from "@/config/site";

const CTASection = () => {
  return (
    <section
      aria-labelledby="cta-heading"
      className="border-border bg-card rounded-4xl border p-8 text-center md:p-12"
    >
      <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">Final call</p>

      <h2
        id="cta-heading"
        className="text-foreground mt-3 text-3xl font-semibold tracking-tight md:text-4xl"
      >
        Start building your resume now — no login required.
      </h2>

      <p className="text-muted mx-auto mt-3 max-w-2xl text-sm leading-6 md:text-base">
        No sign-up. No lock-in. Just open the editor and create a professional resume that feels
        like yours.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg" variant="primary">
          <Link href={siteConfig.links.app} aria-label="Start building resume">
            Start Building Now
          </Link>
        </Button>

        <Button asChild size="lg" variant="secondary">
          <Link href="/templates" aria-label="Browse resume templates">
            Explore Templates
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default CTASection;
