import type { Author } from "@/lib/authors";

import { siteConfig } from "@/config/site";

type FaqItem = { question: string; answer: string };

type PostSchemaInput = {
  title: string;
  description: string;
  author: Author;
  date: string | Date;
  updated?: string | Date;
  category?: string;
  tags?: string[];
  faq?: FaqItem[];
  url: string;
  imageUrl: string;
  wordCount?: number;
};

const toISO = (value: string | Date) => new Date(value).toISOString();

const ORG_ID = `${siteConfig.url}/#organization`;
const SITE_ID = `${siteConfig.url}/#website`;
const BLOG_ID = `${siteConfig.url}/#blog`;

/**
 * The publishing entity. AI systems and search engines resolve authors and publishers
 * as entities, so one canonical node is declared here and referenced by `@id` everywhere
 * else rather than being re-declared inline with slightly different properties.
 */
const organizationSchema = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: siteConfig.shortName,
  url: siteConfig.links.main,
  logo: {
    "@type": "ImageObject",
    "@id": `${siteConfig.url}/#logo`,
    url: `${siteConfig.url}/veriworkly-logo.png`,
    contentUrl: `${siteConfig.url}/veriworkly-logo.png`,
  },
  sameAs: [siteConfig.links.twitter, siteConfig.links.github, siteConfig.links.linkedin],
};

/** A team byline is an editorial group inside the one real organization, not an entity of its own. */
function authorNode(author: Author) {
  const id = `${siteConfig.url}/#author-${encodeURIComponent(author.name.toLowerCase().replace(/\s+/g, "-"))}`;

  if (author.type === "person") {
    return {
      "@type": "Person",
      "@id": id,
      name: author.name,
      ...(author.url && { url: author.url }),
      ...(author.jobTitle && { jobTitle: author.jobTitle }),
      ...(author.sameAs?.length && { sameAs: author.sameAs }),
      worksFor: { "@id": ORG_ID },
    };
  }

  return {
    "@type": "Organization",
    "@id": id,
    name: author.name,
    url: siteConfig.url,
    parentOrganization: { "@id": ORG_ID },
  };
}

/** Site-level nodes. Emitted once from the root layout, referenced by every page. */
export function buildSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema,
      {
        "@type": "WebSite",
        "@id": SITE_ID,
        url: siteConfig.url,
        name: siteConfig.name,
        description: siteConfig.description,
        inLanguage: "en",
        publisher: { "@id": ORG_ID },
      },
      {
        "@type": "Blog",
        "@id": BLOG_ID,
        url: siteConfig.url,
        name: siteConfig.name,
        description: siteConfig.description,
        inLanguage: "en",
        isPartOf: { "@id": SITE_ID },
        publisher: { "@id": ORG_ID },
      },
    ],
  };
}

/**
 * Builds the JSON-LD graph for a post: BlogPosting, an optional FAQPage, and the
 * Blog → Post breadcrumb trail. Returned as a single `@graph` so one script tag covers all.
 *
 * Note on FAQPage: Google restricted FAQ rich results to authoritative government and
 * health sites in August 2023, so this will not render an accordion in Google SERPs.
 * It is kept because ChatGPT, Perplexity, and Claude do parse it, and because the
 * visible accordion and the markup are generated from one frontmatter source.
 */
export function buildPostSchema({
  title,
  description,
  author,
  date,
  updated,
  category,
  tags = [],
  faq = [],
  url,
  imageUrl,
  wordCount,
}: PostSchemaInput) {
  const graph: Record<string, unknown>[] = [
    organizationSchema,
    {
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      headline: title,
      description,
      image: {
        "@type": "ImageObject",
        url: imageUrl,
        width: 1200,
        height: 630,
      },
      datePublished: toISO(date),
      dateModified: toISO(updated ?? date),
      author: authorNode(author),
      publisher: { "@id": ORG_ID },
      isPartOf: { "@id": BLOG_ID },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      inLanguage: "en",
      ...(category && { articleSection: category }),
      ...(typeof wordCount === "number" && wordCount > 0 && { wordCount }),
      ...(tags.length > 0 && { keywords: tags.join(", ") }),
      isAccessibleForFree: true,
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Blog", item: siteConfig.url },
        { "@type": "ListItem", position: 2, name: title, item: url },
      ],
    },
  ];

  if (faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      isPartOf: { "@id": `${url}#article` },
      mainEntity: faq.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

/** The archive page: a CollectionPage whose main entity is the list of every post. */
export function buildArchiveSchema({
  url,
  name,
  description,
  posts,
}: {
  url: string;
  name: string;
  description: string;
  posts: { url: string; title: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#page`,
    url,
    name,
    description,
    inLanguage: "en",
    isPartOf: { "@id": SITE_ID },
    about: { "@id": BLOG_ID },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((post, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: post.url,
        name: post.title,
      })),
    },
  };
}

/**
 * JSON-LD is injected with `dangerouslySetInnerHTML`, so a literal `</script>` anywhere
 * in a title, description, or FAQ answer would close the tag early. Escaping `<` is the
 * standard mitigation and costs nothing.
 */
export function serializeSchema(schema: unknown): string {
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}
