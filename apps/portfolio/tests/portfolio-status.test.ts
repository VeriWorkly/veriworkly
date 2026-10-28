import { describe, expect, it } from "vitest";

// `@/config/site` reads env into module-level consts at import time, and
// `portfolioWorkspaceUrl` branches on NODE_ENV via its `isDev` flag. Vitest runs
// with NODE_ENV=test, so `isDev` is false and the production hosts are asserted.
import { portfolioWorkspaceUrl } from "@/config/site";
import { createDefaultPortfolio, type PortfolioContent } from "@/lib/portfolio";
import { getPortfolioReadiness, isPortfolioPubliclyVisible } from "@/lib/portfolio-status";

function contentWith(patch: Partial<PortfolioContent> = {}): PortfolioContent {
  return { ...createDefaultPortfolio(), ...patch };
}

describe("isPortfolioPubliclyVisible", () => {
  it("treats GRACE as reachable, since the server still serves those publications", () => {
    expect(isPortfolioPubliclyVisible("LIVE")).toBe(true);
    expect(isPortfolioPubliclyVisible("GRACE")).toBe(true);
  });

  it("treats suspended and absent publications as not reachable", () => {
    expect(isPortfolioPubliclyVisible("SUSPENDED")).toBe(false);
    expect(isPortfolioPubliclyVisible(undefined)).toBe(false);
    expect(isPortfolioPubliclyVisible(null)).toBe(false);
  });
});

describe("getPortfolioReadiness", () => {
  it("keeps the percentage tied to the checklist it renders beside", () => {
    // The regression: the score and the checklist were computed from different
    // inputs, so a fully-filled-in but unpublished portfolio reported 100% next
    // to a list that was visibly two-of-four done.
    const readiness = getPortfolioReadiness(
      contentWith({
        identity: {
          name: "Gautam Raj",
          headline: "Engineer",
          bio: "Bio",
          email: "a@b.com",
          location: "",
          availability: "",
          avatar: null,
        },
        seo: { title: "", description: "", socialImage: null },
      }),
      undefined,
    );

    const completed = readiness.checks.filter((check) => check.complete).length;

    expect(readiness.percent).toBe(Math.round((completed / readiness.checks.length) * 100));
    expect(readiness.checks.find((check) => check.id === "identity")?.complete).toBe(true);
    expect(readiness.checks.find((check) => check.id === "seo")?.complete).toBe(false);
    expect(readiness.checks.find((check) => check.id === "publishing")?.complete).toBe(false);
    expect(readiness.percent).toBeLessThan(100);
  });

  it("only reaches 100% when every rendered check passes", () => {
    const readiness = getPortfolioReadiness(
      contentWith({
        identity: {
          name: "Gautam Raj",
          headline: "Engineer",
          bio: "Bio",
          email: "a@b.com",
          location: "",
          availability: "",
          avatar: null,
        },
        seo: { title: "Portfolio", description: "A portfolio", socialImage: null },
        sections: [
          { id: "a", type: "projects", title: "Projects", subtitle: "", visible: true, items: [] },
          {
            id: "b",
            type: "experience",
            title: "Experience",
            subtitle: "",
            visible: true,
            items: [],
          },
        ],
      }),
      "LIVE",
    );

    expect(readiness.checks.every((check) => check.complete)).toBe(true);
    expect(readiness.percent).toBe(100);
  });

  it("reports zero for an empty workspace instead of throwing", () => {
    const readiness = getPortfolioReadiness(null, undefined);

    expect(readiness.percent).toBe(0);
    expect(readiness.completedIdentity).toBe(0);
    expect(readiness.visibleSections).toBe(0);
    expect(readiness.projectCount).toBe(0);
  });

  it("ignores hidden sections and counts project items", () => {
    const readiness = getPortfolioReadiness(
      contentWith({
        sections: [
          {
            id: "a",
            type: "projects",
            title: "Projects",
            subtitle: "",
            visible: true,
            items: [{ id: "1" }, { id: "2" }],
          },
          {
            id: "b",
            type: "experience",
            title: "Experience",
            subtitle: "",
            visible: false,
            items: [],
          },
        ],
      }),
      undefined,
    );

    expect(readiness.visibleSections).toBe(1);
    expect(readiness.projectCount).toBe(2);
    expect(readiness.checks.find((check) => check.id === "sections")?.complete).toBe(false);
  });
});

describe("portfolioWorkspaceUrl", () => {
  it("gives every account its subdomain, free or paid (owner rule 2026-10-28)", () => {
    expect(portfolioWorkspaceUrl("gautam")).toEqual({
      href: "https://gautam.veriworkly.com",
      display: "gautam.veriworkly.com",
    });
  });
});
