import { Shield } from "lucide-react";

import { siteConfig } from "@/config/site";
import { Reveal } from "@/components/marketing/Reveal";
import { SectionEyebrow } from "@/components/marketing/SectionEyebrow";
import { LandingButton } from "@/components/marketing/LandingButton";

const AboutHero = () => {
  return (
    <section className="relative w-full overflow-hidden bg-zinc-950 pt-32 pb-24 md:pt-40 md:pb-32">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(120,119,198,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,119,198,0.07)_1px,transparent_1px)] mask-[radial-gradient(ellipse_65%_55%_at_50%_0%,#000_65%,transparent_100%)] bg-size-[26px_26px]" />

      <div className="pointer-events-none absolute top-0 left-1/2 h-105 w-full max-w-225 -translate-x-1/2 rounded-full bg-blue-500/15 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 md:px-8">
        <Reveal priority>
          <SectionEyebrow icon={Shield} label="Why VeriWorkly exists" className="mx-auto" />
        </Reveal>

        <Reveal priority delay={0.06}>
          <h1 className="mt-8 text-center text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.08] font-semibold tracking-tighter text-balance text-white">
            Your career history shouldn&apos;t be held hostage behind a subscription.
          </h1>
        </Reveal>

        <Reveal priority delay={0.14}>
          <p className="mx-auto mt-8 max-w-2xl text-center text-lg leading-relaxed text-zinc-400">
            VeriWorkly is a private career workspace for your resumes, cover letters, and public
            portfolios — plus the AI tailoring, ATS scoring, and GitHub/LinkedIn import tools that
            connect them. Build ready-to-use documents on your own terms — no paywalls, no sold
            profiles, no account traps.
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="mt-10 flex items-center justify-center gap-4">
            <span className="h-px w-10 bg-zinc-800" />
            <span className="text-sm font-medium text-zinc-500">
              — Gautam Raj, Founder of {siteConfig.shortName}
            </span>
            <span className="h-px w-10 bg-zinc-800" />
          </div>
        </Reveal>

        <Reveal delay={0.28}>
          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <LandingButton
              href={siteConfig.links.app}
              variant="solid"
              size="hero"
              showArrow
            >
              Open Studio
            </LandingButton>

            <LandingButton
              href="/contact"
              variant="glass"
              size="hero"
            >
              Message the Team
            </LandingButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default AboutHero;
