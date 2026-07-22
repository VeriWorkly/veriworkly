import Link from "next/link";
import { ArrowRight, Shield } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Reveal } from "@/components/marketing/Reveal";
import { SectionEyebrow } from "@/components/marketing/SectionEyebrow";

const AboutHero = () => {
  return (
    <section className="relative w-full overflow-hidden bg-zinc-950 pt-32 pb-24 md:pt-40 md:pb-32">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(120,119,198,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,119,198,0.07)_1px,transparent_1px)] mask-[radial-gradient(ellipse_65%_55%_at_50%_0%,#000_65%,transparent_100%)] bg-size-[26px_26px]" />
      <div className="pointer-events-none absolute top-0 left-1/2 h-105 w-full max-w-225 -translate-x-1/2 rounded-full bg-blue-500/15 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 md:px-8">
        <Reveal>
          <SectionEyebrow icon={Shield} label="Why VeriWorkly exists" className="mx-auto" />
        </Reveal>

        <Reveal delay={0.06}>
          <p className="mt-8 text-center text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.08] font-semibold tracking-tighter text-balance text-white">
            Your career history shouldn&apos;t be held hostage behind a subscription.
          </p>
        </Reveal>

        <Reveal delay={0.14}>
          <p className="mx-auto mt-8 max-w-2xl text-center text-lg leading-relaxed text-zinc-400">
            VeriWorkly is a private workspace for your resumes, cover letters, portfolios, and
            invoices. Build ready-to-use documents on your own terms — no paywalls, no sold
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
            <Link
              href={siteConfig.links.app}
              className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-8 text-base font-semibold text-zinc-950 shadow-md transition-all duration-300 hover:bg-blue-500 hover:text-white active:scale-[0.97]"
            >
              Open Studio
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-14 items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 text-base font-medium text-zinc-200 backdrop-blur-md transition-colors hover:border-blue-400/40 hover:text-blue-300"
            >
              Message the Team
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default AboutHero;
