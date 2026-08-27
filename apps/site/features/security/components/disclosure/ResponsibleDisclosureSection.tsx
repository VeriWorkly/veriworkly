import { CheckCircle2, XCircle, FileCode } from "lucide-react";

import { GithubIcon } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

import { Reveal } from "@/components/marketing/Reveal";
import { DISCLOSURE_STEPS, DISCLOSURE_IN_SCOPE, DISCLOSURE_OUT_OF_SCOPE } from "../../data";

export const ResponsibleDisclosureSection = () => {
  const supportEmail = siteConfig.email;

  const supportEmailHref = `mailto:${supportEmail}`;
  const githubDiscussionsUrl = `${siteConfig.links.github}/discussions`;

  return (
    <section className="border-border/40 space-y-12 border-t pt-16">
      <div className="max-w-2xl space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
            Responsible Disclosure &amp; Bug Bounty
          </span>

          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            24h SLA Guarantee
          </span>
        </div>

        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Found a vulnerability? Here is what happens next
        </h2>

        <p className="text-muted text-xs leading-relaxed sm:text-sm">
          We investigate security reports proactively. Report issues privately to our engineering
          team, and we will remediate swiftly.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {DISCLOSURE_STEPS.map((step, idx) => {
          const Icon = step.icon;

          return (
            <Reveal key={step.label} delay={idx * 0.06}>
              <div className="border-border/60 bg-card/40 hover:border-accent/40 relative flex h-full flex-col justify-between rounded-2xl border p-6 backdrop-blur-sm transition-all duration-200">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="bg-accent/10 text-accent ring-accent/20 flex size-9 items-center justify-center rounded-xl ring-1">
                      <Icon className="size-4.5" />
                    </span>

                    <span className="text-muted font-mono text-xs font-bold">{step.step}</span>
                  </div>

                  <h3 className="text-foreground text-sm font-bold tracking-tight">{step.label}</h3>

                  <p className="text-muted text-xs leading-relaxed">{step.detail}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Reveal>
          <div className="bg-card/40 relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-emerald-500/30 p-6 shadow-sm backdrop-blur-sm sm:p-7">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" />
                </span>

                <h4 className="text-foreground text-base font-bold">
                  {DISCLOSURE_IN_SCOPE.category}
                </h4>
              </div>

              <ul className="text-muted space-y-2.5 text-xs">
                {DISCLOSURE_IN_SCOPE.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />

                    <span className="text-foreground/90 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="border-destructive/30 bg-card/40 relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border p-6 shadow-sm backdrop-blur-sm sm:p-7">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="bg-destructive/10 text-destructive ring-destructive/20 flex size-8 items-center justify-center rounded-lg ring-1">
                  <XCircle className="size-4" />
                </span>

                <h4 className="text-foreground text-base font-bold">
                  {DISCLOSURE_OUT_OF_SCOPE.category}
                </h4>
              </div>

              <ul className="text-muted space-y-2.5 text-xs">
                {DISCLOSURE_OUT_OF_SCOPE.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <XCircle className="text-destructive mt-0.5 size-3.5 shrink-0" />

                    <span className="text-muted leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="border-border/60 bg-card/40 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-6 backdrop-blur-sm">
        <div className="space-y-1">
          <h4 className="text-foreground text-sm font-bold">Ready to submit a security report?</h4>

          <p className="text-muted text-xs">Direct inbox to our core engineering maintainers.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={supportEmailHref}
            className="bg-accent text-accent-foreground inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold shadow-sm transition-opacity hover:opacity-90 active:scale-[0.97]"
          >
            <span>Email Security Report</span>
          </a>

          <a
            target="_blank"
            rel="noreferrer"
            href="/.well-known/security.txt"
            className="border-border/80 bg-background/70 text-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-xs font-semibold transition-colors"
          >
            <FileCode className="size-3.5 text-emerald-500" />
            <span>security.txt</span>
          </a>

          <a
            target="_blank"
            rel="noreferrer"
            href={githubDiscussionsUrl}
            className="border-border/80 bg-background/70 text-foreground hover:bg-card inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold transition-colors"
          >
            <GithubIcon className="size-3.5" />
            <span>Public Discussions</span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default ResponsibleDisclosureSection;
