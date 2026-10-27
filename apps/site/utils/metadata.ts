import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

interface BuildPageMetadataOptions {
  path: string;

  /** <title> / Google SERP copy. Keyword-forward, ~50-60 chars, brand at the end. */
  title: string;
  /** Meta description for Google SERP. ~150-160 chars, includes a reason to click. */
  description: string;

  /** og:title for link unfurls; the site name renders separately, so lead with the hook rather than "| VeriWorkly". */
  ogTitle: string;
  ogDescription: string;

  /** twitter:title: X truncates card titles harder than OG unfurls, so this is the tightest variant. */
  twitterTitle: string;
  twitterDescription: string;

  image: string;
  imageAlt?: string;

  /** Defaults to 1200x630 (standard landscape share card). Override for portrait assets like document previews. */
  imageWidth?: number;
  imageHeight?: number;

  keywords?: string[];

  type?: "website" | "article";

  /** Not for the style guide: it is a public reference, deliberately in the sitemap. */
  noIndex?: boolean;

  /** Paginated routes must pass their page here, or Google drops page 2+ as duplicates; empty values are skipped. */
  canonicalParams?: Record<string, string | number | undefined>;

  /** A filtered view of another page (the roadmap status tabs) points its canonical there instead. */
  canonicalPath?: string;
}

/** Next does not deep-merge openGraph/twitter from the root layout, so every field a page needs is set here explicitly. */

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 160;

export function clampText(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();

  if (clean.length <= max) return clean;

  const cut = clean.slice(0, max - 1);
  const atWord = cut.lastIndexOf(" ");

  return `${(atWord > max / 2 ? cut.slice(0, atWord) : cut).replace(/[\s,:;.-]+$/, "")}…`;
}

export function fitTitle(main: string, suffix: string, max = TITLE_MAX) {
  return `${clampText(main, max - suffix.length - 3)} | ${suffix}`;
}

export const fitDescription = (text: string, max = DESCRIPTION_MAX) => clampText(text, max);

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
      // No og:url on noIndex pages, for the same reason as the canonical below.
      ...(options.noIndex ? {} : { url }),
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

    /** noIndex gets canonical `null` (not omitted, or the root layout's "/" inherits); no hreflang, since every page has one version. */
    ...(options.noIndex
      ? { alternates: { canonical: null } }
      : {
          alternates: {
            canonical: options.canonicalPath ? `${siteConfig.url}${options.canonicalPath}` : url,
          },
        }),
  };
}
