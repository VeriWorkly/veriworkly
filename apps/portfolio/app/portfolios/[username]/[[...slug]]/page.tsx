import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { portfolioPublicUrl, siteConfig } from "@/config/site";

import { getPublishedPortfolio } from "@/lib/published-portfolio";
import { renderTemplate } from "@/templates/runtime/registry";
import { PublicViewTracker } from "@/components/PublicViewTracker";
import { Watermark } from "@/components/Watermark";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug?: string[] }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const publication = await getPublishedPortfolio(username);
  if (!publication)
    return { title: "Portfolio not found", robots: { index: false, follow: false } };

  const project = publication.snapshot;
  let url = portfolioPublicUrl(publication.subdomain);
  let title = project.seo.title || `${project.identity.name} | Portfolio`;

  if (slug && slug.length > 0 && publication.isPremium) {
    const pageSlug = slug.join("/");
    const page = project.pages?.find((p) => p.slug === pageSlug);
    if (page) {
      title = `${page.title} | ${project.identity.name}`;
      url = `${url}/${pageSlug}`;
    }
  }

  const defaultDesc = `${project.identity.name} - ${project.identity.headline || "Professional Portfolio"}. View projects, experience, and contact information.`;
  const description = project.seo.description || defaultDesc;

  let imageUrl = project.seo.socialImage?.url;
  if (imageUrl && !imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
    const prefix = imageUrl.startsWith("/") ? "" : "/";
    imageUrl = `${siteConfig.links.portfolio}${prefix}${imageUrl}`;
  }

  let images = imageUrl ? [{ url: imageUrl }] : undefined;
  if (!images) {
    const ogParams = new URLSearchParams({
      name: project.identity.name,
      headline: project.identity.headline || "",
      bio: project.identity.bio || "",
      availability: project.identity.availability || "",
      location: project.identity.location || "",
      subdomain: publication.subdomain,
    });
    const templateId = project.templateId || "signal";
    images = [
      { url: `${siteConfig.links.portfolio}/api/template/${templateId}/og?${ogParams.toString()}` },
    ];
  }

  return {
    title,
    description,
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
      description,
      siteName: "VeriWorkly Portfolio",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}

export default async function Portfolio({ params }: { params: Promise<{ username: string; slug?: string[] }> }) {
  const { username, slug } = await params;
  const publication = await getPublishedPortfolio(username);
  if (!publication) notFound();

  const hostHeader = (await headers()).get("host") || "";
  const hostname = hostHeader.split(":")[0];

  const isCustomSubdomain =
    hostname !== "portfolio.veriworkly.com" &&
    hostname !== "localhost" &&
    hostname !== "portfolio.localhost" &&
    hostname !== "127.0.0.1";

  if (isCustomSubdomain && !publication.isPremium) {
    const port = hostHeader.split(":")[1];
    const mainUrl =
      process.env.NODE_ENV === "development"
        ? `http://localhost:${port || "3000"}`
        : "https://portfolio.veriworkly.com";
    redirect(`${mainUrl}/portfolio/${username}`);
  }

  const project = publication.snapshot;

  let currentSections = project.sections;
  let pageUrl = portfolioPublicUrl(publication.subdomain);

  if (slug && slug.length > 0) {
    if (!publication.isPremium) notFound();

    const pageSlug = slug.join("/");
    const page = project.pages?.find((p) => p.slug === pageSlug);
    
    if (!page) notFound();

    currentSections = page.sections;
    pageUrl = `${pageUrl}/${pageSlug}`;
  }

  const pageProject = {
    ...project,
    sections: currentSections,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${project.identity.name} portfolio`,
    url: pageUrl,
    mainEntity: {
      "@type": "Person",
      name: project.identity.name,
      jobTitle: project.identity.headline,
      email: project.identity.email,
      address: project.identity.location,
      sameAs: project.socialLinks?.map((link) => link.url) || [],
    },
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <PublicViewTracker subdomain={publication.subdomain} />
      {await renderTemplate(pageProject)}
      {!publication.isPremium || !project.removeWatermark ? <Watermark /> : null}
    </>
  );
}
