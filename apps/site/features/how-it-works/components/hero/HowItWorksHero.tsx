import Link from "next/link";
import { ArrowDown } from "lucide-react";

import { siteConfig } from "@/config/site";

import { PageHero } from "@/components/marketing/PageLayout";
import { LandingButton } from "@/components/marketing/LandingButton";

import { WORKFLOW_STEPS } from "../../data";

export const HowItWorksHero = () => (
  <PageHero
    title="From draft"
    highlight="to dream job."
    lede="VeriWorkly turns one career profile into resumes, cover letters and a portfolio website. The workflow: import your history, draft in the studio, tailor with AI, check against a job posting, then export or publish."
    aside={
      <div className="flex flex-wrap items-center gap-3">
        <LandingButton showArrow size="lg" variant="solid" href={siteConfig.links.app}>
          Open Studio
        </LandingButton>
        <LandingButton size="lg" variant="outline" href={siteConfig.links.docs} target="_blank">
          Read the docs
        </LandingButton>
      </div>
    }
  >
    {/* The route, in order. Each stop jumps to its step below. */}
    <nav aria-label="The five steps">
      <ol className="grid gap-2 lg:grid-cols-5">
        {WORKFLOW_STEPS.map((step) => (
          <li key={step.id} className="flex">
            <Link
              href={`#${step.id}`}
              className="group bg-card focus-visible:ring-accent/40 flex min-h-11 flex-1 items-center justify-between gap-4 rounded-2xl px-5 py-3.5 transition-transform duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98] lg:flex-col lg:items-start lg:justify-start lg:gap-2 lg:rounded-3xl lg:p-5 lg:hover:-translate-y-1"
            >
              <span className="group-hover:text-accent text-base leading-snug font-bold tracking-tight transition-colors duration-200 lg:text-lg">
                {step.label}
              </span>
              <span className="text-muted hidden text-sm leading-6 text-pretty lg:block">
                {step.subtitle}
              </span>
              <ArrowDown
                aria-hidden="true"
                className="text-muted size-4 shrink-0 transition-transform duration-200 group-hover:translate-y-0.5 lg:hidden"
              />
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  </PageHero>
);

export default HowItWorksHero;
