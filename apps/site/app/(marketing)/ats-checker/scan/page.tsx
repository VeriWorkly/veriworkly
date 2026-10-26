import type { Metadata } from "next";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { siteConfig } from "@/config/site";

import { FRAME, TYPE } from "@/components/marketing/PageLayout";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import { AtsCheckerTool } from "@/features/ats-checker/components/tool/AtsCheckerTool";
import { MotionIsland } from "@/providers/motion-island";

const pageOgImage = `${siteConfig.url}/api/og?title=${encodeURIComponent(
  "Scan Your Resume",
)}&description=${encodeURIComponent("Free ATS readiness and job match scoring.")}`;

export const metadata: Metadata = buildPageMetadata({
  path: "/ats-checker/scan",
  title: `Scan Your Resume: Free ATS Checker | ${siteConfig.shortName}`,
  description:
    "Upload or paste your resume for a free ATS readiness score, a job-description keyword match and the most serious issue found. No account required to start.",
  ogTitle: "Scan your resume for free",
  ogDescription: "Upload or paste your resume for an instant ATS readiness score.",
  twitterTitle: "Scan your resume: free ATS check",
  twitterDescription: "No account required to start.",
  image: pageOgImage,
  imageAlt: "VeriWorkly resume scan tool",
  keywords: ["free ATS resume checker", "ATS resume scanner", "resume score checker"],
  noIndex: true,
});

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
    {
      "@type": "ListItem",
      position: 2,
      name: "ATS Checker",
      item: `${siteConfig.url}/ats-checker`,
    },
    { "@type": "ListItem", position: 3, name: "Scan", item: `${siteConfig.url}/ats-checker/scan` },
  ],
};

const SCAN_FACTS = [
  {
    title: "Where your file goes",
    body: "Into memory for the scan, then it is discarded. Nothing is stored, and no account is needed.",
  },
  {
    title: "What you get",
    body: "A readiness score, a job match score when you add a posting, the most serious issue, and your highest-impact fix.",
  },
  {
    title: "What it reads",
    body: "PDF, DOCX, TXT or Markdown. On a PDF it also measures the page layout, which pasted text cannot show.",
  },
];

export default function AtsCheckerScanPage() {
  return (
    <MotionIsland>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />

      <section className="pt-28 pb-24 lg:pt-36 lg:pb-32">
        <div className={FRAME}>
          <Link
            href="/ats-checker"
            className="group text-muted hover:text-foreground focus-visible:ring-accent/40 inline-flex items-center gap-2 rounded-full text-base font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArrowLeft
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
            />
            ATS checker overview
          </Link>

          <div className="mt-8 grid gap-14 lg:grid-cols-[1fr_300px] lg:gap-16">
            <div className="min-w-0">
              <h1 className={TYPE.section}>Scan your resume</h1>
              <p className={`text-muted mt-4 max-w-xl ${TYPE.lede}`}>
                Three steps: add your resume, add a job description if you want a keyword match
                against a specific role, then read the score.
              </p>

              <div className="mt-10">
                <AtsCheckerTool />
              </div>
            </div>

            <aside className="lg:sticky lg:top-28 lg:self-start lg:pt-3">
              <dl className="space-y-8">
                {SCAN_FACTS.map((fact) => (
                  <div key={fact.title} className="border-border border-t pt-5">
                    <dt className="text-base font-semibold">{fact.title}</dt>
                    <dd className="text-muted mt-2 text-base leading-7">{fact.body}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          </div>
        </div>
      </section>
    </MotionIsland>
  );
}
