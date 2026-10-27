import { Check } from "lucide-react";

import { PageHero } from "@/components/marketing/PageLayout";
import { LandingButton } from "@/components/marketing/LandingButton";

import { ReportPreview } from "./ReportPreview";

const PROMISES = ["Nothing stored", "Same resume, same score", "Never paywalled"];

export function AtsHero() {
  return (
    <PageHero
      title="Is your resume"
      highlight="ATS-ready?"
      lede="A free ATS resume checker: 35 published rules read your resume the way an applicant tracking system does, show which fields come out empty, and match it to a job description. Two scans a day with a free account, one every 48 hours without."
      aside={
        <>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <LandingButton showArrow size="lg" variant="solid" href="/ats-checker/scan">
              Scan your resume
            </LandingButton>
            <a
              href="#how-it-scores"
              className="hover:text-accent focus-visible:ring-accent/40 rounded-full text-base font-semibold underline decoration-current/30 underline-offset-4 transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none"
            >
              See what it checks
            </a>
          </div>

          <ul className="text-muted mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {PROMISES.map((promise) => (
              <li key={promise} className="flex items-center gap-1.5">
                <Check aria-hidden="true" className="text-success size-4" />
                {promise}
              </li>
            ))}
          </ul>
        </>
      }
    >
      <ReportPreview />
    </PageHero>
  );
}

export default AtsHero;
