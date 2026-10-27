import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { BLOG_GUIDES } from "@/config/blog-guides";

/** The site links these posts from its own pages: each must exist and be one whose claims hold. */

const posts = join(__dirname, "..", "..", "..", "blog-platform", "content", "blog");

// Blog audit B-024…B-027: product claims that are false today. Do not send site visitors there.
const FLAGGED = [
  "introducing-the-portfolio-builder",
  "should-you-have-a-portfolio-website",
  "ats-resume-myths-what-the-evidence-shows",
  "free-resume-builders-compared",
];

describe("blog guides linked from the site", () => {
  for (const [key, guide] of Object.entries(BLOG_GUIDES)) {
    it(`${key} points at a real, unflagged post`, () => {
      expect(existsSync(join(posts, `${guide.slug}.mdx`)), guide.slug).toBe(true);
      expect(FLAGGED).not.toContain(guide.slug);
    });
  }

  it("the resume-length FAQ links its guide instead of printing the URL", async () => {
    const { faqs } = await import("@/features/faq/data/faqItems");
    const faq = faqs.find((item) => item.id === "resume-length")!;

    expect(faq.readMore).toBe(BLOG_GUIDES.resumeLength);
    expect(faq.answer).not.toMatch(/blog\.veriworkly\.com/);
  });
});
