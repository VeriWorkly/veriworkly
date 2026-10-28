import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

type PageMetadata = {
  title: string;
  /** Overrides `title` in `<title>` only, where two pages would otherwise share one. */
  metaTitle?: string;
  description: string;
  /** Path from the site root, e.g. `/docs/api-keys`. */
  path: string;
  /** Path of the page's social card. */
  image: string;
};

/** Every page declares its own canonical and complete Open Graph and Twitter tags. */
export function pageMetadata({
  title,
  metaTitle,
  description,
  path,
  image,
}: PageMetadata): Metadata {
  const url = `${siteConfig.url}${path}`;
  const images = [{ url: image, width: 1200, height: 630, alt: title }];

  return {
    title: metaTitle ?? title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: siteConfig.name,
      images,
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      title,
      description,
      images: [image],
    },
  };
}
