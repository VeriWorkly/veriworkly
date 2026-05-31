import { describe, expect, it } from "vitest";

import {
  portfolioContentSchema,
  portfolioDraftContentSchema,
} from "../../src/validators/portfolioValidator";

const validPortfolio = {
  schemaVersion: 1,
  templateId: "signal",
  identity: {
    name: "Gautam Raj",
    headline: "Product engineer",
    bio: "Builds considered software.",
    location: "India",
    email: "gautam@veriworkly.com",
    availability: "Available",
    avatar: null,
  },
  seo: { title: "Gautam Raj | Portfolio", description: "Portfolio", socialImage: null },
  socialLinks: [],
  sections: [{ id: "projects", type: "projects", title: "Work", visible: true, items: [] }],
};

describe("portfolio validator", () => {
  it("accepts a modular portfolio snapshot", () => {
    expect(portfolioContentSchema.parse(validPortfolio)).toEqual(validPortfolio);
  });

  it("rejects malformed public identity data", () => {
    expect(() =>
      portfolioContentSchema.parse({
        ...validPortfolio,
        identity: { ...validPortfolio.identity, email: "not-an-email" },
      }),
    ).toThrow();
  });

  it("accepts incomplete fields while a draft is being edited", () => {
    expect(() =>
      portfolioDraftContentSchema.parse({
        ...validPortfolio,
        identity: { ...validPortfolio.identity, headline: "", email: "" },
        socialLinks: [{ id: "new-link", label: "", url: "" }],
        sections: [{ ...validPortfolio.sections[0], title: "" }],
      }),
    ).not.toThrow();
  });

  it("rejects non-web links in public snapshots", () => {
    expect(() =>
      portfolioContentSchema.parse({
        ...validPortfolio,
        socialLinks: [{ id: "unsafe", label: "Unsafe", url: "javascript:alert(1)" }],
      }),
    ).toThrow();
  });
});
