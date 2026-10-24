import Link from "next/link";
import { ArrowDown } from "lucide-react";

import { siteConfig } from "@/config/site";

import { PageHero } from "@/components/marketing/PageLayout";
import { LandingButton } from "@/components/marketing/LandingButton";

import { FEATURE_INDEX } from "../../data";

export const FeaturesHero = () => (
  <PageHero
    title="Every career tool."
    highlight="No paywall."
    lede="VeriWorkly is a free resume, cover letter and portfolio builder. This page covers everything in it: AI-assisted writing, a rules-based ATS checker, GitHub and LinkedIn import, six export formats and a portfolio website, in one private workspace."
    aside={
      <div className="flex flex-wrap items-center gap-3">
        <LandingButton showArrow size="lg" variant="solid" href={siteConfig.links.app}>
          Launch free builder
        </LandingButton>
        <LandingButton size="lg" variant="outline" href="/how-it-works">
          How it works
        </LandingButton>
      </div>
    }
  >
    <nav aria-label="Features on this page">
      <ul className="grid grid-cols-2 gap-x-6 sm:gap-x-10 lg:grid-cols-3">
        {FEATURE_INDEX.map((item) => (
          <li key={item.id} className="border-border border-t">
            <Link
              href={`#${item.id}`}
              className="group focus-visible:ring-accent/40 flex min-h-11 items-start justify-between gap-4 rounded-xl py-4 focus-visible:ring-2 focus-visible:outline-none sm:py-6"
            >
              <span>
                <span className="group-hover:text-accent block text-base leading-snug font-bold tracking-tight text-balance transition-colors duration-200 sm:text-xl">
                  {item.title}
                </span>
                <span className="text-muted mt-1.5 hidden text-base leading-7 text-pretty sm:block">
                  {item.summary}
                </span>
              </span>
              <ArrowDown
                aria-hidden="true"
                className="text-muted group-hover:text-accent mt-0.5 size-5 shrink-0 transition-transform duration-200 group-hover:translate-y-0.5"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  </PageHero>
);

export default FeaturesHero;
