import type { Metadata } from "next";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { Container } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";
import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import {
  fetchChangelogIndex,
  fetchChangelogDetail,
} from "@/features/changelog/services/changelog-backend";
import ChangelogEntryNav from "@/features/changelog/components/detail/ChangelogEntryNav";
import ChangelogEntryDetail from "@/features/changelog/components/detail/ChangelogEntryDetail";
import { categoriesFor, formatChangelogDate } from "@/features/changelog/utils/changelog-utils";

interface ChangelogDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const index = await fetchChangelogIndex();
  return index.map((entry) => ({ id: entry.id }));
}

function describe(title: string, version: string, summary: string | null) {
  return (
    summary ||
    `Everything that shipped in VeriWorkly v${version} — ${title}: new features, improvements, fixes, and the pull requests behind them.`
  );
}

export async function generateMetadata({ params }: ChangelogDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  const detail = await fetchChangelogDetail(id).catch(() => null);

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

  ogUrl.searchParams.set("title", `v${entry.version} — ${entry.title}`);
  ogUrl.searchParams.set("description", description);

  return buildPageMetadata({
    path: `/changelog/${entry.id}`,

    title: `VeriWorkly v${entry.version}: ${entry.title} | Release Notes`,
    description,

    ogTitle: `What shipped in VeriWorkly v${entry.version}`,
    ogDescription: description,

    twitterTitle: `VeriWorkly v${entry.version} — ${entry.title}`,
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
    headline: `VeriWorkly v${entry.version} — ${entry.title}`,
    description,
    url: entryUrl,
    datePublished: entry.publishedAt,
    dateModified: entry.publishedAt,
    author: { "@type": "Organization", name: "VeriWorkly", url: siteConfig.url },
    publisher: { "@type": "Organization", name: "VeriWorkly", url: siteConfig.url },
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

      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <div className="surface-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.25]" />
        <div className="bg-accent/5 pointer-events-none absolute top-0 left-1/4 -z-10 h-150 w-150 rounded-full blur-[130px]" />

        <Container className="pt-28 pb-20 lg:pt-36">
          <div className="mx-auto max-w-3xl">
            <Link
              href="/changelog"
              className="text-muted hover:text-foreground group mb-8 inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase transition-colors"
            >
              <ArrowLeft
                aria-hidden="true"
                className="size-4 transition-transform group-hover:-translate-x-1"
              />
              Back to Changelog
            </Link>

            <ChangelogEntryDetail entry={entry} older={older} isLatest={isLatest} />

            <ChangelogEntryNav older={older} newer={newer} />

            <p className="text-muted/70 mt-10 font-mono text-[11px] tracking-wide">
              Released {formatChangelogDate(entry.publishedAt)}.{" "}
              <Link href="/roadmap" className="text-accent underline underline-offset-2">
                See what&apos;s planned next
              </Link>
              .
            </p>
          </div>
        </Container>
      </div>
    </>
  );
};

export default ChangelogDetailPage;
