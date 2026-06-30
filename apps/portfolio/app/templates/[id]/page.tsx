import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { siteConfig } from "@/config/site";

import { isTemplateId, templates } from "@/templates/catalog/templates";

import PortfolioPublicFooter from "@/components/PortfolioPublicFooter";

import { templateDetails } from "@/features/templates/data/template-details";
import TemplatesNavigation from "@/features/templates/components/TemplatesNavigation";
import TemplateDetailContainer from "@/features/templates/components/TemplateDetailContainer";

import { createTemplateSchema } from "@/features/templates/lib/template-schemas";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  const template = templates.find((item) => item.id === id);

  if (!template) return { title: "Template Not Found" };

  const title = `${template.name} Portfolio Template`;
  const description = `${template.note} Preview the live ${template.name} portfolio template, design direction, SEO behavior, and best-fit use cases.`;

  const imageUrl = `/og/templates/${template.id}-template-page-og.png`;

  return {
    title,
    description,

    openGraph: {
      title,
      description,
      type: "website",
      url: `/templates/${template.id}`,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${template.name} Portfolio Template`,
        },
      ],
    },

    twitter: {
      title,
      description,
      images: [imageUrl],
      card: "summary_large_image",
    },

    robots: { index: true, follow: true },

    alternates: {
      canonical: `/templates/${template.id}`,
      languages: {
        "en-US": `/templates/${template.id}`,
      },
    },
  };
}

export function generateStaticParams() {
  return templates.map((template) => ({ id: template.id }));
}

const PortfolioTemplateDetailPage = async ({ params }: PageProps) => {
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
      {details.faqs && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: details.faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: faq.answer,
                },
              })),
            }),
          }}
        />
      )}

      <div className="text-ink-2 bg-paper min-h-dvh overflow-x-clip pt-28 font-['Outfit','Avenir_Next','Trebuchet_MS',sans-serif]">
        <TemplatesNavigation showPricing={true} backHref="/templates" backLabel="All templates" />
        <TemplateDetailContainer template={template} details={details} />
        <PortfolioPublicFooter />
      </div>
    </>
  );
};

export default PortfolioTemplateDetailPage;
