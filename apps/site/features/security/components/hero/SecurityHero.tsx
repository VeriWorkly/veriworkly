import { siteConfig } from "@/config/site";

import { PageHero } from "@/components/marketing/PageLayout";
import { LandingButton } from "@/components/marketing/LandingButton";

import { SECURITY_COMMITMENTS } from "../../data";
import { SECURITY_LAST_UPDATED } from "@/features/security/data/lastUpdated";

export const SECURITY_POLICY_URL = `${siteConfig.links.github}/blob/master/SECURITY.md`;

export const SecurityHero = () => (
  <PageHero
    title="Local-first."
    highlight="No surprises."
    lede={
      <>
        Your drafts live in your browser. Sync, publishing and AI only run when you ask for them,
        and this page says exactly what leaves your machine when they do.
        <span className="text-muted mt-3 block text-sm">
          Last updated{" "}
          <time dateTime={SECURITY_LAST_UPDATED}>
            {new Date(SECURITY_LAST_UPDATED).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </time>
        </span>
      </>
    }
    aside={
      <div className="flex flex-wrap gap-3">
        <LandingButton
          showArrow
          size="lg"
          variant="solid"
          href={`mailto:${siteConfig.securityEmail}`}
        >
          Report an issue
        </LandingButton>
        <LandingButton size="lg" variant="outline" href={SECURITY_POLICY_URL} target="_blank">
          Read the policy
        </LandingButton>
      </div>
    }
  >
    <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
      {SECURITY_COMMITMENTS.map((item) => (
        <div key={item.title} className="border-border border-t pt-5">
          <dt className="text-xl font-bold tracking-tight text-balance">{item.title}</dt>
          <dd className="text-muted mt-2 text-base leading-7 text-pretty">{item.desc}</dd>
        </div>
      ))}
    </dl>
  </PageHero>
);

export default SecurityHero;
