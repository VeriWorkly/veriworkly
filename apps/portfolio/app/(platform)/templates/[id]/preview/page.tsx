import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { demoPortfolio } from "@/lib/portfolio";
import { renderTemplate } from "@/templates/runtime/registry";

import { isTemplateId, templates } from "@/templates/catalog/templates";
import { templateEditorHref, templateOgImage } from "@/features/templates/constants";

// The preview is sample content, so it is never indexed and says so on screen (P-061).
const robots = { index: false, follow: true };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const template = templates.find((t) => t.id === id);

  if (!template) return { title: "Template Preview", robots };

  const title = `${template.name} Template Live Preview`;
  const description = `See a live interactive preview of the ${template.name} template. Switch styles, layouts, and visualize your portfolio.`;

  const imageUrl = templateOgImage(template, "preview");

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

    robots,

    alternates: {
      canonical: `/templates/${template.id}/preview`,
    },
  };
}

export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isTemplateId(id)) notFound();

  return (
    <>
      {/* Rendered on the server, so the sample reads without JavaScript too. */}
      {await renderTemplate({ ...demoPortfolio, templateId: id })}
      <aside
        role="note"
        className="bg-ink text-paper fixed bottom-4 left-1/2 z-[10050] flex w-max max-w-[calc(100%-32px)] -translate-x-1/2 flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full px-5 py-2.5 text-sm shadow-lg"
      >
        <strong>Demo content.</strong>
        <span>Your portfolio shows your own details.</span>
        <a className="font-bold underline underline-offset-4" href={templateEditorHref(id)}>
          Use this template
        </a>
      </aside>
    </>
  );
}
