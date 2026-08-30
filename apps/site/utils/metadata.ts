import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

interface BuildPageMetadataOptions {
  /** Path relative to the site root, e.g. "/about". Use "/" for the homepage. */
  path: string;

  /** <title> / Google SERP copy. Keyword-forward, ~50-60 chars, brand at the end. */
  title: string;
  /** Meta description for Google SERP. ~150-160 chars, includes a reason to click. */
  description: string;

  /**
   * og:title - shown in link unfurls (Slack, LinkedIn, iMessage, Discord). The site
   * name renders separately in most unfurls, so this should lead with the hook/benefit
   * rather than repeating "| VeriWorkly". Deliberately written, not a copy of `title`.
   */
  ogTitle: string;
  /** og:description - can be more benefit-driven / conversational than the SEO description. */
  ogDescription: string;

  /**
   * twitter:title - Twitter/X truncates card titles harder than OG unfurls, so this
   * should be the tightest, punchiest variant. Deliberately written, not a copy of `ogTitle`.
   */
  twitterTitle: string;
  /** twitter:description - short and scannable; the audience skims faster than a Slack unfurl. */
  twitterDescription: string;

  /** Absolute or root-relative URL to the OG/Twitter share image. */
  image: string;
  imageAlt?: string;

  /** Defaults to 1200x630 (standard landscape share card). Override for portrait assets like document previews. */
  imageWidth?: number;
  imageHeight?: number;

  keywords?: string[];

  type?: "website" | "article";

  /** Set true for internal/utility pages (e.g. style guide) that should not be indexed. */
  noIndex?: boolean;

  /**
   * Query params to append to the canonical (and og:url). Paginated routes must pass their
   * page number here - without it every page declares the bare path as its canonical, and
   * Google drops page 2+ from the index as duplicates. Empty/undefined values are skipped,
   * so page 1 still canonicalises to the clean path.
   */
  canonicalParams?: Record<string, string | number | undefined>;
}

/**
 * Builds a complete Next.js Metadata object with canonical, hreflang, Open Graph,
 * and Twitter Card fields always present, so no marketing page ever ships with a
 * partial <head> block. Next.js does not deep-merge nested metadata fields (openGraph,
 * twitter) from the root layout into page-level metadata, so every field a page needs
 * must be set explicitly here rather than relied on to inherit.
 *
 * title / ogTitle / twitterTitle are three separate required inputs on purpose: each
 * surface (Google SERP, social unfurls, Twitter cards) has different length limits and
 * audience context, so they should read as distinct, purpose-written copy rather than
 * the same string echoed three times.
 */

export function buildPageMetadata(options: BuildPageMetadataOptions): Metadata {
  const canonicalQuery = new URLSearchParams();

  for (const [key, value] of Object.entries(options.canonicalParams ?? {}))
    if (value !== undefined && value !== "") canonicalQuery.set(key, String(value));

  const queryString = canonicalQuery.toString();

  const basePath = options.path === "/" ? siteConfig.url : `${siteConfig.url}${options.path}`;
  const url = queryString ? `${basePath}?${queryString}` : basePath;

  const image = options.image.startsWith("http")
    ? options.image
    : options.image.startsWith("//")
      ? `https:${options.image}`
      : `${siteConfig.url}${options.image.startsWith("/") ? "" : "/"}${options.image}`;

  const imageAlt = options.imageAlt ?? options.ogTitle;

  return {
    title: options.title,
    description: options.description,

    ...(options.keywords?.length ? { keywords: options.keywords } : {}),

    ...(options.noIndex
      ? {
          robots: {
            index: false,
            follow: true,
          },
        }
      : {}),

    openGraph: {
      url,
      title: options.ogTitle,
      type: options.type ?? "website",
      description: options.ogDescription,
      siteName: siteConfig.shortName,
      locale: siteConfig.openGraph.locale,
      images: [
        {
          url: image,
          width: options.imageWidth ?? 1200,
          height: options.imageHeight ?? 630,
          alt: imageAlt,
        },
      ],
    },

    twitter: {
      title: options.twitterTitle,
      card: siteConfig.twitter.cardType,
      description: options.twitterDescription,
      images: [image],
      creator: siteConfig.twitter.handle,
      site: siteConfig.twitter.site,
    },

    alternates: {
      canonical: url,
      languages: {
        "en-US": url,
      },
    },
  };
}
