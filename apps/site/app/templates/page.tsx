import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, Clock, FileText, Layers } from "lucide-react";

import { Badge, Container } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";
import { documentTypeSummaries, templateSummaries } from "@/config/templates";

export const metadata: Metadata = {
  title: "Template Directory | VeriWorkly",
  description:
    "Explore VeriWorkly templates by type, including resumes, cover letters, and portfolio websites with production-ready previews and editor-ready layouts.",
  keywords: [
    "document templates",
    "resume templates",
    "cover letter templates",
    "ATS resume templates",
    "professional document templates",
  ],
  openGraph: {
    title: "Document Template Directory | VeriWorkly",
    description:
      "Browse resume, cover letter, and portfolio website templates by type, compare design intent, and start from the right layout.",
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
  alternates: {
    canonical: `${siteConfig.url}/templates`,
  },
};

const TemplatesPortalPage = () => {
  const availableDocTypes = documentTypeSummaries.filter(
    (docType) => docType.status === "available",
  );
  const plannedDocTypes = documentTypeSummaries.filter((docType) => docType.status === "planned");

  return (
    <Container className="space-y-16 pt-28 pb-16 lg:pt-36">
      <header className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.7fr)] lg:items-end">
        <div className="space-y-7">
          <div className="flex flex-wrap gap-2">
            <Badge>Document and website templates</Badge>
            <Badge>{templateSummaries.length} live layouts</Badge>
          </div>

          <div className="space-y-5">
            <h1 className="text-foreground max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              Pick the artifact. The right layout follows.
            </h1>

            <p className="text-muted max-w-2xl text-base leading-7">
              Resumes, cover letters, and portfolio websites do different jobs. This directory
              separates them from the start, then shows real previews, fit signals, and the exact
              editor path for each template.
            </p>
          </div>
        </div>

        <div className="border-border bg-card/70 overflow-hidden rounded-2xl border">
          <div className="divide-border grid grid-cols-3 divide-x">
            <div className="p-4">
              <p className="text-foreground text-2xl font-semibold">{availableDocTypes.length}</p>
              <p className="text-muted text-xs leading-5">live types</p>
            </div>

            <div className="p-4">
              <p className="text-foreground text-2xl font-semibold">{templateSummaries.length}</p>
              <p className="text-muted text-xs leading-5">templates</p>
            </div>

            <div className="p-4">
              <p className="text-foreground text-2xl font-semibold">{plannedDocTypes.length}</p>
              <p className="text-muted text-xs leading-5">coming soon</p>
            </div>
          </div>

          <div className="border-border border-t p-5">
            <p className="text-foreground text-sm font-semibold">Designed for choosing fast</p>
            <p className="text-muted mt-1 text-sm leading-6">
              Compare the document type first, then inspect individual layouts only when the fit is
              obvious.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-2" aria-label="Available document types">
        {availableDocTypes.map((docType) => {
          const templatesForType = templateSummaries.filter(
            (template) => template.documentType === docType.id,
          );

          return (
            <Link
              key={docType.id}
              href={docType.href}
              className="group focus-visible:ring-accent rounded-3xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <article className="border-border bg-card/75 group-hover:border-accent/45 grid min-h-136 overflow-hidden rounded-3xl border shadow-[0_34px_90px_-70px_rgba(15,23,42,0.75)] transition-all duration-200 group-hover:-translate-y-1">
                <div className="border-border relative min-h-80 overflow-hidden border-b bg-[linear-gradient(135deg,var(--background),color-mix(in_srgb,var(--accent)_12%,var(--background)))] p-6">
                  <div className="border-border bg-card/90 text-muted absolute top-5 left-5 z-10 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur">
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    {templatesForType.length} templates
                  </div>

                  {templatesForType.slice(0, 2).map((template, index) => (
                    <div
                      key={template.id}
                      className={[
                        "border-border absolute top-6 aspect-8.5/11 h-88 overflow-hidden rounded-sm border bg-white shadow-[0_24px_70px_-38px_rgba(15,23,42,0.8)] transition-transform duration-200",
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

                <div className="flex min-h-0 flex-col justify-between gap-8 p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="text-foreground text-3xl font-semibold tracking-tight">
                        {docType.pluralLabel}
                      </h2>

                      <ArrowRight
                        className="text-accent mt-1 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </div>

                    <p className="text-muted text-sm leading-6">{docType.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {docType.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="border-border bg-background text-muted rounded-full border px-3 py-1.5 text-sm"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </section>

      <section
        className="border-border bg-card/60 overflow-hidden rounded-2xl border"
        aria-label="Coming soon document types"
      >
        <div className="bg-border grid gap-px md:grid-cols-3">
          {plannedDocTypes.map((docType) => (
            <div key={docType.id} className="bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="bg-background text-muted flex h-9 w-9 items-center justify-center rounded-full">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                  </span>

                  <h2 className="text-foreground text-base font-semibold">{docType.pluralLabel}</h2>
                </div>

                <Layers className="text-muted h-4 w-4" aria-hidden="true" />
              </div>

              <p className="text-muted mt-4 text-sm leading-6">{docType.description}</p>
            </div>
          ))}
        </div>
      </section>
    </Container>
  );
};

export default TemplatesPortalPage;
