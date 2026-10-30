import { ArrowRight, Check, X } from "lucide-react";

import { siteConfig } from "@/config/site";

import { PageSection, TYPE } from "@/components/marketing/PageLayout";

import {
  DISCLOSURE_STEPS,
  DISCLOSURE_IN_SCOPE,
  DISCLOSURE_OUT_OF_SCOPE,
  DISCLOSURE_SAFE_HARBOUR,
} from "../../data";

/* No bug bounty exists, and response times must match SECURITY.md (24-48 hours). */

const linkClass =
  "inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-base font-semibold transition-[opacity,scale] duration-200 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 focus-visible:ring-offset-accent focus-visible:outline-none active:scale-[0.97]";

export const ResponsibleDisclosureSection = () => (
  <>
    <PageSection
      id="disclosure"
      tone="accent"
      title="Found a vulnerability?"
      lede="Report it privately and we will work it through with you. There is no paid bug bounty. What we offer is a fast, honest reply and credit where you want it."
    >
      <ol className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {DISCLOSURE_STEPS.map((step) => (
          <li
            key={step.label}
            className="reveal border-t-2 border-current/30 pt-5 first:border-current"
          >
            <h3 className="text-xl leading-snug font-bold tracking-tight">{step.label}</h3>
            <p className="mt-3 text-base leading-7 opacity-85">{step.detail}</p>
          </li>
        ))}
      </ol>

      <div className="mt-14 flex flex-wrap gap-3">
        <a
          href={`mailto:${siteConfig.securityEmail}`}
          className={`${linkClass} bg-accent-foreground text-accent group`}
        >
          Email a security report
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform duration-200 group-hover:translate-x-1"
          />
        </a>
        <a
          href="/.well-known/security.txt"
          target="_blank"
          rel="noreferrer"
          className={`${linkClass} bg-current/10`}
        >
          security.txt
        </a>
        <a
          href={`${siteConfig.links.github}/discussions`}
          target="_blank"
          rel="noreferrer"
          className={`${linkClass} bg-current/10`}
        >
          Public discussions
        </a>
      </div>
    </PageSection>

    <PageSection
      id="scope"
      title="Where testing is welcome."
      lede="Stay inside these lines, use only your own accounts and data, and your research is authorised."
    >
      <div className="grid gap-12 lg:grid-cols-2">
        {[
          { scope: DISCLOSURE_IN_SCOPE, Icon: Check, iconClass: "text-success" },
          { scope: DISCLOSURE_OUT_OF_SCOPE, Icon: X, iconClass: "text-destructive" },
        ].map(({ scope, Icon, iconClass }) => (
          <div key={scope.category} className="reveal">
            <h3 className="text-2xl font-bold tracking-tight">{scope.category}</h3>
            <ul className="mt-6 space-y-1">
              {scope.items.map((item) => (
                <li
                  key={item}
                  className="border-border flex items-start gap-3 border-t py-3.5 text-base leading-7"
                >
                  <Icon aria-hidden="true" className={`mt-1.5 size-4 shrink-0 ${iconClass}`} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="reveal bg-card mt-16 grid gap-6 rounded-3xl p-6 sm:p-10 lg:grid-cols-[.6fr_1.4fr] lg:gap-12">
        <h3 className={`text-balance ${TYPE.title}`}>{DISCLOSURE_SAFE_HARBOUR.title}</h3>
        <p className="text-base leading-7">{DISCLOSURE_SAFE_HARBOUR.body}</p>
      </div>
    </PageSection>
  </>
);

export default ResponsibleDisclosureSection;
