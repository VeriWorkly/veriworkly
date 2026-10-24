import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { siteConfig } from "@/config/site";
import { jsonLdScriptProps } from "@/utils/json-ld";
import { organizationRef, webSiteRef } from "@/utils/schema";
import { buildPageMetadata, fitDescription, fitTitle } from "@/utils/metadata";

import {
  fetchChangelogIndex,
  fetchChangelogDetail,
} from "@/features/changelog/services/changelog-backend";
import ChangelogEntryNav from "@/features/changelog/components/detail/ChangelogEntryNav";
import ChangelogEntryDetail from "@/features/changelog/components/detail/ChangelogEntryDetail";
import {
  categoriesFor,
  releaseHeadline,
  releaseSummary,
} from "@/features/changelog/utils/changelog-utils";

interface ChangelogDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  try {
    const index = await fetchChangelogIndex();

    return index.map((entry) => ({ id: entry.id }));
  } catch (err) {
    // No index means no prerendered release pages; they render on first request instead.
    // Prerendering from an empty index would bake every release as a 404 for the ISR week.
    console.error("Changelog index unavailable at build; release pages render on demand:", err);

    return [];
  }
}

function describe(title: string, version: string, summary: string | null) {
  return fitDescription(
    releaseSummary(summary) ??
      `Everything that shipped in VeriWorkly v${version} - ${releaseHeadline(title)}: new features, improvements, fixes, and the pull requests behind them.`,
  );
}

export async function generateMetadata({ params }: ChangelogDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  const detail = await fetchChangelogDetail(id);

  if (!detail) {
    return buildPageMetadata({
      path: `/changelog/${id}`,

      title: "Release Not Found | VeriWorkly",
      description: "This release does not exist in the VeriWorkly changelog.",

      ogTitle: "Release Not Found",
      ogDescription: "This release does not exist in the VeriWorkly changelog.",

      twitterTitle: "Release Not Found",
      twitterDescription: "This release does not exist in the VeriWorkly changelog.",

      image: "/api/og?title=Changelog&showDesc=false",

      noIndex: true,
    });
  }

  const { entry } = detail;

  const description = describe(entry.title, entry.version, entry.summary);

  const ogUrl = new URL("/api/og", siteConfig.url);

  ogUrl.searchParams.set("title", `v${entry.version} - ${entry.title}`);
  ogUrl.searchParams.set("description", description);

  return buildPageMetadata({
    path: `/changelog/${entry.id}`,

    title: fitTitle(`v${entry.version}: ${releaseHeadline(entry.title)}`, "VeriWorkly changelog"),
    description,

    ogTitle: `What shipped in VeriWorkly v${entry.version}`,
    ogDescription: description,

    twitterTitle: `VeriWorkly v${entry.version} - ${entry.title}`,
    twitterDescription: description,

    image: ogUrl.toString(),
    imageAlt: `VeriWorkly v${entry.version} release notes`,

    type: "article",

    keywords: [
      `VeriWorkly v${entry.version}`,
      "VeriWorkly release notes",
      "VeriWorkly changelog",
      ...entry.tags,
    ],
  });
}

const ChangelogDetailPage = async ({ params }: ChangelogDetailPageProps) => {
  const { id } = await params;

  const detail = await fetchChangelogDetail(id);

  if (!detail) notFound();

  const { entry, older, newer, isLatest } = detail;

  const entryUrl = `${siteConfig.url}/changelog/${entry.id}`;
  const description = describe(entry.title, entry.version, entry.summary);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Changelog", item: `${siteConfig.url}/changelog` },
      { "@type": "ListItem", position: 3, name: `v${entry.version}`, item: entryUrl },
    ],
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: `VeriWorkly v${entry.version} - ${entry.title}`,
    description,
    url: entryUrl,
    datePublished: entry.publishedAt,
    dateModified: entry.publishedAt,
    author: organizationRef,
    publisher: organizationRef,
    isPartOf: webSiteRef,
    keywords: entry.tags.join(", "),
    mainEntityOfPage: { "@type": "WebPage", "@id": entryUrl },
    articleSection: categoriesFor(entry).map(({ label }) => label),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(articleSchema)}
      />

      <ChangelogEntryDetail entry={entry} older={older} isLatest={isLatest} />
      <ChangelogEntryNav older={older} newer={newer} />
    </>
  );
};

export default ChangelogDetailPage;
