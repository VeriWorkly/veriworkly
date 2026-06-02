import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { portfolioPublicUrl } from "@/config/site";

import { getPublishedPortfolio } from "@/lib/published-portfolio";
import { renderTemplate } from "@/templates/runtime/registry";
import { PublicViewTracker } from "@/components/PublicViewTracker";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const publication = await getPublishedPortfolio(username);
  if (!publication)
    return { title: "Portfolio not found", robots: { index: false, follow: false } };
  const project = publication.snapshot;
  const url = portfolioPublicUrl(publication.subdomain);
  const title = project.seo.title || `${project.identity.name} | Portfolio`;
  const images = project.seo.socialImage ? [{ url: project.seo.socialImage.url }] : undefined;
  return {
    title,
    description: project.seo.description,
    alternates: { canonical: url },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "profile",
      url,
      title,
      description: project.seo.description,
      siteName: "VeriWorkly Portfolio",
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description: project.seo.description,
      images,
    },
  };
}

export default async function Portfolio({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const publication = await getPublishedPortfolio(username);
  if (!publication) notFound();
  const project = publication.snapshot;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${project.identity.name} portfolio`,
    url: portfolioPublicUrl(publication.subdomain),
    mainEntity: {
      "@type": "Person",
      name: project.identity.name,
      jobTitle: project.identity.headline,
      email: project.identity.email,
      address: project.identity.location,
    },
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <PublicViewTracker subdomain={publication.subdomain} />
      {await renderTemplate(project)}
    </>
  );
}
