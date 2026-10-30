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

// A premium template has no price of its own: it comes with Creator Pro (or a pass), so it gets
// no Offer rather than a made-up one; a free template is offered at 0.
export function createTemplateSchema(template: TemplateSummary, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${template.name} Portfolio Template`,
    description: template.isPremium ? `${template.note} Included with Creator Pro.` : template.note,
    image: `${siteUrl}/og/landing-page-og.png`,
    brand: {
      "@type": "Brand",
      name: "VeriWorkly",
    },
    offers: template.isPremium
      ? undefined
      : {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          url: `${siteUrl}/templates/${template.id}`,
        },
  };
}
