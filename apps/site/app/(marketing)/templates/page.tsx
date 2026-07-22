import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowRight,
  Clock,
  FileText,
  Globe2,
  Layers,
  LayoutTemplate,
  Sparkles,
} from "lucide-react";
import { siteConfig } from "@/config/site";
import { documentTypeSummaries, templateSummaries } from "@/config/templates";
import InteractiveCTA from "@/features/marketing/cta/InteractiveCTA";
import { Reveal } from "@/components/marketing/Reveal";
import { SectionEyebrow } from "@/components/marketing/SectionEyebrow";

export const metadata: Metadata = {
  title: `AI Resume, Cover Letter & Portfolio Templates | ${siteConfig.shortName}`,
  description:
    "Browse ATS-friendly AI resume templates, cover letters, and portfolio website designs. Compare layouts and customize them with AI copywriting.",
  alternates: {
    canonical: `${siteConfig.url}/templates`,
    languages: {
      "en-US": `${siteConfig.url}/templates`,
    },
  },
  keywords: [
    "AI resume templates",
    "AI cover letter templates",
    "AI portfolio templates",
    "ATS resume templates",
    "professional document templates",
  ],
  openGraph: {
    title: `AI Resume, Cover Letter & Portfolio Templates | ${siteConfig.shortName}`,
    description:
      "Browse ATS-friendly AI resume templates, cover letters, and portfolio website designs. Compare layouts and customize them with AI copywriting.",
    url: `${siteConfig.url}/templates`,
    siteName: siteConfig.name,
    images: [
      {
        url: "/og/template-page-og.png",
        width: 1200,
        height: 630,
        alt: "VeriWorkly template directory",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Document Template Directory | VeriWorkly",
    description: "Resume, cover letter, and portfolio website templates, organized by type.",
    images: ["/og/template-page-og.png"],
  },
};

const heroFan = templateSummaries
  .filter((template) => !template.previewImage.includes("veriworkly-logo"))
  .slice(0, 3);

const TemplatesPortalPage = () => {
  const availableDocTypes = documentTypeSummaries.filter(
    (docType) => docType.status === "available",
  );
  const plannedDocTypes = documentTypeSummaries.filter((docType) => docType.status === "planned");

  return (
    <>
      <section className="w-full bg-[#f3f4f6] p-2 md:p-3 lg:p-4 dark:bg-black">
        <div className="relative grid w-full overflow-hidden rounded-4xl border border-black/5 bg-white px-6 py-20 md:px-12 md:py-24 lg:grid-cols-12 lg:items-center lg:gap-8 lg:py-28 dark:border-white/5 dark:bg-[#080808]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(120,119,198,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,119,198,0.05)_1px,transparent_1px)] mask-[radial-gradient(ellipse_60%_60%_at_20%_40%,#000_60%,transparent_100%)] bg-size-[24px_24px]" />
          <div className="pointer-events-none absolute top-0 left-0 h-95 w-95 rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-500/15" />

          <Reveal className="relative z-10 lg:col-span-7">
            <SectionEyebrow
              icon={LayoutTemplate}
              label={`${templateSummaries.length} live layouts`}
            />
            <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tighter text-balance text-zinc-900 sm:text-5xl md:text-6xl dark:text-white">
              Pick the artifact. The right layout follows.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
              Resumes, cover letters, and portfolio websites do different jobs. This directory
              separates them from the start, then shows real previews, fit signals, and the exact
              editor path for each template.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href={siteConfig.links.app}
                className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-zinc-950 px-8 text-base font-semibold text-white shadow-md transition-all duration-300 hover:bg-blue-600 active:scale-[0.97] dark:bg-white dark:text-zinc-950 dark:hover:bg-blue-500 dark:hover:text-white"
              >
                Start Building Free
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/features"
                className="inline-flex h-14 items-center justify-center rounded-full border border-black/10 bg-white/70 px-8 text-base font-medium text-zinc-800 backdrop-blur-md transition-colors hover:border-blue-500/30 hover:text-blue-600 dark:border-white/10 dark:bg-black/40 dark:text-zinc-200 dark:hover:text-blue-400"
              >
                See Platform Features
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.15} className="relative z-10 mt-16 lg:col-span-5 lg:mt-0">
            <div className="relative mx-auto h-72 w-full max-w-xs sm:h-80">
              {heroFan.map((template, idx) => {
                const rotations = [-8, 0, 8];
                const offsets = [-24, 0, 24];
                return (
                  <div
                    key={template.id}
                    className="absolute top-0 left-1/2 aspect-8.5/11 h-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-[0_24px_70px_-30px_rgba(15,23,42,0.5)] transition-transform duration-300 hover:-translate-y-2 dark:border-zinc-800"
                    style={{
                      transform: `translateX(calc(-50% + ${offsets[idx]}px)) rotate(${rotations[idx]}deg)`,
                      zIndex: idx === 1 ? 10 : 5 - idx,
                    }}
                  >
                    <Image
                      fill
                      alt={`${template.name} template preview`}
                      src={template.previewImage}
                      className="object-cover object-top"
                      sizes="220px"
                    />
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto w-full max-w-350 px-6 py-16 md:px-8 md:py-20">
        <Reveal className="grid grid-cols-1 divide-y divide-zinc-200 overflow-hidden rounded-3xl border border-zinc-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-[#0c0c0c]">
          <div className="flex items-center gap-4 p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
              <Sparkles className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-white">
                {availableDocTypes.length}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">live document types</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
              <LayoutTemplate className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-white">
                {templateSummaries.length}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">templates ready to use</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
              <Clock className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-white">
                {plannedDocTypes.length}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">coming soon</p>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto w-full max-w-350 border-t border-zinc-200/40 px-6 py-16 md:px-8 md:py-20 dark:border-zinc-800/20">
        <div className="grid gap-6 lg:grid-cols-2" aria-label="Available document types">
          {availableDocTypes.map((docType, idx) => {
            const templatesForType = templateSummaries.filter(
              (template) => template.documentType === docType.id,
            );

            return (
              <Reveal key={docType.id} delay={idx * 0.08}>
                <Link
                  href={docType.href}
                  className="group block rounded-4xl focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <article className="grid min-h-136 overflow-hidden rounded-4xl border border-zinc-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:border-blue-500/30 group-hover:shadow-[0_8px_40px_rgba(59,130,246,0.12)] dark:border-zinc-800/80 dark:bg-[#0c0c0c]">
                    <div className="relative min-h-80 overflow-hidden border-b border-zinc-100 bg-linear-to-br from-blue-500/5 to-transparent p-6 dark:border-zinc-900">
                      <div className="absolute top-5 left-5 z-10 flex items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-zinc-500 backdrop-blur dark:border-zinc-800 dark:bg-[#0c0c0c]/90 dark:text-zinc-400">
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        {templatesForType.length} templates
                      </div>

                      {templatesForType.slice(0, 2).map((template, index) => (
                        <div
                          key={template.id}
                          className={[
                            "absolute top-6 aspect-8.5/11 h-88 overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-[0_24px_70px_-38px_rgba(15,23,42,0.8)] transition-transform duration-300 dark:border-zinc-800",
                            index === 0
                              ? "right-[22%] -rotate-3 group-hover:-translate-y-1.5"
                              : "right-8 rotate-[4deg] group-hover:-translate-y-3",
                          ].join(" ")}
                        >
                          <Image
                            fill
                            alt=""
                            aria-hidden="true"
                            src={template.previewImage}
                            className="object-contain object-top"
                            sizes="(min-width: 1024px) 260px, 70vw"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex min-h-0 flex-col justify-between gap-8 p-7 md:p-8">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                            {docType.pluralLabel}
                          </h2>

                          <ArrowRight
                            className="mt-1 h-5 w-5 shrink-0 text-blue-600 transition-transform group-hover:translate-x-1 dark:text-blue-400"
                            aria-hidden="true"
                          />
                        </div>

                        <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                          {docType.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {docType.highlights.map((highlight) => (
                          <span
                            key={highlight}
                            className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-400"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-350 border-t border-zinc-200/40 px-6 py-16 md:px-8 md:py-20 dark:border-zinc-800/20">
        <div className="mb-8 flex items-center gap-2">
          <Layers className="h-4 w-4 text-zinc-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Coming soon
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3" aria-label="Coming soon document types">
          {plannedDocTypes.map((docType) => (
            <div
              key={docType.id}
              className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50/50 p-6 dark:border-zinc-700 dark:bg-white/2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                  </span>

                  <h3 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
                    {docType.pluralLabel}
                  </h3>
                </div>

                <Globe2 className="h-4 w-4 text-zinc-300 dark:text-zinc-700" aria-hidden="true" />
              </div>

              <p className="mt-4 text-sm leading-6 text-zinc-500 dark:text-zinc-500">
                {docType.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <InteractiveCTA />
    </>
  );
};

export default TemplatesPortalPage;
