import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, ExternalLink, Globe2 } from "lucide-react";

import {
  templateSummaries,
  getDocumentTypeSummary,
  getTemplateByDocumentTypeAndId,
} from "@/config/templates";
import { siteConfig } from "@/config/site";

import { Container } from "@veriworkly/ui";
import { Reveal } from "@/components/marketing/Reveal";

import { buildEditorUrl, buildPreviewUrl } from "@/features/templates/utils";
import TemplateDetailHeader from "@/features/templates/TemplateHeader";

type PageProps = {
  params: Promise<{ docType: string; templateId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { docType, templateId } = await params;

  const template = getTemplateByDocumentTypeAndId(docType, templateId);

  if (!template) {
    return {
      title: "Template Not Found | VeriWorkly",
    };
  }

  return {
    title: template.seo.title,
    description: template.seo.description,
    alternates: {
      canonical: `${siteConfig.url}/templates/${docType}/${templateId}`,
    },
    openGraph: {
      title: template.seo.title,
      description: template.seo.description,
      url: `${siteConfig.url}/templates/${docType}/${templateId}`,
      siteName: siteConfig.name,
      images: [
        {
          url: template.previewImage,
          width: 1200,
          height: 1600,
          alt: `${template.name} ${template.documentTypeLabel.toLowerCase()} template preview`,
        },
      ],
      type: "website",
    },
  };
}

export function generateStaticParams() {
  return templateSummaries.map((template) => ({
    docType: template.documentType,
    templateId: template.id,
  }));
}

const TemplateDetailPage = async ({ params }: PageProps) => {
  const { docType, templateId } = await params;

  const docTypeData = getDocumentTypeSummary(docType);
  const template = getTemplateByDocumentTypeAndId(docType, templateId);

  if (!docTypeData || !template) notFound();

  const editorUrl = buildEditorUrl(template);
  const previewUrl = buildPreviewUrl(template);
  const isPortfolioTemplate = template.documentType === "portfolio-website";
  const designPrinciples = isPortfolioTemplate
    ? [
        "The template behaves like a real public website rather than a static document preview.",
        "The same portfolio profile can move between website templates without losing content.",
        "The hierarchy is tuned for proof first: opening claim, project scan, and clear contact path.",
      ]
    : [
        "The template is designed around the first human scan before decorative detail.",
        "Spacing and hierarchy keep exported pages readable, credible, and easy to compare.",
        "The system balances visual distinction with safe structure for the document type.",
      ];
  const implementationNotes = isPortfolioTemplate
    ? [
        "Supports public VeriWorkly subdomain publishing.",
        "Works with portfolio metadata controls for title, description, and sharing.",
        "Uses the same portfolio content model as other website templates, so switching does not erase content.",
      ]
    : [
        "Exports from the document editor using production template assets.",
        "Keeps typography and spacing consistent with the selected document family.",
        "Uses editor-ready content regions rather than flat image-only previews.",
      ];

  return (
    <Container className="space-y-14 pt-28 pb-16 lg:pt-36">
      <TemplateDetailHeader template={template} />

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-start">
        <Reveal className="overflow-hidden rounded-4xl border border-zinc-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-800/80 dark:bg-[#0c0c0c]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-900">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                {isPortfolioTemplate ? "Live website preview" : "Full document preview"}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isPortfolioTemplate
                  ? "Open the production portfolio route for the full scrollable page"
                  : "Rendered from the production template asset"}
              </p>
            </div>

            <span
              className="h-3 w-16 rounded-full"
              style={{ backgroundColor: template.accentColor }}
              aria-hidden="true"
            />
          </div>

          <div className="relative flex min-h-168 items-center justify-center overflow-hidden bg-linear-to-br from-blue-500/5 to-transparent p-5 sm:p-8">
            <div
              className="absolute top-10 right-10 h-32 w-32 rounded-full opacity-15 blur-3xl"
              style={{ backgroundColor: template.accentColor }}
              aria-hidden="true"
            />

            {isPortfolioTemplate ? (
              <div className="relative h-152 w-full max-w-3xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_34px_90px_-48px_rgba(15,23,42,0.9)] dark:border-zinc-800">
                <div className="flex h-12 items-center justify-between border-b border-zinc-200 px-4 text-xs font-semibold dark:border-zinc-800">
                  <span>{template.editorTemplateId}.veriworkly.com</span>
                  <Globe2 className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                </div>
                <div className="relative min-h-full overflow-hidden bg-white p-8 dark:bg-[#080808]">
                  <div
                    className="absolute top-10 right-10 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl"
                    aria-hidden="true"
                  />
                  <p className="text-xs font-semibold tracking-[0.18em] text-zinc-400 uppercase dark:text-zinc-500">
                    Gautam Raj / VeriWorkly
                  </p>
                  <h3 className="mt-8 max-w-xl text-6xl leading-none font-semibold tracking-[-0.07em] text-zinc-900 dark:text-white">
                    Building products with proof, story, and public presence.
                  </h3>
                  <div className="mt-12 grid gap-3 md:grid-cols-3">
                    {["Portfolio Builder", "Resume Tools", "Publishing System"].map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#0c0c0c]"
                      >
                        <span className="block h-2 w-12 rounded-full bg-blue-500" />
                        <p className="mt-8 text-sm font-semibold text-zinc-900 dark:text-white">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative aspect-8.5/11 h-152 max-h-[78vh] overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-[0_34px_90px_-48px_rgba(15,23,42,0.9)] dark:border-zinc-800">
                <Image
                  fill
                  priority
                  src={template.previewImage}
                  alt={`${template.name} ${template.documentTypeLabel.toLowerCase()} template preview`}
                  sizes="(min-width: 1024px) 620px, 92vw"
                  className="object-contain object-top"
                />
              </div>
            )}
          </div>
        </Reveal>

        <Reveal delay={0.08} className="space-y-5 lg:sticky lg:top-24">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-800/80 dark:bg-[#0c0c0c]">
            <p className="text-xs font-semibold tracking-[0.18em] text-zinc-400 uppercase dark:text-zinc-500">
              Fit report
            </p>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              Why this one works
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              {template.designVision}
            </p>

            <ul className="mt-6 space-y-3">
              {template.proofPoints.map((point) => (
                <li
                  key={point}
                  className="flex gap-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400"
                >
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-blue-500"
                    aria-hidden="true"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-800/80 dark:bg-[#0c0c0c]">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Target audience</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {template.audience.map((audience) => (
                <span
                  key={audience}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-400"
                >
                  {audience}
                </span>
              ))}
            </div>
          </div>

          <Link
            href={editorUrl}
            className="group flex h-13 w-full items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:bg-blue-600 active:scale-[0.97] dark:bg-white dark:text-zinc-950 dark:hover:bg-blue-500 dark:hover:text-white"
          >
            {isPortfolioTemplate ? "Use in Portfolio Builder" : "Use This Template"}
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
          {previewUrl && (
            <a
              href={previewUrl}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-full border border-zinc-200 px-6 text-sm font-semibold text-zinc-800 transition-colors hover:border-blue-500/30 hover:text-blue-600 dark:border-zinc-800 dark:text-zinc-200 dark:hover:text-blue-400"
            >
              Open Live Preview
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
        </Reveal>
      </section>

      <section className="grid gap-4 lg:grid-cols-3" aria-label="Template decision points">
        {template.bestFor.map((item, idx) => (
          <Reveal
            key={item}
            delay={idx * 0.06}
            className="rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800/80 dark:bg-[#0c0c0c]"
          >
            <CheckCircle2 className="h-5 w-5 text-blue-500" aria-hidden="true" />
            <p className="mt-4 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{item}</p>
          </Reveal>
        ))}
      </section>

      <section className="space-y-5" aria-label="Template system">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              Template system
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              The layout is not just a skin. These choices decide what recruiters see first and how
              the exported document scans.
            </p>
          </div>
        </div>

        <div className="grid overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-200 lg:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-800">
          {template.typography.map((choice) => (
            <div key={choice} className="bg-white p-5 dark:bg-[#0c0c0c]">
              <p className="text-xs font-semibold tracking-[0.18em] text-zinc-400 uppercase dark:text-zinc-500">
                Typography
              </p>

              <p className="mt-4 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{choice}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
        aria-label="Design briefing"
      >
        <div className="rounded-4xl border border-zinc-200 bg-white p-6 dark:border-zinc-800/80 dark:bg-[#0c0c0c]">
          <p className="text-xs font-semibold tracking-[0.18em] text-zinc-400 uppercase dark:text-zinc-500">
            Design direction
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            What the template is trying to communicate
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-500 dark:text-zinc-400">
            {template.designVision}
          </p>
        </div>

        <div className="grid overflow-hidden rounded-4xl border border-zinc-200 bg-zinc-200 md:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-800">
          {designPrinciples.map((principle) => (
            <div className="bg-white p-5 dark:bg-[#0c0c0c]" key={principle}>
              <CheckCircle2 className="h-5 w-5 text-blue-500" aria-hidden="true" />
              <p className="mt-5 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{principle}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="grid gap-px overflow-hidden rounded-4xl border border-zinc-200 bg-zinc-200 lg:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-800"
        aria-label="Implementation notes"
      >
        {implementationNotes.map((note) => (
          <div className="bg-white p-5 dark:bg-[#0c0c0c]" key={note}>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Template behavior</p>
            <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{note}</p>
          </div>
        ))}
      </section>

      <section className="space-y-5" aria-label="Template structure">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          Structure walkthrough
        </h2>

        <div className="divide-y divide-zinc-200 overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800/80 dark:bg-[#0c0c0c]">
          {template.structure.map((section, index) => (
            <div key={section.title} className="grid gap-5 p-5 md:grid-cols-[90px_minmax(0,1fr)]">
              <div className="text-3xl font-semibold text-blue-500">
                {(index + 1).toString().padStart(2, "0")}
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">
                    {section.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                    {section.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {section.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-400"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Container>
  );
};

export default TemplateDetailPage;
