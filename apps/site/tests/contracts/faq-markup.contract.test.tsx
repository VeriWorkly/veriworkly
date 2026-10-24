import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import FAQList from "@/features/landing/faq/FAQList";
import { faqs } from "@/features/landing/faq/data/faqItems";

/**
 * The landing page emits FAQPage structured data for these ten questions. Google treats
 * markup for text that is not in the page as a mismatch, so every answer must be in the
 * server-rendered HTML, not mounted on click (W-005).
 */

const decode = (html: string) =>
  html
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

describe("landing FAQ markup", () => {
  const html = decode(renderToStaticMarkup(<FAQList />));

  it("renders every question and answer in the HTML", () => {
    for (const faq of faqs) {
      expect(html, faq.id).toContain(faq.question);
      expect(html, faq.id).toContain(faq.answer);
    }
  });

  it("uses disclosure elements, so the answers are reachable without JavaScript", () => {
    expect((html.match(/<details/g) ?? []).length).toBe(faqs.length);
    expect((html.match(/<summary/g) ?? []).length).toBe(faqs.length);
  });
});
