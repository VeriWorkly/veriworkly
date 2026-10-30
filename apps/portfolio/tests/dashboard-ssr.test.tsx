import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

process.env.NEXT_PUBLIC_BACKEND_URL = "http://test-backend.local";

import { AnalyticsProvider, WorkspaceProvider } from "@/components/WorkspaceProvider";
import { PortfolioAnalyticsWorkspace } from "@/components/dashboard/analytics/PortfolioAnalyticsWorkspace";
import { PortfolioDashboardWorkspace } from "@/components/dashboard/overview/PortfolioDashboardWorkspace";
import { PortfolioSettingsWorkspace } from "@/components/dashboard/settings/PortfolioSettingsWorkspace";
import { createDefaultPortfolio, type PortfolioContent } from "@/lib/portfolio";
import { StructureRail } from "@/components/dashboard/editor/StructureRail";
import { ContentCanvas } from "@/components/dashboard/editor/ContentCanvas";
import { previewProject, showsBadge } from "@/components/LivePortfolioPreview";

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

    expect(markup).toContain("With Creator Pro, the Bundle or a pass");
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
    expect(markup).not.toContain("/pricing?from=analytics");
  });

  it("ships no figures at all when the server locked the payload", () => {
    const markup = renderWorkspace(
      { canPublish: false, locked: true },
      <PortfolioAnalyticsWorkspace />,
    );

    // The lock is enforced server-side, so the numbers are absent from the payload
    // entirely rather than merely blurred by CSS.
    expect(markup).toContain("/pricing?from=analytics");
    expect(markup).not.toContain("1234");
    expect(markup).not.toContain("news.ycombinator.com");
    // And the hidden region is out of the accessibility tree.
    expect(markup).toContain("inert");
  });
});

/** One rule for paid features (P-010) and the site status card (P-014, P-033). */
type Overrides = {
  billing?: Record<string, unknown> & { canPublish: boolean; status: string };
  publication?: {
    subdomain: string;
    status: "LIVE" | "GRACE" | "SUSPENDED";
    offlineReason?: "moderation" | "owner" | "billing" | null;
  } | null;
};

function renderWith({ billing, publication }: Overrides, children: React.ReactNode) {
  const data = bootstrap({ canPublish: false, locked: true });
  const workspace = {
    ...data.workspace,
    ...(billing ? { billing } : {}),
    ...(publication !== undefined ? { publication } : {}),
  };

  return renderToStaticMarkup(
    <WorkspaceProvider initialData={{ ...data, workspace }}>
      <AnalyticsProvider analytics={data.analytics}>{children}</AnalyticsProvider>
    </WorkspaceProvider>,
  );
}

const passHolder = {
  canPublish: true,
  status: "INACTIVE",
  plan: "BUNDLE" as const,
  access: { tier: "pass" as const, isPaying: true },
};
const aiOnly = {
  canPublish: false,
  status: "ACTIVE",
  plan: "AI_CREDITS" as const,
  access: { tier: "ai_credits" as const, isPaying: true },
};

describe("paid portfolio features follow canPublish (P-010)", () => {
  it("unlocks pages, the badge toggle and SEO for a pass holder with no subscription", () => {
    const rail = renderWith(
      { billing: passHolder },
      <StructureRail
        selectedSectionId="profile"
        onSelect={() => {}}
        onClose={() => {}}
        onOpenTemplates={() => {}}
      />,
    );
    const canvas = renderWith(
      { billing: passHolder },
      <ContentCanvas selectedSectionId="profile" onClose={() => {}} />,
    );
    const settings = renderWith({ billing: passHolder }, <PortfolioSettingsWorkspace />);

    expect(rail).toContain('aria-label="Add page"');
    expect(canvas).not.toContain("/pricing?from=badge");
    expect(/<input[^>]*type="checkbox"[^>]*>/.exec(canvas)?.[0]).not.toMatch(/\sdisabled/);
    expect(settings).not.toContain("Premium Feature");
  });

  it("keeps an AI Credits subscriber on the free rules, with a way to unlock each control", () => {
    const rail = renderWith(
      { billing: aiOnly },
      <StructureRail
        selectedSectionId="profile"
        onSelect={() => {}}
        onClose={() => {}}
        onOpenTemplates={() => {}}
      />,
    );
    const canvas = renderWith(
      { billing: aiOnly },
      <ContentCanvas selectedSectionId="profile" onClose={() => {}} />,
    );
    const settings = renderWith({ billing: aiOnly }, <PortfolioSettingsWorkspace />);

    expect(rail).not.toContain('aria-label="Add page"');
    expect(rail).toContain("/pricing?from=pages");
    expect(/<input[^>]*type="checkbox"[^>]*>/.exec(canvas)?.[0]).toMatch(/\sdisabled/);
    expect(canvas).toContain("/pricing?from=badge");
    expect(settings).toContain("Premium Feature");
    expect(settings).toContain("/pricing?from=seo");
  });
});

describe("editor preview follows the live rules (P-059)", () => {
  const content = {
    ...completeContent,
    removeWatermark: true,
    pages: [{ id: "p1", slug: "about", title: "About", sections: [completeContent.sections[1]] }],
  };

  it("drops the badge only with paid access and the toggle on", () => {
    expect(showsBadge(content, true)).toBe(false);
    expect(showsBadge(content, false)).toBe(true);
    expect(showsBadge({ ...content, removeWatermark: false }, true)).toBe(true);
  });

  it("previews the selected sub-page's sections", () => {
    expect(previewProject(content, "p1").sections).toEqual([completeContent.sections[1]]);
    expect(previewProject(content, null).sections).toBe(content.sections);
  });
});
