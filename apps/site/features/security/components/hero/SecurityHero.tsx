import { ArrowRight, ExternalLink, FileCode } from "lucide-react";

import { GithubIcon } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

import { Reveal } from "@/components/marketing/Reveal";

import { SECURITY_COMMITMENTS } from "../../data";

export const SecurityHero = () => {
  const supportEmailHref = `mailto:${siteConfig.email}`;

  const githubSecurityPolicyUrl =
    "https://github.com/VeriWorkly/veriworkly/blob/master/SECURITY.md";
  const githubDiscussionsUrl = `${siteConfig.links.github}/discussions`;

  return (
    <div className="border-border/40 relative flex flex-col items-center border-b pb-20 text-center">
      <div className="max-w-3xl space-y-6">
        <Reveal priority>
          <div className="border-border/80 bg-card/60 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs backdrop-blur-md">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-foreground font-mono text-[10px] font-bold tracking-widest uppercase">
              Security Architecture
            </span>

            <span className="text-muted/60 font-mono text-[10px]">|</span>
            <span className="text-muted text-[11px]">Local-First &amp; Client-Encrypted</span>
          </div>
        </Reveal>

        <Reveal priority delay={0.06}>
          <h1 className="text-foreground text-[clamp(2.5rem,5.5vw,4.25rem)] leading-[1.04] font-bold tracking-tight text-balance">
            Private, client-side security for your career records.
          </h1>
        </Reveal>

        <Reveal priority delay={0.12}>
          <p className="text-muted mx-auto max-w-2xl text-base leading-relaxed sm:text-lg">
            Local-first browser storage, decoupled document sandboxes, and cloud sync you explicitly
            opt into, never by surprise.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={supportEmailHref}
              className="bg-accent text-accent-foreground group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-md transition-all duration-200 hover:opacity-90 active:scale-[0.97]"
            >
              <span>Email security team</span>
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </a>

            <a
              target="_blank"
              rel="noreferrer"
              href={githubSecurityPolicyUrl}
              className="border-border/80 bg-card/60 text-foreground hover:bg-card inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-200"
            >
              <span>Read SECURITY.md</span>
              <ExternalLink className="text-muted size-3.5" />
            </a>

            <a
              target="_blank"
              rel="noreferrer"
              href="/.well-known/security.txt"
              className="border-border/80 bg-card/60 text-muted hover:text-foreground inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-all duration-200"
            >
              <FileCode className="size-4 text-emerald-500" />
              <span>security.txt</span>
            </a>

            <a
              target="_blank"
              rel="noreferrer"
              href={githubDiscussionsUrl}
              className="border-border/80 bg-card/60 text-muted hover:text-foreground inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-all duration-200"
            >
              <GithubIcon className="size-4" />
              <span>Discussions</span>
            </a>
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.22} className="mt-14 w-full">
        <div className="grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
          {SECURITY_COMMITMENTS.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="border-border/60 bg-card/40 hover:border-accent/40 space-y-2 rounded-2xl border p-4.5 shadow-xs backdrop-blur-sm transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <span className="bg-accent/10 text-accent ring-accent/20 flex size-8 items-center justify-center rounded-lg ring-1">
                    <Icon className="size-4" />
                  </span>

                  <h3 className="text-foreground text-xs font-bold tracking-tight">{item.title}</h3>
                </div>

                <p className="text-muted text-[11px] leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </Reveal>
    </div>
  );
};

export default SecurityHero;
