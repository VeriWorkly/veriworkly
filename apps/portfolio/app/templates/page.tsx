import type { Metadata } from "next";

import PortfolioPublicFooter from "@/components/PortfolioPublicFooter";
import { TemplateBenefits } from "@/features/templates/components/TemplateBenefits";
import { TemplateCatalog } from "@/features/templates/components/TemplateCatalog";
import { SharedTemplateFeatures } from "@/features/templates/components/SharedTemplateFeatures";
import { TemplatesHero } from "@/features/templates/components/TemplatesHero";
import { TemplatesNavigation } from "@/features/templates/components/TemplatesNavigation";
import { createTemplatesSchema } from "@/features/templates/lib/template-schemas";
import { templates } from "@/lib/portfolio";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Portfolio Website Templates | VeriWorkly",
  description:
    "Preview VeriWorkly portfolio website templates for developers, designers, founders, and independent builders before creating your portfolio.",
};

export default function PortfolioTemplatesPage() {
  const templatesSchema = createTemplatesSchema(templates, siteConfig.url);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(templatesSchema) }}
      />
      <main className="min-h-dvh overflow-x-hidden bg-[#f1efe7] font-['Outfit','Avenir_Next','Trebuchet_MS',sans-serif] text-[#11110f]">
        <TemplatesNavigation backHref="/" backLabel="Landing" showPricing />
        <TemplatesHero />
        <TemplateCatalog templates={templates} />
        <SharedTemplateFeatures />
        <TemplateBenefits />
        <PortfolioPublicFooter />
      </main>
    </>
  );
}
