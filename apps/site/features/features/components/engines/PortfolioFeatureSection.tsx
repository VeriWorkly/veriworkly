import Link from "next/link";
import { Globe, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

import { Card } from "@veriworkly/ui";

import { Reveal } from "@/components/marketing/Reveal";

export const PortfolioFeatureSection = () => {
  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-2">
        <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
          Core Engine 05
        </span>

        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Web Portfolios on Your Own Subdomain
        </h2>

        <p className="text-muted max-w-3xl text-sm leading-relaxed sm:text-base">
          Turn your resume into a personal portfolio website hosted at
          <span className="text-accent font-mono"> yourname.veriworkly.com</span>, with fast edge
          delivery, mobile responsiveness, and zero tracking cookies. Build and preview yours today
          — publishing opens at launch.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <Card className="border-border/60 bg-card/50 relative flex h-full flex-col justify-between overflow-hidden p-6 shadow-xl backdrop-blur-sm sm:p-8">
            <div className="space-y-5">
              <div className="border-border/60 bg-background/80 overflow-hidden rounded-2xl border shadow-md">
                <div className="border-border/40 bg-muted/20 flex items-center justify-between border-b px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-red-400/70" />

                    <span className="size-2.5 rounded-full bg-amber-400/70" />

                    <span className="size-2.5 rounded-full bg-emerald-400/70" />
                  </div>

                  <div className="border-border/50 bg-background text-muted flex items-center gap-1.5 rounded-full border px-3 py-0.5 font-mono text-[11px]">
                    <Globe className="size-3 text-emerald-500" />
                    <span>gautamraj.veriworkly.com</span>
                  </div>

                  <span className="text-muted/60 font-mono text-[9px] uppercase">Edge SSL</span>
                </div>

                <div className="space-y-4 p-5 sm:p-6">
                  <div className="space-y-1">
                    <span className="text-accent font-mono text-[10px] font-bold tracking-wider uppercase">
                      Portfolio Theme: Signal
                    </span>

                    <h3 className="text-foreground text-lg font-bold">
                      Gautam Raj{" "}
                      <span className="text-muted text-sm font-normal">
                        / Staff Frontend Engineer
                      </span>
                    </h3>

                    <p className="text-muted text-xs leading-relaxed">
                      Building distributed web applications, open source developer tools, and
                      high-performance design systems.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="border-border/50 bg-card/60 space-y-1 rounded-xl border p-3">
                      <span className="text-foreground block text-xs font-bold">
                        Hyperion Engine
                      </span>

                      <span className="text-muted block text-[10px]">
                        High-speed canvas renderer
                      </span>

                      <span className="text-accent font-mono text-[9px]">TypeScript / WebGL</span>
                    </div>

                    <div className="border-border/50 bg-card/60 space-y-1 rounded-xl border p-3">
                      <span className="text-foreground block text-xs font-bold">Aura UI</span>

                      <span className="text-muted block text-[10px]">
                        Accessible component library
                      </span>

                      <span className="text-accent font-mono text-[9px]">React / Tailwind</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="border-border/40 bg-background/50 rounded-xl border p-2.5">
                  <span className="block font-mono font-bold text-emerald-500">At Launch</span>

                  <span className="text-muted text-[10px]">Publishing Opens Soon</span>
                </div>

                <div className="border-border/40 bg-background/50 rounded-xl border p-2.5">
                  <span className="text-foreground block font-mono font-bold">Free Core</span>

                  <span className="text-muted text-[10px]">Signal + Atelier</span>
                </div>

                <div className="border-border/40 bg-background/50 rounded-xl border p-2.5">
                  <span className="text-accent block font-mono font-bold">100% Privacy</span>

                  <span className="text-muted text-[10px]">Cookie-Free</span>
                </div>
              </div>
            </div>

            <div className="border-border/40 mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <span className="text-muted text-xs">
                Four themes: Signal and Atelier free, Nimbus and Cipher premium
              </span>

              <Link
                href="/templates/portfolio-website"
                className="text-accent inline-flex items-center gap-1.5 text-xs font-bold hover:underline"
              >
                <span>Explore portfolio templates</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.1} className="lg:col-span-5">
          <div className="flex h-full flex-col justify-between space-y-4">
            <div className="space-y-3">
              <Card className="border-border/60 bg-card/40 hover:border-accent/30 p-5 backdrop-blur-sm transition-all">
                <div className="flex items-start gap-3.5">
                  <div className="bg-accent/10 text-accent mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <Globe className="size-4" />
                  </div>

                  <div>
                    <h4 className="text-foreground text-sm font-bold">Personal Custom Subdomain</h4>

                    <p className="text-muted mt-1 text-xs leading-relaxed">
                      Claim your unique handle (
                      <span className="text-accent font-mono">yourname.veriworkly.com</span>) with
                      automatic SSL certificate provisioning and global CDN edge routing.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="border-border/60 bg-card/40 hover:border-accent/30 p-5 backdrop-blur-sm transition-all">
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="size-4" />
                  </div>

                  <div>
                    <h4 className="text-foreground text-sm font-bold">Synced Project Showcases</h4>

                    <p className="text-muted mt-1 text-xs leading-relaxed">
                      Show off case studies, GitHub repositories, demo links, and skills with
                      interactive filters that look impressive on both desktop and mobile devices.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="border-border/60 bg-card/40 hover:border-accent/30 p-5 backdrop-blur-sm transition-all">
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <ShieldCheck className="size-4" />
                  </div>

                  <div>
                    <h4 className="text-foreground text-sm font-bold">
                      Clean SEO and Zero Analytics Bloat
                    </h4>

                    <p className="text-muted mt-1 text-xs leading-relaxed">
                      Pre-rendered semantic HTML with OpenGraph metadata, fast load times, and zero
                      third-party advertising scripts.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="border-border/60 bg-background/50 flex items-center justify-between rounded-2xl border p-4 text-xs">
              <span className="text-muted">
                Signal and Atelier are free and publish with a small badge. Nimbus and Cipher, and
                badge removal, come with a paid plan.
              </span>

              <Link
                href="/pricing"
                className="text-accent inline-flex items-center gap-1 font-semibold hover:underline"
              >
                <span>Pricing</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default PortfolioFeatureSection;
