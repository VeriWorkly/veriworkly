import type { Root } from "fumadocs-core/page-tree";

import { getBreadcrumbItems } from "fumadocs-core/breadcrumb";

import { siteConfig } from "@/config/site";

/** The marketing site declares the same Organization under this `@id`, so both resolve to one entity. */
const ORGANIZATION_ID = `${siteConfig.links.main}/#organization`;
const WEBSITE_ID = `${siteConfig.url}/#website`;

const organization = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: siteConfig.shortName,
  url: siteConfig.links.main,
  logo: {
    "@type": "ImageObject",
    url: `${siteConfig.url}/veriworkly-logo.png`,
  },
  sameAs: [siteConfig.links.twitter, siteConfig.links.github, siteConfig.links.linkedin],
};

/** `WebSite` + `Organization`, emitted once by the root layout. */
export function siteSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: siteConfig.url,
        name: siteConfig.name,
        inLanguage: "en",
        publisher: { "@id": ORGANIZATION_ID },
      },
    ],
  };
}

export type DocPageSchemaInput = {
  /** A loader page: `source.getPage(...)`, `engineSource.getPage(...)` or `apiSource.getPage(...)`. */
  page: {
    url: string;
    data: { title: string; description?: string; lastModified?: Date };
  };
  /** The loader's page tree, e.g. `apiSource.getPageTree()`. */
  tree: Root;
  /** The tree's root, the first breadcrumb after the site home, e.g. `{ name: "API Reference", url: "/api-reference" }`. */
  section: { name: string; url: string };
  /** Path of the page's social card, from `ogImagePath`. */
  image?: string;
};

/** `TechArticle` + `BreadcrumbList` for one docs, ATS Engine or API reference page. */
export function docPageSchema({ page, tree, section, image }: DocPageSchemaInput) {
  const url = `${siteConfig.url}${page.url}`;
  const title = page.data.title;

  const folders = getBreadcrumbItems(page.url, tree).flatMap((item) =>
    typeof item.name === "string" && item.url ? [{ name: item.name, url: item.url }] : [],
  );

  const trail = [
    { name: siteConfig.name, url: "/" },
    { name: section.name, url: section.url },
    ...folders,
    { name: title, url: page.url },
  ].filter((item, index, all) => all.findIndex((other) => other.url === item.url) === index);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": `${url}#article`,
        headline: title,
        ...(page.data.description && { description: page.data.description }),
        url,
        mainEntityOfPage: url,
        ...(image && { image: `${siteConfig.url}${image}` }),
        ...(page.data.lastModified && {
          dateModified: new Date(page.data.lastModified).toISOString(),
        }),
        inLanguage: "en",
        publisher: { "@id": ORGANIZATION_ID },
        isPartOf: { "@id": WEBSITE_ID },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: trail.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: item.url === "/" ? siteConfig.url : `${siteConfig.url}${item.url}`,
        })),
      },
    ],
  };
}
