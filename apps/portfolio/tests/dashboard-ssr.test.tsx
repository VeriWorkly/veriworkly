import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

process.env.NEXT_PUBLIC_BACKEND_URL = "http://test-backend.local";

import { AnalyticsProvider, WorkspaceProvider } from "@/components/WorkspaceProvider";
import { PortfolioAnalyticsWorkspace } from "@/components/dashboard/analytics/PortfolioAnalyticsWorkspace";
import { PortfolioDashboardWorkspace } from "@/components/dashboard/overview/PortfolioDashboardWorkspace";
import { PortfolioSettingsWorkspace } from "@/components/dashboard/settings/PortfolioSettingsWorkspace";
import { createDefaultPortfolio, type PortfolioContent } from "@/lib/portfolio";

/**
 * `renderToStaticMarkup` runs no effects, so it reproduces exactly what the server
 * emits — which is the whole point of these tests. The dashboard used to derive its
 * context solely from the Zustand store, and the store is only populated from an
 * effect, so the server shipped an empty shell that the client then overwrote.
 */

const completeContent: PortfolioContent = {
  ...createDefaultPortfolio(),
  identity: {
    name: "Gautam Raj",
    headline: "Staff engineer building developer tools",
    bio: "Bio",
    email: "gautam@veriworkly.com",
    location: "Bengaluru",
    availability: "",
    avatar: null,
  },
  seo: { title: "Gautam Raj", description: "Portfolio of Gautam Raj", socialImage: null },
  sections: [
    {
      id: "a",
      type: "projects",
      title: "Projects",
      subtitle: "",
      visible: true,
      items: [{ id: "1" }, { id: "2" }, { id: "3" }],
    },
    { id: "b", type: "experience", title: "Experience", subtitle: "", visible: true, items: [] },
  ],
};

function bootstrap({
  locked = false,
  canPublish = true,
  totalViews = 1234,
}: { locked?: boolean; canPublish?: boolean; totalViews?: number } = {}) {
  return {
    user: { name: "Gautam Raj", email: "gautam@veriworkly.com" },
    workspace: {
      draft: {
        id: "doc_1",
        slug: "gautam",
        templateId: "signal",
        content: completeContent,
        revision: 4,
        updatedAt: new Date("2026-08-01T00:00:00.000Z").toISOString(),
      },
      publication: { subdomain: "gautam", status: "LIVE" as const },
      billing: { canPublish, status: canPublish ? "ACTIVE" : "INACTIVE" },
    },
    analytics: {
      locked,
      totalViews: locked ? 0 : totalViews,
      daily: locked ? [] : [{ date: "2026-08-01T00:00:00.000Z", count: 12 }],
      referrers: locked ? [] : [{ host: "news.ycombinator.com", count: 9 }],
    },
    isAdmin: false,
  };
}

/** Mirrors the real route nesting: workspace layout wraps, dashboard layout adds analytics. */
function renderWorkspace(
  options: Parameters<typeof bootstrap>[0],
  children: React.ReactNode,
): string {
  const data = bootstrap(options);

  return renderToStaticMarkup(
    <WorkspaceProvider initialData={data}>
      <AnalyticsProvider analytics={data.analytics}>{children}</AnalyticsProvider>
    </WorkspaceProvider>,
  );
}

describe("dashboard server rendering", () => {
  it("emits the real portfolio data in the initial HTML", () => {
    const markup = renderWorkspace({}, <PortfolioDashboardWorkspace />);

    // Each of these was the empty-state value before the provider fell back to
    // `initialData`: no name, "0" views, "0%" readiness, "Create your first draft".
    expect(markup).toContain("Gautam");
    expect(markup).toContain("1234");
    expect(markup).toContain("100");
    expect(markup).toContain("gautam.veriworkly.com");
    expect(markup).toContain("Staff engineer building developer tools");
    expect(markup).not.toContain("Create your first draft");
  });

  it("does not read the clock during the server pass", () => {
    const markup = renderWorkspace({}, <PortfolioDashboardWorkspace />);

    // A server-timezone greeting would hydrate into a different one for the visitor.
    expect(markup).toContain("Welcome back");
    expect(markup).not.toContain("Good morning");
    expect(markup).not.toContain("Good afternoon");
    expect(markup).not.toContain("Good evening");
  });

  it("shows a free account its own subdomain (owner rule 2026-10-28)", () => {
    const markup = renderWorkspace(
      { canPublish: false, locked: true },
      <PortfolioDashboardWorkspace />,
    );

    expect(markup).toContain("gautam.veriworkly.com");
    expect(markup).not.toContain("portfolio.veriworkly.com/portfolio/gautam");
  });

  it("lets a free account choose its subdomain in settings", () => {
    const markup = renderWorkspace(
      { canPublish: false, locked: true },
      <PortfolioSettingsWorkspace />,
    );

    const subdomainInput = /<input[^>]*value="gautam"[^>]*>/.exec(markup)?.[0];
    expect(subdomainInput).toBeDefined();
    // The attribute, not the `disabled:` Tailwind variants in the class list.
    expect(subdomainInput).not.toMatch(/\sdisabled(=""|\s|\/?>)/);
    expect(markup).not.toMatch(/custom subdomain/i);
  });

  it("withholds view counts from a locked account instead of showing a false zero", () => {
    const markup = renderWorkspace(
      { canPublish: false, locked: true },
      <PortfolioDashboardWorkspace />,
    );

    expect(markup).toContain("Available on Creator Pro");
  });
});

describe("store isolation between renders", () => {
  it("does not leak one render's portfolio into another", () => {
    // The reason the store had to stop being a module-level singleton. On the server a
    // singleton is shared by every in-flight request, so seeding it with a user's data
    // during render would make that data readable by whoever renders next. Each provider
    // now owns its instance; rendering one must not affect the other.
    const first = renderWorkspace({}, <PortfolioSettingsWorkspace />);

    const second = renderToStaticMarkup(
      <WorkspaceProvider
        initialData={{
          user: { name: "Someone Else", email: "other@veriworkly.com" },
          workspace: {
            draft: {
              id: "doc_2",
              slug: "someone-else",
              templateId: "signal",
              content: {
                ...completeContent,
                identity: { ...completeContent.identity, name: "Someone Else" },
                seo: { title: "Someone Else", description: "Other", socialImage: null },
              },
              revision: 1,
              updatedAt: new Date("2026-08-02T00:00:00.000Z").toISOString(),
            },
            publication: null,
            billing: { canPublish: true, status: "ACTIVE" },
          },
          isAdmin: false,
        }}
      >
        <PortfolioSettingsWorkspace />
      </WorkspaceProvider>,
    );

    expect(first).toContain("gautam");
    expect(first).not.toContain("someone-else");
    expect(second).toContain("someone-else");
    expect(second).not.toContain("Gautam Raj");
  });
});

describe("settings server rendering", () => {
  it("puts the account's own values in the form fields, not placeholders", () => {
    const markup = renderWorkspace({}, <PortfolioSettingsWorkspace />);
    const values = [...markup.matchAll(/value="([^"]*)"/g)].map((match) => match[1]);

    // This page is driven entirely by the store. While that store was a module-level
    // singleton it could not be seeded during SSR, so these fields server-rendered as
    // `["portfolio", "VeriWorkly User | Portfolio"]` — fabricated values in a form the
    // user was about to edit — and only became correct after hydration.
    expect(values).toContain("gautam");
    expect(values).toContain("Gautam Raj");
    expect(values).not.toContain("portfolio");
    expect(markup).not.toContain("VeriWorkly User");
  });

  it("previews the real public address", () => {
    const markup = renderWorkspace({}, <PortfolioSettingsWorkspace />);

    expect(markup).toContain("gautam.veriworkly.com");
    expect(markup).not.toContain("portfolio.veriworkly.com/portfolio/portfolio");
  });
});

describe("analytics server rendering", () => {
  it("renders the figures for an entitled account", () => {
    const markup = renderWorkspace({}, <PortfolioAnalyticsWorkspace />);

    expect(markup).toContain("1234");
    expect(markup).toContain("news.ycombinator.com");
    expect(markup).not.toContain("Upgrade to Pro");
  });

  it("ships no figures at all when the server locked the payload", () => {
    const markup = renderWorkspace(
      { canPublish: false, locked: true },
      <PortfolioAnalyticsWorkspace />,
    );

    // The lock is enforced server-side, so the numbers are absent from the payload
    // entirely rather than merely blurred by CSS.
    expect(markup).toContain("Upgrade to Pro");
    expect(markup).not.toContain("1234");
    expect(markup).not.toContain("news.ycombinator.com");
    // And the hidden region is out of the accessibility tree.
    expect(markup).toContain("inert");
  });
});
