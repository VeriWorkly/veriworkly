import type { TemplateSummary } from "@/templates/catalog/templates";

export function createTemplatesSchema(templates: TemplateSummary[], siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Portfolio Website Templates",
    description:
      "Preview VeriWorkly portfolio website templates for developers, designers, founders, and independent builders before creating your portfolio.",
    url: `${siteUrl}/templates`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: templates.map((template, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteUrl}/templates/${template.id}`,
        name: template.name,
        description: template.note,
      })),
    },
  };
}

export function createTemplateSchema(template: TemplateSummary, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${template.name} Portfolio Template`,
    description: template.note,
    image: `${siteUrl}/og/landing-page-og.png`,
    brand: {
      "@type": "Brand",
      name: "VeriWorkly",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      url: `${siteUrl}/templates/${template.id}`,
    },
  };
}
