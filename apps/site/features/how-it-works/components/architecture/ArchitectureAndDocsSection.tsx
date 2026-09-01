import { GitBranch, BookOpen, ExternalLink } from "lucide-react";

import { GithubIcon } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

import { Reveal } from "@/components/marketing/Reveal";
import { SectionEyebrow } from "@/components/marketing/SectionEyebrow";

export const ArchitectureAndDocsSection = () => {
  return (
    <section className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <Reveal>
          <SectionEyebrow icon={GitBranch} label="Open Source &amp; Auditable" />

          <h2 className="text-foreground mt-4 text-2xl font-bold tracking-tight text-balance md:text-3xl">
            A privacy guarantee backed by readable, auditable code
          </h2>

          <p className="text-muted mt-4 max-w-xl text-sm leading-relaxed">
            Because VeriWorkly is built on an open-source core, developers, job seekers, and
            security engineers can audit our database settings, compile parameters, and routing
            scripts. Run the entire platform locally, inspect the configuration, or self-host your
            own database endpoints.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              target="_blank"
              rel="noreferrer"
              href={siteConfig.links.github}
              className="bg-foreground text-background hover:bg-foreground/90 inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-xs font-semibold shadow-md transition-all active:scale-[0.97]"
            >
              <GithubIcon className="size-4" />
              <span>Explore GitHub Repo</span>
            </a>

            <a
              target="_blank"
              rel="noreferrer"
              href={siteConfig.links.docs}
              className="border-border/80 bg-card/60 text-foreground hover:bg-card inline-flex h-12 items-center justify-center gap-2 rounded-full border px-5 text-xs font-semibold transition-all"
            >
              <BookOpen className="text-accent size-4" />
              <span>Documentation Hub</span>
              <ExternalLink className="text-muted size-3" />
            </a>
          </div>
        </Reveal>

        <Reveal
          delay={0.1}
          className="border-border/80 overflow-hidden rounded-3xl border bg-[#0a0a0a]"
        >
          <div className="border-border/40 flex items-center justify-between border-b px-5 py-3.5">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-red-400/70" />
              <span className="size-2.5 rounded-full bg-amber-400/70" />
              <span className="size-2.5 rounded-full bg-emerald-400/70" />
              <span className="text-muted ml-2 font-mono text-[11px]">ARCHITECTURE.md</span>
            </div>

            <span className="font-mono text-[10px] text-emerald-400">Verified MIT</span>
          </div>

          <div className="space-y-2 p-6 font-mono text-xs leading-relaxed text-zinc-300">
            <p>
              <span className="text-emerald-400">license</span>: MIT Open Source
            </p>

            <p>
              <span className="text-emerald-400">storage</span>: client_localstorage (private)
            </p>

            <p>
              <span className="text-emerald-400">render_engine</span>: in-browser vector compiler
            </p>

            <p>
              <span className="text-emerald-400">auth_model</span>: better-auth, passwordless otp
            </p>

            <p>
              <span className="text-emerald-400">export_formats</span>: pdf, docx, md, html, json,
              txt
            </p>

            <p>
              <span className="text-emerald-400">subdomain_router</span>: edge_tls_sni, zero_cookies
            </p>

            <p className="pt-2 text-zinc-600"># Fork it, inspect it, or read the full docs</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default ArchitectureAndDocsSection;
