import type { Metadata } from "next";
import { Check, Scale, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { buildPageMetadata } from "@/utils/metadata";
import { jsonLdScriptProps } from "@/utils/json-ld";
import InteractiveCTA from "@/features/marketing/cta/InteractiveCTA";
import { Reveal } from "@/components/marketing/Reveal";
import { SectionEyebrow } from "@/components/marketing/SectionEyebrow";
import CapabilityMosaic from "@/features/features-page/CapabilityMosaic";

export const revalidate = false;
export const dynamic = "force-static";

const pageUrl = `${siteConfig.url}/features`;
const pageOgImage = `${siteConfig.url}/api/og?title=${encodeURIComponent(
  "Platform Features & AI Tools",
)}&description=${encodeURIComponent(
  "AI resume tailoring, AI cover letter writing, ATS scoring, and portfolios with local-first sync.",
)}`;

export const metadata: Metadata = buildPageMetadata({
  path: "/features",
  title: `Platform Features: AI Resume, ATS & Portfolios | ${siteConfig.shortName}`,
  description:
    "AI resume tailoring, an AI cover letter writer, a free ATS checker, GitHub/LinkedIn import, and web portfolio publishing — all local-first.",
  ogTitle: "Everything Inside the VeriWorkly Workspace",
  ogDescription:
    "AI resume tailoring, cover letter generation, a free ATS checker, GitHub/LinkedIn import, and portfolio publishing, all local-first.",
  twitterTitle: "One workspace, every career tool",
  twitterDescription:
    "AI resume and cover letter tools, a free ATS checker, and portfolio publishing — private by default.",
  image: pageOgImage,
  imageAlt: "VeriWorkly Platform Features",
  keywords: [
    "VeriWorkly features",
    "AI resume tailoring tool",
    "AI cover letter writer",
    "free ATS checker",
    "AI resume rewrite",
  ],
});

const comparisonRows = [
  {
    feature: "Layout PDF downloads",
    veriworkly: "100% free, compiled locally",
    competitor: "Hidden behind paywalls and trials",
  },
  {
    feature: "Sign-up gating",
    veriworkly: "No registration required",
    competitor: "Mandatory account required",
  },
  {
    feature: "Data storage location",
    veriworkly: "Local-first, LocalStorage",
    competitor: "Locked on proprietary servers",
  },
  {
    feature: "Data sync security",
    veriworkly: "Cloud sync, optional",
    competitor: "Plaintext analytics profiles",
  },
  {
    feature: "Open source audits",
    veriworkly: "Auditable MIT core",
    competitor: "Closed, opaque databases",
  },
  {
    feature: "Career assets",
    veriworkly: "Resumes, cover letters, ATS scoring, and web portfolios",
    competitor: "Mainly only resumes",
  },
];

const FeaturesPage = () => {
  const featuresSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "VeriWorkly Platform Features",
    url: pageUrl,
    description:
      "Comprehensive features list including document editors, the ATS checker, GitHub/LinkedIn import, web portfolios, and cloud sync.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(featuresSchema)}
      />

      <section className="w-full bg-[#f3f4f6] p-2 md:p-3 lg:p-4 dark:bg-black">
        <div className="relative flex w-full flex-col items-center overflow-hidden rounded-4xl border border-black/5 bg-white px-6 pt-28 pb-20 text-center md:pt-32 md:pb-24 dark:border-white/5 dark:bg-[#080808]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(120,119,198,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,119,198,0.05)_1px,transparent_1px)] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] bg-size-[24px_24px]" />
          <div className="pointer-events-none absolute top-0 left-1/2 h-105 w-full max-w-225 -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-500/15" />

          <Reveal priority className="relative z-10 flex max-w-3xl flex-col items-center">
            <SectionEyebrow icon={Sparkles} label="Capabilities" className="mb-6" />

            <h1 className="text-4xl font-semibold tracking-tighter text-balance text-zinc-900 sm:text-5xl md:text-6xl dark:text-white">
              Tools for your professional identity
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
              AI resume and cover letter writing, a free ATS checker, portfolio publishing, and
              GitHub/LinkedIn import, integrated under one privacy-first career workspace.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
              <Link
                href={siteConfig.links.app}
                className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-zinc-950 px-8 text-base font-semibold text-white shadow-md transition-all duration-300 hover:bg-blue-600 active:scale-[0.97] dark:bg-white dark:text-zinc-950 dark:hover:bg-blue-500 dark:hover:text-white"
              >
                Start Building
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex h-14 items-center justify-center rounded-full border border-black/10 bg-white/70 px-8 text-base font-medium text-zinc-800 backdrop-blur-md transition-colors hover:border-blue-500/30 hover:text-blue-600 dark:border-white/10 dark:bg-black/40 dark:text-zinc-200 dark:hover:text-blue-400"
              >
                See How It Works
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto w-full max-w-350 px-6 py-24 md:px-8 md:py-32">
        <CapabilityMosaic />
      </section>

      <section className="mx-auto w-full max-w-350 border-t border-zinc-200/40 px-6 py-24 md:px-8 md:py-32 dark:border-zinc-800/20">
        <div className="mx-auto max-w-2xl text-center">
          <SectionEyebrow icon={Scale} label="Platform difference" className="mx-auto" />
          <h2 className="mt-6 font-sans text-4xl font-semibold tracking-tighter text-balance text-zinc-900 md:text-5xl dark:text-white">
            How we build against subscription-trap portals
          </h2>
        </div>

        <Reveal className="mt-14 overflow-x-auto">
          <table className="w-full min-w-160 border-separate border-spacing-0">
            <caption className="sr-only">
              Feature comparison between VeriWorkly and traditional career portals
            </caption>
            <thead>
              <tr>
                <th scope="col" className="w-2/5 pb-5 text-left align-bottom">
                  <span className="text-xs font-semibold tracking-tight text-zinc-400 uppercase">
                    Feature
                  </span>
                </th>
                <th scope="col" className="w-[30%] px-6 pb-5 text-left align-bottom">
                  <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                    Traditional competitors
                  </span>
                </th>
                <th
                  scope="col"
                  className="w-[30%] rounded-t-2xl border border-b-0 border-blue-500/15 bg-blue-500/4 px-6 pt-5 pb-5 text-left align-bottom dark:bg-blue-500/6"
                >
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">
                    VeriWorkly Platform
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, index) => {
                const isLast = index === comparisonRows.length - 1;
                return (
                  <tr key={row.feature}>
                    <th
                      scope="row"
                      className="border-t border-zinc-100 py-5 pr-4 text-left text-sm font-semibold text-zinc-800 dark:border-zinc-900 dark:text-zinc-200"
                    >
                      {row.feature}
                    </th>
                    <td className="border-t border-zinc-100 px-6 py-5 dark:border-zinc-900">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600">
                          <X className="h-3 w-3" strokeWidth={3} />
                        </span>
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                          {row.competitor}
                        </span>
                      </div>
                    </td>
                    <td
                      className={`border-x border-t border-blue-500/15 bg-blue-500/4 px-6 py-5 dark:bg-blue-500/6 ${
                        isLast ? "rounded-b-2xl border-b" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          {row.veriworkly}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Reveal>
      </section>

      <InteractiveCTA />
    </>
  );
};

export default FeaturesPage;
