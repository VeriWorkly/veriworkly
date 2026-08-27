import type { Metadata } from "next";

import {
  Type,
  Lock,
  Gauge,
  Scale,
  Layers,
  Sparkles,
  ArrowRight,
  FileSearch,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import { Reveal } from "@/components/marketing/Reveal";
import { SectionEyebrow } from "@/components/marketing/SectionEyebrow";

import { faqs } from "@/features/faq/data/faqItems";
import InteractiveCTA from "@/features/marketing/cta/InteractiveCTA";
import { ReportPreview } from "@/features/ats-checker/components/ReportPreview";
import { TierComparison } from "@/features/ats-checker/components/TierComparison";

export const revalidate = false;
export const dynamic = "force-static";

const pageUrl = `${siteConfig.url}/ats-checker`;
const scanUrl = `${pageUrl}/scan`;
const pageOgImage = `${siteConfig.url}/api/og?title=${encodeURIComponent(
  "Free ATS Resume Checker",
)}&description=${encodeURIComponent(
  "Score your resume against a job description with the same rules-based engine used in the product.",
)}`;

export const metadata: Metadata = buildPageMetadata({
  path: "/ats-checker",

  title: `Free ATS Resume Checker — Score & Keyword Match | ${siteConfig.shortName}`,
  description:
    "Scan your resume for parsing risks, missing evidence, and job-description keyword match — free, no account required. Full breakdown with a free account; AI analysis on paid plans.",

  ogTitle: "Free ATS Resume Checker",
  ogDescription:
    "The same rules-based scoring engine used inside VeriWorkly — check parsing, structure, evidence, and job match for free.",

  twitterTitle: "Is your resume ATS-ready? Check for free",
  twitterDescription:
    "Rules-based readiness score plus a job-description keyword match — no account required to start.",

  image: pageOgImage,
  imageAlt: "VeriWorkly Free ATS Resume Checker",

  keywords: [
    "free ATS resume checker",
    "ATS resume scanner",
    "resume score checker",
    "ATS keyword match checker",
    "is my resume ATS friendly",
    "applicant tracking system checker",
  ],
});

const checkCategories = [
  {
    icon: FileSearch,
    title: "Parsing & format risk",
    body: "Word count sanity, table characters, and repeated page headers — the layout issues that make a parser drop or scramble content before a recruiter ever sees it.",
  },
  {
    icon: ShieldCheck,
    title: "Contact & structure",
    body: "Email, phone, a professional link, and clearly labeled Experience, Education, and Skills sections — the fields most ATS platforms extract into searchable columns.",
  },
  {
    icon: Type,
    title: "Evidence quality",
    body: "Action verbs and quantified impact, graded by how much of the resume actually carries measurable outcomes — not just whether one example exists.",
  },
  {
    icon: Gauge,
    title: "Job match",
    body: 'Synonym- and phrase-aware keyword matching against a pasted job description, weighted toward terms that show up under "Requirements" over "Nice to have."',
  },
];

const pipeline = [
  {
    step: "Upload",
    title: "Your file is converted to plain text",
    body: "A PDF is a set of drawing instructions, not a document. Extraction rebuilds reading order from those instructions, which is why multi-column layouts, text boxes, and header/footer repetition come out interleaved or missing.",
  },
  {
    step: "Extract",
    title: "Fields are pulled into database columns",
    body: "Name, email, phone, employer, title, and dates are matched out of the text into structured fields. Anything the parser cannot confidently locate is left blank on your candidate record, whether or not it was on the page.",
  },
  {
    step: "Search",
    title: "Recruiters filter on those fields and on keywords",
    body: "Most shortlists start as a search across the parsed text and fields. A skill described only in a graphic, a footer, or a phrase the posting never uses is not part of that index.",
  },
  {
    step: "Read",
    title: "A person reads what survived",
    body: "The document a recruiter opens is your original file, but the shortlist that got them there was built from the parsed version. Both have to hold up.",
  },
];

const scoreFacts = [
  {
    icon: Layers,
    title: "Two scores, two different questions",
    body: "Readiness measures parsing and formatting only, so it barely moves between similarly-formatted resumes. Job match compares your text against a specific posting. If you want a number that reacts to the role, paste the description.",
  },
  {
    icon: Scale,
    title: "There is no universal ATS score",
    body: 'No applicant tracking system publishes a candidate score, and any tool claiming to show you "your Workday score" is showing you its own. This one is explicit about that: it scores what is objectively checkable in your text.',
  },
  {
    icon: Lock,
    title: "Nothing you paste is stored",
    body: "Your resume and the job description are scored in memory and dropped when the response is sent. There is no account required, no file retention, and no training on your content.",
  },
];

const pageFaqIds = [
  "ats-checker-overview",
  "ats-two-scores-explained",
  "ats-scan-privacy",
  "ats-friendly-templates",
];
const pageFaqs = pageFaqIds
  .map((id) => faqs.find((faq) => faq.id === id))
  .filter((faq): faq is (typeof faqs)[number] => Boolean(faq));

export default function AtsCheckerPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pageFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "VeriWorkly ATS Checker",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any (web-based)",
    url: scanUrl,
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    featureList: checkCategories.map((item) => item.title),
    description:
      "A free, rules-based ATS resume checker that scores parsing, structure, evidence, and job-description keyword match.",
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to check whether your resume is ATS-ready",
    description:
      "Score a resume for parsing risks, structure, evidence quality, and job-description keyword match using VeriWorkly's free rules-based ATS checker.",
    totalTime: "PT2M",
    estimatedCost: { "@type": "MonetaryAmount", currency: "USD", value: "0" },
    tool: [{ "@type": "HowToTool", name: "VeriWorkly ATS Checker" }],
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Add your resume",
        text: "Upload a PDF, DOCX, TXT, or Markdown resume, or paste the text directly. Nothing is stored.",
        url: scanUrl,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Paste the job description",
        text: "Optional. Adding the posting produces a keyword match score weighted toward terms under Requirements.",
        url: scanUrl,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Read the report",
        text: "Get an ATS readiness score, a per-area breakdown, and fixes ordered by how many points each one recovers.",
        url: scanUrl,
      },
    ],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "ATS Checker", item: pageUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScriptProps(faqSchema)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(softwareSchema)}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScriptProps(howToSchema)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />

      <section className="w-full bg-[#f3f4f6] p-2 md:p-3 lg:p-4 dark:bg-black">
        <div className="relative w-full overflow-hidden rounded-4xl border border-black/5 bg-white px-6 pt-28 pb-20 md:px-10 md:pt-32 md:pb-24 dark:border-white/5 dark:bg-[#080808]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(120,119,198,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,119,198,0.05)_1px,transparent_1px)] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] bg-size-[24px_24px]" />
          <div className="pointer-events-none absolute top-0 left-1/2 h-105 w-full max-w-225 -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-500/15" />

          <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1fr_0.85fr] lg:gap-16">
            <Reveal priority className="flex flex-col items-start text-left">
              <SectionEyebrow icon={Gauge} label="Free · no account required" className="mb-6" />

              <h1 className="text-4xl font-semibold tracking-tighter text-balance text-zinc-900 sm:text-5xl md:text-6xl dark:text-white">
                Is your resume actually ATS-ready?
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
                The same rules-based scoring engine used inside VeriWorkly: parsing, structure,
                evidence, and job-description keyword match. You get a score, a breakdown of where
                it went, and the fixes worth making first.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/ats-checker/scan"
                  className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-zinc-950 px-8 text-base font-semibold text-white shadow-md transition-all duration-300 hover:bg-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] dark:bg-white dark:text-zinc-950 dark:hover:bg-blue-500 dark:hover:text-white dark:focus-visible:ring-offset-black"
                >
                  Scan your resume free
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>

                <Link
                  href="#how-it-scores"
                  className="inline-flex h-14 items-center justify-center rounded-full border border-black/10 bg-white/70 px-8 text-base font-medium text-zinc-800 backdrop-blur-md transition-colors hover:border-blue-500/30 hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:border-white/10 dark:bg-black/40 dark:text-zinc-200 dark:hover:text-blue-400"
                >
                  See what it checks
                </Link>
              </div>

              <p className="mt-6 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Scored in memory. Nothing you upload or paste is stored.
              </p>
            </Reveal>

            <Reveal delay={0.12} className="w-full">
              <ReportPreview />
            </Reveal>
          </div>
        </div>
      </section>

      <section
        id="how-it-scores"
        className="mx-auto w-full max-w-350 scroll-mt-24 px-6 py-24 md:px-8 md:py-32"
      >
        <Reveal className="max-w-2xl">
          <SectionEyebrow icon={Sparkles} label="How it scores" />

          <h2 className="mt-6 text-3xl font-semibold tracking-tighter text-balance text-zinc-900 md:text-4xl dark:text-white">
            Four categories, computed from your actual text
          </h2>

          <p className="mt-4 text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
            Every check runs against the resume you provide — there is no placeholder score. The
            exact rule weights stay private so the answer key cannot be gamed, but the categories
            themselves are not a secret.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {checkCategories.map((item, index) => (
            <Reveal
              key={item.title}
              delay={index * 0.05}
              className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-white/2"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                <item.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>

              <h3 className="mt-5 text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                {item.title}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {item.body}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-350 border-t border-zinc-200/40 px-6 py-24 md:px-8 md:py-32 dark:border-zinc-800/20">
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tighter text-balance text-zinc-900 md:text-4xl dark:text-white">
            What an applicant tracking system does to your resume
          </h2>

          <p className="mt-4 text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
            Every check above exists because of one of these four stages. Knowing the pipeline is
            most of knowing what to fix.
          </p>
        </Reveal>

        <ol className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {pipeline.map((stage, index) => (
            <li key={stage.step} className="flex">
              <Reveal
                delay={index * 0.05}
                className="w-full rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-white/2"
              >
                <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {stage.step}
                </span>

                <h3 className="mt-3 text-base font-semibold tracking-tight text-balance text-zinc-900 dark:text-white">
                  {stage.title}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {stage.body}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {scoreFacts.map((fact, index) => (
            <Reveal
              key={fact.title}
              delay={index * 0.05}
              className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-white/2"
            >
              <fact.icon
                className="h-5 w-5 text-zinc-500 dark:text-zinc-400"
                strokeWidth={1.75}
                aria-hidden="true"
              />

              <h3 className="mt-4 text-base font-semibold tracking-tight text-zinc-900 dark:text-white">
                {fact.title}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                {fact.body}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-350 border-t border-zinc-200/40 px-6 py-24 md:px-8 md:py-32 dark:border-zinc-800/20">
        <Reveal className="max-w-2xl">
          <SectionEyebrow icon={Sparkles} label="What you get, at each level" />

          <h2 className="mt-6 text-3xl font-semibold tracking-tighter text-balance text-zinc-900 md:text-4xl dark:text-white">
            Score for free. Unlock the full breakdown when you are ready.
          </h2>

          <p className="mt-4 text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
            Anyone can see how their resume scores and which area is dragging it down. The
            rule-by-rule reasoning takes a free account, and AI-written explanations are part of the
            AI plan.
          </p>
        </Reveal>

        <div className="mt-14">
          <TierComparison />
        </div>
      </section>

      <section className="mx-auto w-full max-w-250 border-t border-zinc-200/40 px-6 py-24 md:px-8 md:py-32 dark:border-zinc-800/20">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tighter text-zinc-900 md:text-4xl dark:text-white">
            Common questions
          </h2>
        </Reveal>

        <div className="mt-10 space-y-4">
          {pageFaqs.map((faq, index) => (
            <Reveal
              key={faq.id}
              delay={index * 0.04}
              className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800"
            >
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                {faq.question}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {faq.answer}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      <InteractiveCTA />
    </>
  );
}
