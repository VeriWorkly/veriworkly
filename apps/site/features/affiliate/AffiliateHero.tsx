import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { siteConfig } from "@/config/site";

/**
 * `programEnabled` mirrors AFFILIATE_PROGRAM_ENABLED. When the program is off the backend
 * answers 503, so "Join as Partner" led straight into an error page - the same failure the
 * ambassador flow already guards against. The page still markets the program; only the
 * action changes.
 */
const AffiliateHero = ({ programEnabled }: { programEnabled: boolean }) => {
  return (
    <section className="relative flex flex-col items-center justify-center overflow-hidden py-24 text-center lg:py-32">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none">
        <div className="animate-float-1 absolute top-1/4 left-1/4 h-87.5 w-87.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-radial from-blue-400/20 to-transparent to-70% md:h-150 md:w-150 dark:from-blue-600/10" />
        <div className="animate-float-2 absolute right-1/4 bottom-1/4 h-75 w-75 translate-x-1/2 translate-y-1/2 rounded-full bg-radial from-amber-400/15 to-transparent to-70% md:h-125 md:w-125 dark:from-amber-500/5" />
        <div className="animate-float-3 absolute top-1/3 right-1/3 h-62.5 w-62.5 rounded-full bg-radial from-violet-400/10 to-transparent to-70% md:h-100 md:w-100 dark:from-violet-600/5" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6">
        <div className="flex flex-col items-center space-y-8">
          <div className="hero-rise bg-card/60 border-border/80 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 shadow-sm backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/60">
            <Sparkles className="h-4 w-4 animate-pulse text-blue-600 dark:text-blue-400" />
            <span className="text-muted text-xs font-semibold tracking-wider uppercase">
              VeriWorkly Partner Program
            </span>
          </div>

          <h1 className="text-foreground max-w-3xl text-4xl leading-[1.1] font-extrabold tracking-tight sm:text-5xl md:text-7xl">
            Share the workspace.{" "}
            <span className="mt-2 block font-serif font-medium text-blue-600 italic dark:text-blue-400">
              Earn lifetime rewards.
            </span>
          </h1>

          <p className="hero-rise text-muted max-w-2xl text-lg leading-relaxed font-normal md:text-xl">
            Recommend VeriWorkly&apos;s career platform. Help designers, developers, and writers
            publish private professional portfolios and earn up to{" "}
            <span className="text-foreground font-bold">5% recurring commission</span>.
          </p>

          <div className="hero-rise flex w-full flex-col items-center gap-4 pt-4 sm:w-auto sm:flex-row">
            {programEnabled ? (
              <Link
                href={`${siteConfig.links.app}/affiliate`}
                className="inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_6px_20px_rgba(37,99,235,0.6)] sm:w-auto dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Join as Partner
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <span
                role="status"
                className="border-border/80 bg-card/85 text-muted inline-flex w-full items-center justify-center gap-2 rounded-full border px-8 py-3.5 text-sm font-semibold sm:w-auto dark:border-zinc-800/80 dark:bg-zinc-950/80"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Partner signups open soon
              </span>
            )}
            <a
              href="#earnings-calculator"
              className="bg-card/85 hover:bg-card border-border/80 text-foreground inline-flex w-full items-center justify-center rounded-full border px-8 py-3.5 text-sm font-semibold backdrop-blur-md transition-all duration-300 hover:border-blue-500/40 sm:w-auto dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:hover:border-blue-400/40"
            >
              Calculate Payouts
            </a>
          </div>

          <div className="hero-rise pointer-events-none pt-12 select-none md:pt-16">
            <div className="relative flex h-32 w-32 items-center justify-center">
              <svg
                className="absolute h-full w-full motion-safe:animate-[spin_25s_linear_infinite]"
                viewBox="0 0 100 100"
              >
                <defs>
                  <path
                    id="textCircle"
                    d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0"
                    fill="none"
                  />
                </defs>
                <text className="fill-muted/50 font-mono text-[7.5px] font-bold tracking-widest uppercase dark:fill-zinc-600">
                  <textPath href="#textCircle" startOffset="0%">
                    VERIWORKLY PARTNER • SHARE & EARN • LIFETIME REWARDS •
                  </textPath>
                </text>
              </svg>

              <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 shadow-[0_0_15px_rgba(37,99,235,0.2)] dark:bg-blue-500/20">
                <span className="absolute h-4 w-4 animate-ping rounded-full bg-blue-600 opacity-60 dark:bg-blue-400" />
                <span className="relative z-10 h-3.5 w-3.5 rounded-full bg-blue-600 dark:bg-blue-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AffiliateHero;
