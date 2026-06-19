import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { templates } from "@/lib/portfolio";

import Navigation from "@/components/Navigation";
import PortfolioPublicFooter from "@/components/PortfolioPublicFooter";

import TemplatesHero from "@/features/templates/components/TemplatesHero";
import TemplateCatalog from "@/features/templates/components/TemplateCatalog";
import TemplateBenefits from "@/features/templates/components/TemplateBenefits";
import SharedTemplateFeatures from "@/features/templates/components/SharedTemplateFeatures";

import { createTemplatesSchema } from "@/features/templates/lib/template-schemas";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Portfolio Website Templates | VeriWorkly",
  description:
    "Preview VeriWorkly portfolio website templates for developers, designers, creators, and independent professionals before creating your portfolio.",

  openGraph: {
    type: "website",
    url: "/templates",
    title: "Portfolio Website Templates | VeriWorkly",
    description:
      "Preview VeriWorkly portfolio website templates for developers, designers, creators, and independent professionals before creating your portfolio.",
    images: [
      {
        url: "/og/templates-page-og.png",
        width: 1200,
        height: 630,
        alt: "Portfolio Website Templates | VeriWorkly",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Portfolio Website Templates | VeriWorkly",
    description:
      "Preview VeriWorkly portfolio website templates for developers, designers, creators, and independent professionals before creating your portfolio.",
    images: ["/og/templates-page-og.png"],
  },

  alternates: {
    canonical: "/templates",
    languages: {
      "en-US": "/templates",
    },
  },
};

export default function PortfolioTemplatesPage() {
  const templatesSchema = createTemplatesSchema(templates, siteConfig.url);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(templatesSchema) }}
      />

      <main className="text-ink-2 selection:bg-accent selection:text-accent-ink bg-paper relative min-h-dvh overflow-x-hidden pt-28 font-['Outfit','Avenir_Next','Trebuchet_MS',sans-serif]">
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(var(--color-ink)_0.8px,transparent_0.8px)] bg-size-[24px_24px] opacity-[0.14]" />

        <div className="bg-accent/4 pointer-events-none absolute top-40 left-10 size-80 rounded-full blur-3xl" />
        <div className="bg-accent/5 pointer-events-none absolute top-200 right-10 size-80 rounded-full blur-3xl" />

        <Navigation />

        <div className="relative z-10">
          <TemplatesHero />

          <section className="mx-auto mb-16 w-[min(1280px,calc(100%-48px))] max-sm:w-[min(calc(100%-30px),1280px)]">
            <div className="border-ink-2 relative overflow-hidden rounded-3xl border-2 bg-white/70 p-6 shadow-[10px_12px_0_rgba(37,99,235,0.06)] md:p-10">
              <div className="bg-accent/5 pointer-events-none absolute top-0 right-0 h-32 w-32 rounded-bl-full" />

              <div className="max-w-3xl">
                <span className="text-accent text-[11px] font-bold tracking-[0.16em] uppercase">
                  A Note on Design Taste
                </span>

                <h3 className="text-ink-2 mt-4 text-2xl leading-tight font-bold tracking-[-0.04em] md:text-3xl">
                  No cards-inside-cards slop. Just clean presentation.
                </h3>

                <p className="text-ink-2/70 mt-4 text-sm leading-7">
                  Most website builders overwhelm your content with heavy drop shadows, overdesigned
                  card patterns, and generic layout noise. We designed VeriWorkly templates with a
                  strict typographic focus: wide editorial margins, high-contrast readability, and
                  balanced line lengths. Your accomplishments are the star; the template is just the
                  stage.
                </p>

                <div className="mt-8 flex items-center gap-3.5">
                  <div className="border-ink flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold text-white shadow-md">
                    <Image
                      priority
                      width={28}
                      height={28}
                      alt="VeriWorkly Logo"
                      src="/veriworkly-logo.png"
                    />
                  </div>

                  <div>
                    <p className="text-ink-2 text-xs font-bold">VeriWorkly Team</p>
                    <p className="text-ink-2/80 text-[10px]">Crafted with care 💝</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <TemplateCatalog templates={templates} />
          <SharedTemplateFeatures />
          <TemplateBenefits />
        </div>

        <PortfolioPublicFooter />
      </main>
    </>
  );
}
