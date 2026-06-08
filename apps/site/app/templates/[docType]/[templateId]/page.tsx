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

import { Button, Container } from "@veriworkly/ui";

import { buildEditorUrl, buildPreviewUrl } from "../../components/utils";
import { TemplateDetailHeader } from "../../components/TemplateHeader";

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
        <div className="border-border bg-card/70 overflow-hidden rounded-3xl border shadow-[0_34px_110px_-80px_rgba(15,23,42,0.85)]">
          <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div>
              <p className="text-foreground text-sm font-semibold">
                {isPortfolioTemplate ? "Live website preview" : "Full document preview"}
              </p>
              <p className="text-muted text-xs">
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

          <div className="relative flex min-h-168 items-center justify-center overflow-hidden bg-[linear-gradient(135deg,var(--background),color-mix(in_srgb,var(--accent)_10%,var(--background)))] p-5 sm:p-8">
            <div
              className="absolute top-10 right-10 h-32 w-32 rounded-full opacity-15 blur-3xl"
              style={{ backgroundColor: template.accentColor }}
              aria-hidden="true"
            />

            {isPortfolioTemplate ? (
              <div className="border-border relative h-152 w-full max-w-3xl overflow-hidden rounded-3xl border bg-white shadow-[0_34px_90px_-48px_rgba(15,23,42,0.9)]">
                <div className="border-border flex h-12 items-center justify-between border-b px-4 text-xs font-semibold">
                  <span>{template.editorTemplateId}.veriworkly.com</span>
                  <Globe2 className="text-accent h-4 w-4" aria-hidden="true" />
                </div>
                <div className="bg-background relative min-h-full overflow-hidden p-8">
                  <div
                    className="bg-accent/20 absolute top-10 right-10 h-48 w-48 rounded-full blur-3xl"
                    aria-hidden="true"
                  />
                  <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                    Gautam Raj / VeriWorkly
                  </p>
                  <h3 className="text-foreground mt-8 max-w-xl text-6xl leading-none font-semibold tracking-[-0.07em]">
                    Building products with proof, story, and public presence.
                  </h3>
                  <div className="mt-12 grid gap-3 md:grid-cols-3">
                    {["Portfolio Builder", "Resume Tools", "Publishing System"].map((item) => (
                      <div key={item} className="border-border bg-card rounded-2xl border p-4">
                        <span className="bg-accent block h-2 w-12 rounded-full" />
                        <p className="text-foreground mt-8 text-sm font-semibold">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-border relative aspect-8.5/11 h-152 max-h-[78vh] overflow-hidden rounded-sm border bg-white shadow-[0_34px_90px_-48px_rgba(15,23,42,0.9)]">
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
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="border-border bg-card/80 rounded-3xl border p-6">
            <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
              Fit report
            </p>

            <h2 className="text-foreground mt-3 text-2xl font-semibold tracking-tight">
              Why this one works
            </h2>

            <p className="text-muted mt-3 text-sm leading-6">{template.designVision}</p>

            <ul className="mt-6 space-y-3">
              {template.proofPoints.map((point) => (
                <li key={point} className="text-muted flex gap-3 text-sm leading-6">
                  <CheckCircle2
                    className="text-accent mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-border bg-card/80 rounded-3xl border p-6">
            <p className="text-foreground text-sm font-semibold">Target audience</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {template.audience.map((audience) => (
                <span
                  key={audience}
                  className="border-border bg-background text-muted rounded-full border px-3 py-1.5 text-sm"
                >
                  {audience}
                </span>
              ))}
            </div>
          </div>

          <Button asChild size="lg" variant="primary" className="h-13 w-full rounded-full px-6">
            <Link href={editorUrl}>
              {isPortfolioTemplate ? "Use in Portfolio Builder" : "Use This Template"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          {previewUrl && (
            <Button asChild size="lg" variant="secondary" className="h-13 w-full rounded-full px-6">
              <a href={previewUrl}>
                Open Live Preview
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          )}
        </aside>
      </section>

      <section className="grid gap-4 lg:grid-cols-3" aria-label="Template decision points">
        {template.bestFor.map((item) => (
          <div key={item} className="border-border bg-card/70 rounded-2xl border p-5">
            <CheckCircle2 className="text-accent h-5 w-5" aria-hidden="true" />
            <p className="text-muted mt-4 text-sm leading-6">{item}</p>
          </div>
        ))}
      </section>

      <section className="space-y-5" aria-label="Template system">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-foreground text-3xl font-semibold tracking-tight">
              Template system
            </h2>

            <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
              The layout is not just a skin. These choices decide what recruiters see first and how
              the exported document scans.
            </p>
          </div>
        </div>

        <div className="border-border bg-border grid overflow-hidden rounded-2xl border lg:grid-cols-3">
          {template.typography.map((choice) => (
            <div key={choice} className="bg-card p-5">
              <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                Typography
              </p>

              <p className="text-muted mt-4 text-sm leading-6">{choice}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
        aria-label="Design briefing"
      >
        <div className="border-border bg-card/75 rounded-3xl border p-6">
          <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
            Design direction
          </p>
          <h2 className="text-foreground mt-4 text-3xl font-semibold tracking-tight">
            What the template is trying to communicate
          </h2>
          <p className="text-muted mt-4 text-sm leading-7">{template.designVision}</p>
        </div>

        <div className="border-border bg-border grid overflow-hidden rounded-3xl border md:grid-cols-3">
          {designPrinciples.map((principle) => (
            <div className="bg-card p-5" key={principle}>
              <CheckCircle2 className="text-accent h-5 w-5" aria-hidden="true" />
              <p className="text-muted mt-5 text-sm leading-6">{principle}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3" aria-label="Implementation notes">
        {implementationNotes.map((note) => (
          <div className="border-border bg-card/70 rounded-2xl border p-5" key={note}>
            <p className="text-foreground text-sm font-semibold">Template behavior</p>
            <p className="text-muted mt-3 text-sm leading-6">{note}</p>
          </div>
        ))}
      </section>

      <section className="space-y-5" aria-label="Template structure">
        <h2 className="text-foreground text-3xl font-semibold tracking-tight">
          Structure walkthrough
        </h2>

        <div className="divide-border border-border bg-card/75 divide-y overflow-hidden rounded-2xl border">
          {template.structure.map((section, index) => (
            <div key={section.title} className="grid gap-5 p-5 md:grid-cols-[90px_minmax(0,1fr)]">
              <div className="text-accent text-3xl font-semibold">
                {(index + 1).toString().padStart(2, "0")}
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-foreground text-xl font-semibold">{section.title}</h3>
                  <p className="text-muted mt-1 text-sm leading-6">{section.description}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {section.items.map((item) => (
                    <span
                      key={item}
                      className="border-border bg-background text-muted rounded-full border px-3 py-1.5 text-sm"
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
