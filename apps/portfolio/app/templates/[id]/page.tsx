import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PortfolioPublicFooter from "@/components/PortfolioPublicFooter";
import { TemplateBestFit } from "@/features/templates/components/TemplateBestFit";
import { TemplateCta } from "@/features/templates/components/TemplateCta";
import { TemplateDetailCards } from "@/features/templates/components/TemplateDetailCards";
import { TemplateDetailHero } from "@/features/templates/components/TemplateDetailHero";
import { TemplatePreviewSection } from "@/features/templates/components/TemplatePreviewSection";
import { TemplatesNavigation } from "@/features/templates/components/TemplatesNavigation";
import { TemplateStyleGuide } from "@/features/templates/components/TemplateStyleGuide";
import { templateDetails } from "@/features/templates/data/template-details";
import { createTemplateSchema } from "@/features/templates/lib/template-schemas";
import { isTemplateId, templates } from "@/templates/catalog/templates";
import { siteConfig } from "@/config/site";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const template = templates.find((item) => item.id === id);

  if (!template) return { title: "Template Not Found" };

  return {
    title: `${template.name} Portfolio Template | VeriWorkly`,
    description: `${template.note} Preview the live ${template.name} portfolio template, design direction, SEO behavior, and best-fit use cases.`,
    robots: { index: true, follow: true },
  };
}

export function generateStaticParams() {
  return templates.map((template) => ({ id: template.id }));
}

export default async function PortfolioTemplateDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!isTemplateId(id)) notFound();

  const template = templates.find((item) => item.id === id);
  if (!template) notFound();

  const details = templateDetails[template.id];
  const templateSchema = createTemplateSchema(template, siteConfig.url);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(templateSchema) }}
      />
      <main className="min-h-dvh overflow-x-hidden bg-[#f1efe7] font-['Outfit','Avenir_Next','Trebuchet_MS',sans-serif] text-[#11110f]">
        <TemplatesNavigation backHref="/templates" backLabel="All templates" />
        <TemplateDetailHero template={template} details={details} />
        <TemplatePreviewSection template={template} details={details} />
        <TemplateDetailCards details={details} />
        <TemplateStyleGuide template={template} details={details} />
        <TemplateBestFit template={template} details={details} />
        <TemplateCta template={template} />
        <PortfolioPublicFooter />
      </main>
    </>
  );
}
