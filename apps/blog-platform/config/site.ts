const isDev = process.env.NODE_ENV === "development";

export const siteConfig = {
  name: "VeriWorkly Blog",
  shortName: "VeriWorkly",

  creator: "Gautam Raj",
  email: "info@veriworkly.com",

  tagline: "Resume and job search guidance, backed by evidence.",
  description:
    "Research-backed guidance on resumes, job search strategy, and hiring technology — plus engineering notes from the team building VeriWorkly.",
  url: process.env.SITE_URL || "https://blog.veriworkly.com",
  twitterHandle: "@veriworkly",

  links: {
    twitter: "https://x.com/veriworkly",
    github: "https://github.com/VeriWorkly/veriworkly",
    linkedin: "https://linkedin.com/company/veriworkly",

    main: isDev ? "http://localhost:3000" : "https://veriworkly.com",
    app: isDev ? "http://localhost:3001" : "https://app.veriworkly.com",
    docs: isDev ? "http://localhost:3002" : "https://docs.veriworkly.com",
    blog: isDev ? "http://localhost:3003" : "https://blog.veriworkly.com",
    portfolio: isDev ? "http://localhost:3004" : "https://portfolio.veriworkly.com",
  },

  keywords: [
    "resume tips",
    "ats resume",
    "applicant tracking system",
    "job search advice",
    "resume writing",
    "free resume builder",
    "VeriWorkly",
  ],
} as const;

/** The root layout's title template. */
export const titleTemplate = `%s | ${siteConfig.shortName} Blog`;

/** Search results cut titles near 60 characters, so a post drops the template rather than lose words. */
export const TITLE_LIMIT = 60;

export function pageTitle(title: string): string | { absolute: string } {
  return titleTemplate.replace("%s", title).length <= TITLE_LIMIT ? title : { absolute: title };
}

/**
 * Next.js replaces `alternates` wholesale rather than deep-merging it, so a page that
 * sets its own canonical silently drops the feed links declared in the root layout.
 * Every page spreads this instead of re-declaring `canonical` alone.
 */
export const feedAlternates: Record<string, { url: string; title: string }[]> = {
  "application/rss+xml": [{ url: `${siteConfig.url}/rss.xml`, title: siteConfig.name }],
  "application/atom+xml": [{ url: `${siteConfig.url}/atom.xml`, title: siteConfig.name }],
};
