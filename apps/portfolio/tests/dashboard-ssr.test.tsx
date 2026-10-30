import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_BACKEND_URL = "http://test-backend.local";

import { AnalyticsProvider, WorkspaceProvider } from "@/components/WorkspaceProvider";
import { PortfolioAnalyticsWorkspace } from "@/components/dashboard/analytics/PortfolioAnalyticsWorkspace";
import { PortfolioDashboardWorkspace } from "@/components/dashboard/overview/PortfolioDashboardWorkspace";
import { PortfolioSettingsWorkspace } from "@/components/dashboard/settings/PortfolioSettingsWorkspace";
import { createDefaultPortfolio, type PortfolioContent } from "@/lib/portfolio";
import { StructureRail } from "@/components/dashboard/editor/StructureRail";
import { ContentCanvas } from "@/components/dashboard/editor/ContentCanvas";
import { PortfolioEditorWorkspace } from "@/components/dashboard/editor/PortfolioEditorWorkspace";
import {
  isEditorMessage,
  previewProject,
  showsBadge,
  standaloneGuestContent,
} from "@/components/LivePortfolioPreview";
import { createPortfolioStore, PortfolioStoreProvider } from "@/store/portfolio-store";

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
        visibility="flex"
        selectedSectionId="profile"
        onSelect={() => {}}
        onClose={() => {}}
        onOpenTemplates={() => {}}
      />,
    );
    const canvas = renderWith(
      { billing: passHolder },
      <ContentCanvas visibility="block" selectedSectionId="profile" onClose={() => {}} />,
    );
    const settings = renderWith({ billing: passHolder }, <PortfolioSettingsWorkspace />);

    expect(rail).toContain('aria-label="Add page"');
    expect(canvas).not.toContain("/pricing?from=badge");
    expect(/<input[^>]*type="checkbox"[^>]*>/.exec(canvas)?.[0]).not.toMatch(/\sdisabled/);
    expect(settings).not.toContain("Premium Feature");
    expect(settings).toContain("Plan: Job Hunter pass");
  });

  it("keeps an AI Credits subscriber on the free rules, with a way to unlock each control", () => {
    const rail = renderWith(
      { billing: aiOnly },
      <StructureRail
        visibility="flex"
        selectedSectionId="profile"
        onSelect={() => {}}
        onClose={() => {}}
        onOpenTemplates={() => {}}
      />,
    );
    const canvas = renderWith(
      { billing: aiOnly },
      <ContentCanvas visibility="block" selectedSectionId="profile" onClose={() => {}} />,
    );
    const settings = renderWith({ billing: aiOnly }, <PortfolioSettingsWorkspace />);

    expect(rail).not.toContain('aria-label="Add page"');
    expect(rail).toContain("/pricing?from=pages");
    expect(/<input[^>]*type="checkbox"[^>]*>/.exec(canvas)?.[0]).toMatch(/\sdisabled/);
    expect(canvas).toContain("/pricing?from=badge");
    expect(settings).toContain("Premium Feature");
    expect(settings).toContain("/pricing?from=seo");
    // A paying customer is never labelled free.
    expect(settings).toContain("Plan: AI Credits");
  });
});

describe("a lapsed plan sent to a sub-page", () => {
  // The publish checklist can open a sub-page for an owner whose plan lapsed; the Pages list is
  // paid-only, so Home has to show without it or there is no way back.
  it("still shows Home", () => {
    const store = createPortfolioStore({
      ready: true,
      workspaceState: "ready",
      billing: aiOnly,
      content: {
        ...completeContent,
        pages: [{ id: "p1", slug: "work", title: "Work", sections: [] }],
      },
      selectedPageId: "p1",
    });
    const rail = renderToStaticMarkup(
      <PortfolioStoreProvider value={store}>
        <StructureRail
          visibility="flex"
          selectedSectionId="profile"
          onSelect={() => {}}
          onClose={() => {}}
          onOpenTemplates={() => {}}
        />
      </PortfolioStoreProvider>,
    );

    expect(rail).not.toContain('aria-label="Add page"');
    expect(rail).toContain(">Home</span>");
  });
});

describe("site status card (P-014, P-033)", () => {
  const site = { subdomain: "gautam" };

  it("says a site was never published and offers Publish", () => {
    const markup = renderWith({ publication: null }, <PortfolioDashboardWorkspace />);

    expect(markup).toContain("Not published yet");
    expect(markup).toContain(">Publish<");
    expect(markup).not.toContain("Private draft");
  });

  it("links a live site", () => {
    const markup = renderWith(
      { publication: { ...site, status: "LIVE", offlineReason: null } },
      <PortfolioSettingsWorkspace />,
    );

    expect(markup).toContain("Live");
    expect(markup).toContain('href="https://gautam.veriworkly.com"');
    expect(markup).not.toContain("Republish");
  });

  it("explains grace with its end date and a renew link", () => {
    const markup = renderWith(
      {
        publication: { ...site, status: "GRACE", offlineReason: null },
        billing: { canPublish: false, status: "PAST_DUE", graceEndsAt: "2026-11-06T00:00:00.000Z" },
      },
      <PortfolioDashboardWorkspace />,
    );

    expect(markup).toContain("Your site keeps its paid features until 2026-11-06");
    expect(markup).toContain("/billing");
  });

  it("offers Republish after the owner unpublished", () => {
    const markup = renderWith(
      { publication: { ...site, status: "SUSPENDED", offlineReason: "owner" } },
      <PortfolioDashboardWorkspace />,
    );

    expect(markup).toContain("Offline. You unpublished it.");
    expect(markup).toContain("Republish");
  });

  it("never offers Republish for a moderation takedown", () => {
    const markup = renderWith(
      { publication: { ...site, status: "SUSPENDED", offlineReason: "moderation" } },
      <PortfolioDashboardWorkspace />,
    );

    expect(markup).toContain("Taken down by a moderator. Contact support.");
    expect(markup).not.toContain("Republish");
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
  // S4: another same-origin tab or frame must not be able to drive the preview.
  it("takes content only from the editor that framed it", () => {
    const editor = {};
    const self = { location: { origin: "https://portfolio.test" }, parent: editor };
    const data = { type: "veriworkly:portfolio-preview", content };
    const message = { origin: "https://portfolio.test", source: editor, data };

    expect(isEditorMessage(message as never, self)).toBe(true);
    expect(isEditorMessage({ ...message, source: {} } as never, self)).toBe(false);
    expect(isEditorMessage({ ...message, origin: "https://evil.test" } as never, self)).toBe(false);
    expect(isEditorMessage({ ...message, data: { type: "other" } } as never, self)).toBe(false);
  });

  // The guest preview page is server-rendered with the default; opened on its own it shows the
  // guest's saved draft, while inside the editor's frame the editor posts the live content.
  it("shows a guest the draft saved in this browser when opened on its own", () => {
    const saved = { ...completeContent, identity: { ...completeContent.identity, bio: "guest" } };
    const items = new Map([
      ["veriworkly:portfolio:guest-draft:v5", JSON.stringify({ slug: "g", content: saved })],
    ]);
    const self: { parent: unknown; localStorage: unknown } = {
      parent: null,
      localStorage: { getItem: (key: string) => items.get(key) ?? null, removeItem() {} },
    };
    self.parent = self;
    vi.stubGlobal("window", self);
    try {
      expect(standaloneGuestContent(self)?.identity.bio).toBe("guest");
      expect(standaloneGuestContent({ parent: {} })).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("analytics tells the truth (P-044)", () => {
  function renderAnalytics(
    analytics: ReturnType<typeof bootstrap>["analytics"] | null,
    {
      unavailable = false,
      canPublish = true,
      asOf,
    }: { unavailable?: boolean; canPublish?: boolean; asOf?: string } = {},
    children: React.ReactNode = <PortfolioAnalyticsWorkspace />,
  ) {
    const data = bootstrap({ canPublish });
    return renderToStaticMarkup(
      <WorkspaceProvider initialData={data}>
        <AnalyticsProvider analytics={analytics} unavailable={unavailable} asOf={asOf}>
          {children}
        </AnalyticsProvider>
      </WorkspaceProvider>,
    );
  }

  it("says a failed request is an outage, not a paid feature, for a paying user", () => {
    const markup = renderAnalytics(null, { unavailable: true });
    expect(markup).toContain("Analytics are unavailable right now. Try again later.");
    expect(markup).not.toContain("/pricing?from=analytics");
    expect(markup).not.toContain("premium feature");

    const dashboard = renderAnalytics(null, { unavailable: true }, <PortfolioDashboardWorkspace />);
    expect(dashboard).toContain("Unavailable right now");
    expect(dashboard).not.toContain("With Creator Pro");
  });

  it("still shows the lock to a free user when the request failed", () => {
    const markup = renderAnalytics(null, { unavailable: true, canPublish: false });
    expect(markup).toContain("/pricing?from=analytics");
    expect(markup).not.toContain("unavailable right now");
  });

  it("counts only the last 30 calendar days", () => {
    const markup = renderAnalytics(
      {
        locked: false,
        totalViews: 50,
        daily: [
          { date: "2026-10-30T00:00:00.000Z", count: 3 },
          { date: "2026-10-01T00:00:00.000Z", count: 4 },
          { date: "2026-09-30T00:00:00.000Z", count: 40 },
        ],
        referrers: [],
      },
      { asOf: "2026-10-30" },
    );
    // Oct 1..Oct 30 is the window: 3 + 4, not the 47 of every day that had views.
    expect(markup).toMatch(/Last 30 days<\/p>[\s\S]*?>7<\/p>/);
    expect(markup).toContain("2 active days");
  });

  it("tells a live site with no views that it has no visits yet", () => {
    const markup = renderAnalytics(
      { locked: false, totalViews: 0, daily: [], referrers: [] },
      { asOf: "2026-10-30" },
    );
    expect(markup).toContain("No visits yet");
    expect(markup).not.toContain("Analytics start after publishing");
    expect(markup).toContain("Referring sites (top 10)");
  });
});

describe("editor layout and links (P-024, P-031)", () => {
  it("is a tabbed single column below lg, with the content tab open", () => {
    const markup = renderWith({}, <PortfolioEditorWorkspace />);

    expect(markup).toContain('role="tablist"');
    for (const tab of ["Structure", "Content", "Preview"])
      expect(markup).toContain(`>${tab}</button>`);
    expect(markup).toMatch(/id="editor-tab-content" role="tab" aria-selected="true"/);
    // Only the active tab shows on a phone; every panel shows from lg up.
    expect(markup).toMatch(/id="editor-panel-structure"[^>]*class="[^"]*\bhidden lg:flex\b/);
    expect(markup).toMatch(/id="editor-panel-content"[^>]*class="[^"]*\bblock lg:block\b/);
    expect(markup).toMatch(/id="editor-panel-preview"[^>]*class="[^"]*\bhidden lg:block\b/);
  });

  it("shows the save state on every width, announced politely", () => {
    const markup = renderWith({}, <PortfolioEditorWorkspace />);

    expect(markup).toMatch(/<p aria-live="polite"[^>]*>Saved<\/p>/);
  });

  it("links the live address, not the draft slug, and nothing when unpublished", () => {
    const live = renderWith(
      { publication: { subdomain: "gautam-live", status: "LIVE" } },
      <PortfolioEditorWorkspace />,
    );
    expect(live).toContain('href="https://gautam-live.veriworkly.com"');
    expect(live).not.toContain("https://gautam.veriworkly.com");

    const unpublished = renderWith({ publication: null }, <PortfolioEditorWorkspace />);
    expect(unpublished).not.toContain(".veriworkly.com");

    const dashboard = renderWith(
      { publication: { subdomain: "gautam-live", status: "LIVE" } },
      <PortfolioDashboardWorkspace />,
    );
    expect(dashboard).toContain('href="https://gautam-live.veriworkly.com"');
    expect(dashboard).not.toContain("https://gautam.veriworkly.com");
  });

  it("names the badge the way the live site shows it", () => {
    const canvas = renderWith(
      { billing: passHolder },
      <ContentCanvas visibility="block" selectedSectionId="profile" onClose={() => {}} />,
    );
    expect(canvas).toContain("Built with VeriWorkly");
    // No label inside a label: the toggle is one control with one name.
    expect(canvas).not.toMatch(/<label[^>]*>(?:(?!<\/label>)[\s\S])*<label/);
  });
});
