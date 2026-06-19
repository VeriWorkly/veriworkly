import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DraftPreview } from "@/components/DraftPreview";
import { isTemplateId, templates } from "@/templates/catalog/templates";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const template = templates.find((t) => t.id === id);

  if (!template) {
    return {
      title: "Template Preview | VeriWorkly",
      robots: { index: true, follow: true },
    };
  }

  const title = `${template.name} Template Live Preview | VeriWorkly`;
  const description = `See a live interactive preview of the ${template.name} template. Switch styles, layouts, and visualize your portfolio.`;

  const imageUrl = `/og/templates/preview/${template.id}-preview-page-og.png`;

  return {
    title,
    description,

    openGraph: {
      title,
      description,
      type: "website",
      url: `/templates/${template.id}/preview`,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${template.name} Template Preview`,
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
      canonical: `/templates/${template.id}/preview`,
    },
  };
}

export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isTemplateId(id)) notFound();
  return <DraftPreview templateId={id} />;
}
