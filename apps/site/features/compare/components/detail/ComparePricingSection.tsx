import { Check } from "lucide-react";

import { PageSection, TYPE } from "@/components/marketing/PageLayout";

import CompareCaveatNote from "../shared/CompareCaveatNote";

import { PRICES_CHECKED } from "../../data/competitors";
import { type Competitor } from "../../types";

interface ComparePricingSectionProps {
  competitor: Competitor;
}

/** Rendered under "Included for free" on every /compare page, so each line must be true of the free tier. */
const VERIWORKLY_PRICING_PILLARS = [
  "No account or credit card required to start",
  "Unlimited PDF, Word (DOCX), and Markdown downloads",
  "Documents export with no watermark, on every tier",
  "Target job post ATS keyword checks included",
  "Portfolio publishing on a veriworkly.com subdomain, with the free core templates and a “Built with VeriWorkly” badge (at launch)",
  "Optional pay-as-you-go AI credit packs, no subscription required",
];

export const ComparePricingSection = ({ competitor }: ComparePricingSectionProps) => (
  <PageSection
    id="pricing"
    title={`${competitor.name} pricing in ${PRICES_CHECKED.year}.`}
    lede={`${competitor.name} prices as published on its own site, checked in ${PRICES_CHECKED.month} ${PRICES_CHECKED.year}, beside VeriWorkly. No renewal traps or per-download fees hidden in the small print.`}
  >
    <div className="grid gap-6 lg:grid-cols-2">
      <article className="bg-card reveal flex flex-col rounded-3xl p-7 lg:p-9">
        <h3 className="text-accent text-base font-semibold">VeriWorkly</h3>
        <p className={`mt-4 ${TYPE.figure}`}>$0</p>
        <p className="text-muted mt-3 text-base">The core builder, free for good.</p>

        <h4 className="mt-8 text-base font-semibold">Included for free</h4>
        <ul className="mt-4 space-y-3">
          {VERIWORKLY_PRICING_PILLARS.map((item) => (
            <li key={item} className="flex items-start gap-3 text-base leading-7">
              <Check
                className="text-success mt-1.5 size-4 shrink-0 stroke-[2.5]"
                aria-hidden="true"
              />
              {item}
            </li>
          ))}
        </ul>
      </article>

      <article className="bg-card reveal flex flex-col rounded-3xl p-7 lg:p-9">
        <h3 className="text-muted text-base font-semibold">{competitor.name}</h3>
        <p className={`mt-4 text-balance ${TYPE.title}`}>{competitor.pricingModel}</p>
        <p className="text-muted mt-4 text-base leading-7">{competitor.pricingSummary}</p>

        <h4 className="mt-8 text-base font-semibold">Published plans</h4>
        <ul className="mt-4 grid gap-2">
          {competitor.paidPlans.map((plan) => (
            <li key={plan} className="bg-background rounded-2xl px-5 py-3 text-base font-medium">
              {plan}
            </li>
          ))}
        </ul>
      </article>
    </div>

    <div className="bg-card reveal mt-6 grid items-center gap-5 rounded-3xl p-7 lg:grid-cols-[.6fr_1.4fr] lg:gap-10 lg:p-9">
      <p className={`text-accent ${TYPE.figure}`}>$60 to $180+</p>
      <div>
        <h3 className={TYPE.title}>What a typical 3-month job search costs</h3>
        <p className="text-muted mt-2 max-w-xl text-base leading-7 text-pretty">
          Most job searches take 3 to 6 months. On a $20 to $29 monthly subscription, keeping a
          resume downloadable adds up to $60 to $180 or more. The VeriWorkly core builder costs $0
          for the whole search.
        </p>
      </div>
    </div>

    <CompareCaveatNote competitorName={competitor.name} className="mt-8" />
  </PageSection>
);

export default ComparePricingSection;
