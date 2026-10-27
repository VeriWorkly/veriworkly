import { siteConfig } from "@/config/site";

/**
 * Blog posts the site links to from its own pages. Only posts whose product claims are true
 * today (the blog audit flagged B-024…B-027); a contract test checks each slug exists.
 */
export const BLOG_GUIDES = {
  resumeLength: {
    slug: "how-long-should-a-resume-be",
    title: "How long should a resume be?",
  },
  atsFormat: {
    slug: "ats-friendly-resume-format",
    title: "ATS-friendly resume format: what a parser actually receives",
  },
  tailoring: {
    slug: "how-to-tailor-your-resume-to-a-job-description",
    title: "How to tailor a resume to a job description",
  },
  blankPdf: {
    slug: "why-some-resume-pdfs-parse-as-blank",
    title: "Why a resume PDF parses as blank",
  },
  bulletPoints: {
    slug: "how-to-write-resume-bullet-points-that-get-read",
    title: "How to write resume bullet points that get read",
  },
  coverLetter: {
    slug: "do-you-need-a-cover-letter",
    title: "Do you need a cover letter?",
  },
} as const;

export type BlogGuide = (typeof BLOG_GUIDES)[keyof typeof BLOG_GUIDES];

export const blogGuideUrl = (guide: BlogGuide) => `${siteConfig.links.blog}/${guide.slug}`;
