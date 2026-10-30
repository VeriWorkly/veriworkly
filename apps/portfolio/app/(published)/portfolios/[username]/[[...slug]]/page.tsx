import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { portfolioPublicUrl, siteConfig } from "@/config/site";

import { getPublishedPortfolio, type PublishedPortfolio } from "@/lib/published-portfolio";
import { renderTemplate } from "@/templates/runtime/registry";
import { PublicViewTracker } from "@/components/PublicViewTracker";
import { Watermark } from "@/components/Watermark";
import { JsonLd } from "@/components/JsonLd";

export const revalidate = 3600;

// No site is built ahead of time: each one renders on its first visit and is then cached for the
// revalidate window. Without this the route is fully dynamic and `revalidate` does nothing.
export async function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ username: string; slug?: string[] }> };

// A headline longer than this reads as a pitch, not a job title.
const JOB_TITLE_MAX = 60;

/**
 * The page a request asks for, or null when it does not exist. Extra pages are a paid feature
 * that follows the owner's portfolio access (`isPaid`, which includes GRACE) on any template.
 */
function resolvePage(publication: PublishedPortfolio, slug: string[] | undefined) {
  const project = publication.snapshot;
  const home = portfolioPublicUrl(publication.subdomain);

  if (!slug || slug.length === 0) return { title: null, sections: project.sections, url: home };
  if (!publication.isPaid) return null;

  const pageSlug = slug.join("/");
  const page = project.pages?.find((p) => p.slug === pageSlug);

  return page ? { title: page.title, sections: page.sections, url: `${home}/${pageSlug}` } : null;
}

// The owner chose "remove badge" and their plan includes it; otherwise the badge shows.
function showsBadge(publication: PublishedPortfolio) {
  return !(publication.isPaid && publication.snapshot.removeWatermark === true);
}

function absoluteUrl(url: string | undefined) {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  return `${siteConfig.links.portfolio}${url.startsWith("/") ? "" : "/"}${url}`;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username, slug } = await params;
  const publication = await getPublishedPortfolio(username);
  const page = publication && resolvePage(publication, slug);

  if (!publication || !page)
    return { title: { absolute: "Portfolio not found" }, robots: { index: false, follow: false } };

  const project = publication.snapshot;
  const name = project.identity.name;
  const title = page.title ? `${page.title} | ${name}` : project.seo.title || `${name} | Portfolio`;

  const description =
    project.seo.description ||
    `${name} - ${project.identity.headline || "Professional Portfolio"}. View projects, experience, and contact information.`;

  const socialImage = absoluteUrl(project.seo.socialImage?.url);
  // The card route reads the published site itself; `v` only gives each revision its own URL,
  // so a CDN-cached card changes when the site does.
  const ogParams = new URLSearchParams({
    subdomain: publication.subdomain,
    v: publication.updatedAt,
  });
  const images = [
    {
      url:
        socialImage ??
        `${siteConfig.links.portfolio}/api/template/${project.templateId || "signal"}/og?${ogParams.toString()}`,
    },
  ];

  // The owner's site, so only the owner's metadata: an absolute title and no platform branding.
  return {
    title: { absolute: title },
    description,
    authors: [{ name, url: portfolioPublicUrl(publication.subdomain) }],
    alternates: { canonical: page.url },
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
      url: page.url,
      title,
      description,
      siteName: name,
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

export default async function Portfolio({ params }: Params) {
  const { username, slug } = await params;
  const publication = await getPublishedPortfolio(username);
  if (!publication) notFound();

  // Every site, free or paid, is served on its own subdomain (owner rule, 2026-10-28); the
  // platform path still resolves, and the canonical address names the subdomain.
  const page = resolvePage(publication, slug);
  if (!page) notFound();

  const project = publication.snapshot;
  const { name, headline, bio, location } = project.identity;
  const jobTitle = headline && headline.length <= JOB_TITLE_MAX ? headline : undefined;

  // No email: JSON-LD is read by scrapers as well as search engines.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${name} portfolio`,
    url: page.url,
    dateModified: publication.updatedAt || undefined,
    mainEntity: {
      "@type": "Person",
      name,
      url: portfolioPublicUrl(publication.subdomain),
      image: absoluteUrl(project.identity.avatar?.url),
      jobTitle,
      description: (jobTitle ? bio : headline) || bio || undefined,
      address: location ? { "@type": "PostalAddress", addressLocality: location } : undefined,
      sameAs: project.socialLinks?.map((link) => link.url).filter(Boolean) ?? [],
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <PublicViewTracker subdomain={publication.subdomain} />
      {await renderTemplate({ ...project, sections: page.sections })}
      {showsBadge(publication) ? <Watermark subdomain={publication.subdomain} /> : null}
    </>
  );
}
