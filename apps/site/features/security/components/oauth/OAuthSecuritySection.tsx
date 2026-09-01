import { ShieldCheck, Lock } from "lucide-react";

import { Reveal } from "@/components/marketing/Reveal";

import { OAUTH_SCOPES } from "../../data";

export const OAuthSecuritySection = () => {
  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
          OAuth 2.0 &amp; Ingestion Guardrails
        </span>

        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Minimal permission scopes by design
        </h2>

        <p className="text-muted max-w-2xl text-sm leading-relaxed">
          VeriWorkly follows the principle of least privilege. We never request write permissions,
          organization administration, or access to private repository source code.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {OAUTH_SCOPES.map((scopeItem, idx) => (
          <Reveal key={scopeItem.provider} delay={idx * 0.08}>
            <div className="border-border/60 bg-card/40 hover:border-accent/40 relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border p-6 backdrop-blur-sm transition-all duration-300 sm:p-7">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 font-mono text-xs font-bold text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
                    {scopeItem.accessType}
                  </span>

                  <Lock className="text-muted size-4" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-foreground text-base font-bold tracking-tight">
                    {scopeItem.provider}
                  </h3>

                  <p className="text-accent font-mono text-xs font-semibold">
                    Scope: {scopeItem.scope}
                  </p>
                </div>

                <p className="text-muted text-xs leading-relaxed">{scopeItem.purpose}</p>
              </div>

              <div className="border-border/40 mt-5 border-t pt-4">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />

                  <span className="text-foreground/80 font-mono text-[11px] leading-relaxed">
                    {scopeItem.restrictions}
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

export default OAuthSecuritySection;
