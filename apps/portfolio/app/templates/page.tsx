import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { templates } from "@/lib/portfolio";

import Navigation from "@/components/Navigation";
import PortfolioPublicFooter from "@/components/PortfolioPublicFooter";

import TemplatesHero from "@/features/templates/components/TemplatesHero";
import TemplateCatalog from "@/features/templates/components/TemplateCatalog";
import TemplateBenefits from "@/features/templates/components/TemplateBenefits";
import TemplateDesignNote from "@/features/templates/components/TemplateDesignNote";
import SharedTemplateFeatures from "@/features/templates/components/SharedTemplateFeatures";

import { createTemplatesSchema } from "@/features/templates/lib/template-schemas";

export const metadata: Metadata = {
  title: "Portfolio Website Templates",
  description:
    "Preview VeriWorkly portfolio website templates for developers, designers, creators, and independent professionals before creating your portfolio.",

  openGraph: {
    type: "website",
    url: "/templates",
    title: "Portfolio Website Templates | VeriWorkly Portfolio",
    description:
      "Preview VeriWorkly portfolio website templates for developers, designers, creators, and independent professionals before creating your portfolio.",
    images: [
      {
        url: "/og/templates-page-og.png",
        width: 1200,
        height: 630,
        alt: "Portfolio Website Templates | VeriWorkly Portfolio",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Portfolio Website Templates | VeriWorkly Portfolio",
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

const PortfolioTemplatesPage = () => {
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
          <TemplateDesignNote />
          <TemplateCatalog templates={templates} />
          <SharedTemplateFeatures />
          <TemplateBenefits />
        </div>

        <PortfolioPublicFooter />
      </main>
    </>
  );
};

export default PortfolioTemplatesPage;
