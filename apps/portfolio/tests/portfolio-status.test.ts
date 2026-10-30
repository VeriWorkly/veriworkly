import { describe, expect, it } from "vitest";

// `@/config/site` reads env into module-level consts at import time, and
// `portfolioWorkspaceUrl` branches on NODE_ENV via its `isDev` flag. Vitest runs
// with NODE_ENV=test, so `isDev` is false and the production hosts are asserted.
import { portfolioWorkspaceUrl } from "@/config/site";
import { createDefaultPortfolio, type PortfolioContent } from "@/lib/portfolio";
import {
  getPortfolioReadiness,
  hasPortfolioAccess,
  isPortfolioPubliclyVisible,
  planLabel,
  publicationNotice,
} from "@/lib/portfolio-status";
import {
  checkSubdomain,
  defaultSubdomain,
  subdomainCheckMessage,
  suggestSubdomain,
} from "@/lib/subdomain";

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
      true,
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

  it("lets a free user reach 100% without the SEO controls they cannot use (P-035)", () => {
    const content = contentWith({
      identity: {
        name: "Gautam Raj",
        headline: "Engineer",
        bio: "Bio",
        email: "a@b.com",
        location: "",
        availability: "",
        avatar: null,
      },
      seo: { title: "Portfolio", description: "", socialImage: null },
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
    });

    const free = getPortfolioReadiness(content, "LIVE", false);
    expect(free.checks.map((check) => check.id)).not.toContain("seo");
    expect(free.percent).toBe(100);

    const paid = getPortfolioReadiness(content, "LIVE", true);
    expect(paid.checks.find((check) => check.id === "seo")?.complete).toBe(false);
    expect(paid.percent).toBeLessThan(100);

    // Publishing is done from the site status card, not Settings.
    expect(free.checks.find((check) => check.id === "publishing")?.href).toBe(
      "/dashboard#site-status",
    );
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

describe("paid portfolio access (P-010)", () => {
  it("follows canPublish, not the subscription status", () => {
    // A pass has no subscription row; an AI Credits plan is ACTIVE but buys no portfolio access.
    expect(hasPortfolioAccess({ canPublish: true, plan: "BUNDLE" })).toBe(true);
    expect(hasPortfolioAccess({ canPublish: false, plan: "AI_CREDITS" })).toBe(false);
    expect(hasPortfolioAccess(null)).toBe(false);
  });
});

describe("planLabel", () => {
  it("names every paid state and never calls a payer free", () => {
    expect(planLabel({ access: { tier: "pass", isPaying: true } })).toBe("Job Hunter pass");
    expect(planLabel({ access: { tier: "ai_credits", isPaying: true } })).toBe("AI Credits");
    expect(planLabel({ access: { tier: "credits", isPaying: true } })).toBe("Credits customer");
    expect(planLabel({ plan: "PORTFOLIO_PRO" })).toBe("Creator Pro");
    expect(planLabel({ plan: "FREE", access: { tier: "free", isPaying: true } })).toBe(
      "Credits customer",
    );
    expect(planLabel({ plan: "FREE", access: { tier: "free", isPaying: false } })).toBe("Free");
  });
});

describe("publicationNotice (P-014, P-033)", () => {
  const day = (iso: string) => iso.slice(0, 10);

  it("maps each state to its copy and action", () => {
    const cases = [
      [null, "Not published yet", "publish"],
      [{ status: "LIVE", offlineReason: null }, "Live", null],
      [{ status: "GRACE", offlineReason: null }, "Plan ended", "renew"],
      [{ status: "SUSPENDED", offlineReason: "owner" }, "Offline", "republish"],
      [{ status: "SUSPENDED", offlineReason: "billing" }, "Offline", "republish"],
      [{ status: "SUSPENDED", offlineReason: "moderation" }, "Taken down", "support"],
    ] as const;

    for (const [publication, label, action] of cases) {
      const notice = publicationNotice(publication, null, day);
      expect([notice.label, notice.action]).toEqual([label, action]);
    }
  });

  it("dates grace and a cancelled plan", () => {
    expect(
      publicationNotice({ status: "GRACE" }, { graceEndsAt: "2026-11-06T00:00:00Z" }, day).detail,
    ).toBe(
      "Your plan ended. Your site keeps its paid features until 2026-11-06, then moves to the free tier (Signal or Atelier with the badge). Renew to keep them.",
    );
    expect(
      publicationNotice(
        { status: "LIVE" },
        { cancelAtPeriodEnd: true, accessEndsAt: "2026-12-01T00:00:00Z" },
        day,
      ).planEnds,
    ).toBe("Your plan ends on 2026-12-01.");
  });
});

describe("subdomains (P-023, P-019)", () => {
  it("never starts a portfolio on a reserved or empty subdomain", () => {
    expect(defaultSubdomain({ name: "Gautam Raj" })).toBe("gautam-raj");
    expect(defaultSubdomain({ name: "José" })).toBe("jose");
    expect(defaultSubdomain({ name: "Designer" })).toBe("designer-portfolio");
    expect(defaultSubdomain({ name: "李明", email: "li.ming@example.com" })).toBe("li-ming");
    expect(defaultSubdomain({ name: "", email: "" })).toBe("my-portfolio");
    expect(defaultSubdomain(null)).toBe("my-portfolio");
  });

  it("suggests the name with four digits", () => {
    expect(suggestSubdomain("gautam", () => 0)).toBe("gautam-1000");
  });

  it("reads the availability answer into taken, not allowed or available", async () => {
    const answer = (status: number, body: unknown) => async () =>
      new Response(JSON.stringify(body), { status });

    const free = await checkSubdomain("gautam", answer(200, { data: { available: true } }));
    const taken = await checkSubdomain("gautam", answer(200, { data: { available: false } }));
    const refused = await checkSubdomain("xn-abc", answer(200, {}));
    const invalid = await checkSubdomain("gautam", answer(400, { message: "Choose a valid" }));

    expect(subdomainCheckMessage(free)).toBe("gautam.veriworkly.com is available.");
    expect(subdomainCheckMessage(taken)).toBe(
      "gautam.veriworkly.com is taken. Choose another name.",
    );
    expect(taken.state === "taken" && taken.suggestion).toMatch(/^gautam-\d{4}$/);
    expect(refused.state).toBe("not-allowed");
    expect(subdomainCheckMessage(invalid)).toBe(
      '"gautam" is reserved or not allowed. Choose another name.',
    );
  });
});

describe("reserved subdomains stay in step with the server", () => {
  it("lists exactly the names apps/server/src/utils/slugs.ts refuses", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { RESERVED_SUBDOMAINS } = await import("@/lib/subdomain");
    const source = readFileSync(
      join(__dirname, "..", "..", "server", "src", "utils", "slugs.ts"),
      "utf8",
    );
    // RESERVED_SUBDOMAINS on the server spreads RESERVED_USERNAMES and adds its own names.
    const blocks = [...source.matchAll(/new Set\(\[([\s\S]*?)\]\)/g)].slice(0, 2);
    const server = new Set(blocks.flatMap((block) => block[1].match(/"[a-z0-9-]+"/g) ?? []));

    expect([...RESERVED_SUBDOMAINS].map((name) => `"${name}"`).sort()).toEqual([...server].sort());
  });
});
