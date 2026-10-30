import { describe, expect, it } from "vitest";

import { createDefaultPortfolio, type PortfolioContent } from "@/lib/portfolio";
import {
  fieldIds,
  isValidEmail,
  issuesFromDetails,
  publishIssues,
  withScheme,
} from "@/lib/portfolio-limits";

const complete: PortfolioContent = {
  ...createDefaultPortfolio(),
  identity: {
    name: "Gautam Raj",
    headline: "Engineer",
    bio: "Builds things.",
    email: "gautam@veriworkly.com",
    location: "",
    availability: "",
    avatar: null,
  },
  socialLinks: [],
  sections: [{ id: "s1", type: "projects", title: "Work", visible: true, items: [] }],
};

describe("pre-publish checklist (P-036)", () => {
  it("has nothing to say about a draft the server would publish", () => {
    expect(publishIssues(complete)).toEqual([]);
  });

  it("names each gap the server refuses, with where to fix it", () => {
    const issues = publishIssues({
      ...complete,
      identity: { ...complete.identity, headline: " ", email: "" },
      socialLinks: [{ id: "l1", label: "GitHub", url: "" }],
      sections: [{ ...complete.sections[0], title: "" }],
      pages: [
        {
          id: "p1",
          slug: "work",
          title: "Work",
          sections: [{ id: "s2", type: "skills", title: "", visible: true, items: [] }],
        },
      ],
    });

    expect(issues).toEqual([
      {
        message: "Add a professional headline.",
        pageId: null,
        sectionId: "profile",
        fieldId: fieldIds.headline,
      },
      {
        message: "Add a public email.",
        pageId: null,
        sectionId: "profile",
        fieldId: fieldIds.email,
      },
      {
        message: "Social link 1 needs a label and a full web address.",
        pageId: null,
        sectionId: "profile",
      },
      {
        message: "Section 1 needs a title.",
        pageId: null,
        sectionId: "s1",
        fieldId: fieldIds.sectionTitle,
      },
      {
        message: "Section 1 on Work needs a title.",
        pageId: "p1",
        sectionId: "s2",
        fieldId: fieldIds.sectionTitle,
      },
    ]);
  });

  it("points the server's own field messages at the editor (P-004)", () => {
    const content = {
      ...complete,
      pages: [{ id: "p1", slug: "work", title: "Work", sections: complete.sections }],
    };
    expect(
      issuesFromDetails(content, [
        { path: "identity.bio", message: "Required" },
        { path: "sections.0.title", message: "Too short" },
        { path: "pages.0.sections.0.title", message: "Too short" },
      ]),
    ).toEqual([
      { message: "Required", pageId: null, sectionId: "profile", fieldId: fieldIds.bio },
      { message: "Too short", pageId: null, sectionId: "s1", fieldId: fieldIds.sectionTitle },
      { message: "Too short", pageId: "p1", sectionId: "s1", fieldId: fieldIds.sectionTitle },
    ]);
  });
});

describe("field checks", () => {
  it("accepts an empty or complete email, not a half-typed one", () => {
    expect(isValidEmail("")).toBe(true);
    expect(isValidEmail("you@example.com")).toBe(true);
    expect(isValidEmail("you@")).toBe(false);
  });

  it("gives a link typed without a scheme its https://", () => {
    expect(withScheme("github.com/me")).toBe("https://github.com/me");
    expect(withScheme("http://example.com")).toBe("http://example.com");
    expect(withScheme("  ")).toBe("");
  });
});
