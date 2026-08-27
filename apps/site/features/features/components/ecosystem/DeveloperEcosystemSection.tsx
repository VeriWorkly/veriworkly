import { BookOpen, KeyRound, ExternalLink } from "lucide-react";

import { GithubIcon, Card } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

import { Reveal } from "@/components/marketing/Reveal";

export const DeveloperEcosystemSection = () => {
  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-2">
        <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
          Ecosystem &amp; Developers
        </span>

        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Built for Developers, Auditable for Everyone
        </h2>

        <p className="text-muted max-w-3xl text-sm leading-relaxed sm:text-base">
          VeriWorkly is backed by an auditable open-core foundation. Explore our developer
          documentation, inspect our open-source repositories, or integrate with scoped API tokens.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Reveal>
          <Card className="border-border/60 bg-card/40 hover:border-accent/40 relative flex h-full flex-col justify-between overflow-hidden p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="space-y-4">
              <div className="bg-accent/10 text-accent ring-accent/20 flex size-10 items-center justify-center rounded-xl ring-1">
                <BookOpen className="size-5" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-foreground text-base font-bold">Platform Documentation</h3>

                <p className="text-muted text-xs leading-relaxed">
                  Comprehensive guides covering template configuration, Master Profile schemas, ATS
                  rules, and deployment instructions.
                </p>
              </div>
            </div>

            <div className="border-border/40 mt-5 border-t pt-3">
              <a
                target="_blank"
                rel="noreferrer"
                href={siteConfig.links.docs}
                className="text-accent inline-flex items-center gap-1.5 text-xs font-bold hover:underline"
              >
                <span>Read Documentation</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.06}>
          <Card className="border-border/60 bg-card/40 hover:border-accent/40 relative flex h-full flex-col justify-between overflow-hidden p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="space-y-4">
              <div className="border-border/80 bg-background flex size-10 items-center justify-center rounded-xl border shadow-xs">
                <GithubIcon className="text-foreground size-5" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-foreground text-base font-bold">MIT Open Core</h3>

                <p className="text-muted text-xs leading-relaxed">
                  Inspect the source code, verify privacy claims, self-host the studio, or
                  contribute template components on GitHub.
                </p>
              </div>
            </div>

            <div className="border-border/40 mt-5 border-t pt-3">
              <a
                target="_blank"
                rel="noreferrer"
                href={siteConfig.links.github}
                className="text-foreground inline-flex items-center gap-1.5 text-xs font-bold hover:underline"
              >
                <span>View on GitHub</span>
                <ExternalLink className="text-muted size-3" />
              </a>
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.12}>
          <Card className="border-border/60 bg-card/40 hover:border-accent/40 relative flex h-full flex-col justify-between overflow-hidden p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="space-y-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
                <KeyRound className="size-5" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-foreground text-base font-bold">API &amp; JSON Schema</h3>

                <p className="text-muted text-xs leading-relaxed">
                  Export valid JSON Resume structures, generate scoped developer API tokens, and
                  programmatically render portfolio endpoints.
                </p>
              </div>
            </div>

            <div className="border-border/40 mt-5 border-t pt-3">
              <a
                target="_blank"
                rel="noreferrer"
                href={`${siteConfig.links.docs}/api`}
                className="text-accent inline-flex items-center gap-1.5 text-xs font-bold hover:underline"
              >
                <span>API Reference</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
};

export default DeveloperEcosystemSection;
