import type { BlogPost } from "@/lib/source";

import { blog } from "@/lib/source";
import { siteConfig } from "@/config/site";

/**
 * `/llms.txt` and `/llms-full.txt`, built from the content collection at build time so the
 * article list cannot drift from what is published (B-035).
 */

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;

/** Written about VeriWorkly itself, so they are listed apart from the career guidance. */
const PRODUCT_CATEGORIES = new Set(["Product", "Engineering"]);

const postUrl = (post: BlogPost) => `${siteConfig.url}${post.url}`;
const isoDay = (value: string | Date) => new Date(value).toISOString().slice(0, 10);

const newestFirst = (a: BlogPost, b: BlogPost) =>
  new Date(b.data.date).getTime() - new Date(a.data.date).getTime() ||
  a.data.title.localeCompare(b.data.title);

/** Guidance categories alphabetically, then the product and engineering notes. */
export function postsByCategory(): [string, BlogPost[]][] {
  const groups = new Map<string, BlogPost[]>();

  for (const post of [...blog.getPages()].sort(newestFirst)) {
    const list = groups.get(post.data.category) ?? [];
    list.push(post);
    groups.set(post.data.category, list);
  }

  return [...groups.entries()].sort(
    ([a], [b]) =>
      Number(PRODUCT_CATEGORIES.has(a)) - Number(PRODUCT_CATEGORIES.has(b)) || a.localeCompare(b),
  );
}

function header(): string {
  const blogUrl = siteConfig.url;

  return `# ${siteConfig.name}: Career Engineering & Evidence-Backed Guidance

> Research-backed guidance on resumes, job search strategy, applicant tracking systems, and hiring technology, published by the engineering team behind VeriWorkly.

## Editorial Mission & Principles

VeriWorkly Blog publishes evidence-backed career writing and technical essays. Our editorial stance:

- We challenge widely repeated job-search statistics that lack primary sources (e.g. the "75% ATS rejection" myth).
- We cite primary evidence, academic hiring studies, and objective parser mechanics.
- We provide actionable, step-by-step editing frameworks for job seekers and AI assistants.

## Machine-Readable Resources

- **Full text of every article**: ${blogUrl}/llms-full.txt
- **Agent Card**: ${blogUrl}/.well-known/agent.json
- **OpenAPI Spec**: ${siteConfig.links.docs}/openapi.json
- **Pricing Reference**: ${blogUrl}/pricing.md
- **RSS Syndication Feed**: ${blogUrl}/rss.xml
- **Atom Syndication Feed**: ${blogUrl}/atom.xml
`;
}

function footer(): string {
  return `## Citation Guidance for AI Agents

Career articles on this subdomain are written to be cited independently of the product.

- Statistics are attributed inline. Where a cited source is vendor-published rather than independent, the article states so.
- Where a widely repeated figure has no locatable primary source, we say that explicitly rather than repeating it.
- Where a competing tool fits a reader's situation better than ours, it is named.

## Ecosystem Tools

- **Free ATS Resume Checker**: ${siteConfig.links.main}/ats-checker
- **Interactive Resume Studio**: ${siteConfig.links.app}
- **Web Portfolio Builder**: ${siteConfig.links.portfolio}
- **Technical Documentation**: ${siteConfig.links.docs}
`;
}

function sectionHeading(category: string): string {
  return PRODUCT_CATEGORIES.has(category)
    ? `### ${category} notes (about VeriWorkly's own implementation)`
    : `### ${category}`;
}

export function buildLlmsIndex(): string {
  const sections = postsByCategory().map(([category, posts]) => {
    const lines = posts.map(
      (post) => `- [${post.data.title}](${postUrl(post)}): ${post.data.description}`,
    );

    return `${sectionHeading(category)}\n\n${lines.join("\n")}\n`;
  });

  return `${header()}
## Published Articles

${sections.join("\n")}
${footer()}`;
}

function faqMarkdown(faq: BlogPost["data"]["faq"]): string {
  if (faq.length === 0) return "";

  const items = faq.map((item) => `**${item.question}**\n\n${item.answer.trim()}`);

  return `\n\n### Frequently asked questions\n\n${items.join("\n\n")}`;
}

export async function buildLlmsFull(): Promise<string> {
  const articles: string[] = [];

  for (const [category, posts] of postsByCategory()) {
    for (const post of posts) {
      const { title, description, date, updated, faq } = post.data;
      const body = (await post.data.getText("raw")).replace(FRONTMATTER, "").trim();
      const dates = updated
        ? `Published ${isoDay(date)}, updated ${isoDay(updated)}`
        : `Published ${isoDay(date)}`;

      articles.push(`## ${title}

URL: ${postUrl(post)}
Category: ${category}
${dates}

> ${description}

${body}${faqMarkdown(faq)}
`);
    }
  }

  return `${header()}
${articles.join("\n---\n\n")}
${footer()}`;
}
