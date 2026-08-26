import { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import {
  type ChangelogType,
  fetchChangelogFromBackend,
} from "@/features/changelog/services/changelog-backend";

import ChangelogPageShell from "@/features/changelog/components/list/ChangelogPageShell";
import ChangelogSEOContent from "@/features/changelog/components/list/ChangelogSEOContent";

const pageUrl = `${siteConfig.url}/changelog`;

const ogImage = `/api/og?title=${encodeURIComponent("Changelog")}&description=${encodeURIComponent(
  "Every VeriWorkly release, generated straight from our public GitHub history.",
)}`;

const changelogMetadata = {
  path: "/changelog",

  title: `Changelog: Every VeriWorkly Release | ${siteConfig.shortName}`,
  description:
    "See exactly what shipped in every VeriWorkly release — new features, improvements, fixes, and security updates, sourced straight from our public GitHub history.",

  ogTitle: "Every VeriWorkly release, in one place",
  ogDescription:
    "A public, real changelog covering resumes, cover letters, portfolios, the ATS checker, and AI tools — generated from our GitHub releases.",

  twitterTitle: "The VeriWorkly changelog",
  twitterDescription:
    "What shipped, when it shipped, and the PRs behind it — straight from GitHub.",

  image: ogImage,
  imageAlt: `${siteConfig.shortName} | Changelog`,

  keywords: [
    "VeriWorkly changelog",
    "VeriWorkly release notes",
    "AI resume builder updates",
    "product changelog",
    "career workspace changelog",
    "what's new",
  ],
} as const;

function parseType(raw: string | undefined): ChangelogType | undefined {
  if (raw === "major" || raw === "minor" || raw === "patch") return raw;
  return undefined;
}

function parsePage(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

interface ChangelogPageProps {
  searchParams: Promise<{
    type?: string;
    search?: string;
    page?: string;
  }>;
}

export async function generateMetadata({ searchParams }: ChangelogPageProps): Promise<Metadata> {
  const params = await searchParams;

  const page = parsePage(params.page);

  const isFiltered = Boolean(parseType(params.type) || params.search?.trim());

  return buildPageMetadata({
    ...changelogMetadata,
    keywords: [...changelogMetadata.keywords],
    ...(page > 1
      ? {
          title: `Changelog — Page ${page} | ${siteConfig.shortName}`,
          ogTitle: `Every VeriWorkly release, in one place - page ${page}`,
        }
      : {}),
    canonicalParams: { page: page > 1 ? page : undefined },
    noIndex: isFiltered,
  });
}

const ChangelogPage = async ({ searchParams }: ChangelogPageProps) => {
  const params = await searchParams;

  const type = parseType(params.type);
  const search = params.search?.trim() || undefined;

  const page = parsePage(params.page);

  const data = await fetchChangelogFromBackend({ type, search }, page);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Changelog", item: pageUrl },
    ],
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Changelog: Every VeriWorkly Release | ${siteConfig.shortName}`,

    url: pageUrl,

    mainEntity: {
      "@type": "ItemList",
      itemListElement: data.entries.map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `v${entry.version} — ${entry.title}`,
        url: `${pageUrl}/${entry.id}`,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(itemListSchema)}
      />

      <ChangelogPageShell
        data={data}
        search={search}
        title="Changelog"
        activeType={type ?? "all"}
        description="Every VeriWorkly release, generated straight from our public GitHub history - new features, improvements, fixes, and security updates, with links back to the exact pull requests."
      />

      <ChangelogSEOContent />
    </>
  );
};

export default ChangelogPage;
