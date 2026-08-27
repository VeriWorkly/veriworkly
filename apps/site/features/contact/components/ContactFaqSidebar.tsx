import { Bug, HelpCircle, Clock, Sparkles, Globe } from "lucide-react";

import { Reveal } from "@/components/marketing/Reveal";

export const ContactFaqSidebar = () => {
  return (
    <Reveal delay={0.1} className="space-y-5">
      <div className="border-accent/30 bg-accent/4 space-y-2.5 rounded-3xl border p-6 backdrop-blur-xs">
        <div className="text-accent flex items-center gap-2">
          <Clock className="size-4" />

          <p className="font-mono text-[10px] font-bold tracking-widest uppercase">
            Average Response Time
          </p>
        </div>

        <p className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          24 to 48 hours
        </p>

        <p className="text-muted text-xs leading-relaxed">
          We are a focused, dedicated team. Every message is read and answered by a real person on
          our engineering and support team.
        </p>
      </div>

      <div className="border-border/60 bg-card/40 space-y-4 rounded-3xl border p-6 shadow-sm backdrop-blur-xs sm:p-7">
        <h3 className="text-foreground text-base font-bold tracking-tight">
          Common questions we can help with
        </h3>

        <ul className="space-y-4 text-xs sm:text-sm">
          <li className="flex items-start gap-3">
            <span className="bg-accent/10 text-accent ring-accent/20 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg ring-1">
              <Sparkles className="size-3.5" aria-hidden="true" />
            </span>

            <div className="space-y-0.5">
              <strong className="text-foreground block text-xs font-semibold sm:text-sm">
                AI Credits & Billing Questions
              </strong>

              <p className="text-muted text-xs leading-relaxed">
                Need help with a credit pack purchase or payment? We will resolve it right away.
              </p>
            </div>
          </li>

          <li className="flex items-start gap-3">
            <span className="bg-accent/10 text-accent ring-accent/20 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg ring-1">
              <Globe className="size-3.5" aria-hidden="true" />
            </span>

            <div className="space-y-0.5">
              <strong className="text-foreground block text-xs font-semibold sm:text-sm">
                Portfolio Websites & Subdomains
              </strong>

              <p className="text-muted text-xs leading-relaxed">
                Questions on setting up your custom subdomain or syncing projects from GitHub? We
                can help configure it.
              </p>
            </div>
          </li>

          <li className="flex items-start gap-3">
            <span className="bg-accent/10 text-accent ring-accent/20 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg ring-1">
              <HelpCircle className="size-3.5" aria-hidden="true" />
            </span>

            <div className="space-y-0.5">
              <strong className="text-foreground block text-xs font-semibold sm:text-sm">
                Resumes, Cover Letters & ATS
              </strong>

              <p className="text-muted text-xs leading-relaxed">
                Need tips on formatting or how our ATS keyword matcher works with your job
                description? Ask us anytime.
              </p>
            </div>
          </li>

          <li className="flex items-start gap-3">
            <span className="bg-accent/10 text-accent ring-accent/20 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg ring-1">
              <Bug className="size-3.5" aria-hidden="true" />
            </span>

            <div className="space-y-0.5">
              <strong className="text-foreground block text-xs font-semibold sm:text-sm">
                Bug Reports & Feature Ideas
              </strong>

              <p className="text-muted text-xs leading-relaxed">
                Found a glitch or have an idea to make VeriWorkly better? We love hearing community
                suggestions.
              </p>
            </div>
          </li>
        </ul>
      </div>
    </Reveal>
  );
};

export default ContactFaqSidebar;
