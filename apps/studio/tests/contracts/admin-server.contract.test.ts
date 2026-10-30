import { readFile } from "node:fs/promises";
import path from "node:path";

import { createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "" }),
  Geist_Mono: () => ({ variable: "" }),
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

// The confirmation dialog renders nothing until opened; this stand-in prints all its copy.
vi.mock("@/components/admin/AdminActionDialog", () => ({
  default: (props: {
    trigger: ReactNode;
    title: string;
    description?: ReactNode;
    children?: ReactNode;
    confirmLabel: string;
    minReasonLength?: number;
  }) =>
    createElement(
      "div",
      { "data-min-reason": props.minReasonLength },
      createElement("button", null, props.trigger),
      createElement("h2", null, props.title),
      createElement("p", null, props.description),
      props.children,
      createElement("span", null, props.confirmLabel),
    ),
}));

// `admin-server.ts` is a server module: the `server-only` guard and request cookies are stubbed so
// it runs in a plain node environment, and the session lookup is replaced so each test decides
// who is signed in without a backend.
vi.mock("server-only", () => ({}));

const session = vi.hoisted(() => ({
  user: { id: "admin-1", email: "admin@example.com" } as {
    id: string;
    email: string;
  } | null,
  /** Thrown by the session lookup instead of answering: an API outage. */
  error: null as Error | null,
  /** Whether the browser sent a session cookie. */
  cookie: true,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    toString: () => (session.cookie ? "veriworkly-auth.session_token=test-session" : ""),
    has: (name: string) => session.cookie && name === "veriworkly-auth.session_token",
  }),
  headers: async () => new Headers(),
}));

vi.mock("@/features/auth/services/current-user", () => ({
  fetchCurrentUser: async () => {
    if (session.error) throw session.error;
    return session.user;
  },
}));

const ORIGINAL_FETCH = globalThis.fetch;

type FetchCall = { url: string; init: RequestInit };

function mockFetch(handler: (url: URL, init: RequestInit) => { status: number; body: unknown }) {
  const calls: FetchCall[] = [];

  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    calls.push({ url: url.toString(), init });
    const { status, body } = handler(url, init);

    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;

  return calls;
}

function roadmapItem(index: number) {
  return {
    id: `feature-${index}`,
    title: `Feature ${index}`,
    description: "d",
    status: "todo",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL ||= "http://localhost:8080/api/v1";
  process.env.ADMIN_EMAIL = "admin@example.com";
  session.user = { id: "admin-1", email: "admin@example.com" };
  session.error = null;
  session.cookie = true;
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe("admin server contract", () => {
  it("S-042: a roadmap column reads one page of its own status and knows the total", async () => {
    const all = Array.from({ length: 45 }, (_, index) => roadmapItem(index));

    const calls = mockFetch((url) => {
      const limit = Number(url.searchParams.get("limit"));
      const offset = Number(url.searchParams.get("offset"));

      return {
        status: 200,
        body: {
          success: true,
          message: "ok",
          data: { items: all.slice(offset, offset + limit), total: all.length, limit, offset },
        },
      };
    });

    const { fetchAdminRoadmapColumn } = await import("@/features/admin/services/admin-server");
    const page = await fetchAdminRoadmapColumn("todo", 20);

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0].url);
    expect(url.searchParams.get("status")).toBe("todo");
    expect(url.searchParams.get("limit")).toBe("20");
    expect(url.searchParams.get("offset")).toBe("20");
    expect(page.items.map((item) => item.id)).toEqual(all.slice(20, 40).map((item) => item.id));
    expect(page.total).toBe(45);
  });

  it("S-049: a non-admin session 404s before any admin API request is made", async () => {
    session.user = { id: "user-1", email: "someone@example.com" };
    const calls = mockFetch(() => ({ status: 200, body: { success: true, data: {} } }));

    const { fetchAdminUsers } = await import("@/features/admin/services/admin-server");
    const error = (await fetchAdminUsers().catch((thrown: unknown) => thrown)) as {
      digest?: string;
    };

    expect(error?.digest).toMatch(/404/);
    expect(calls).toHaveLength(0);
  });

  it("S-049: requireAdminUser 404s when ADMIN_EMAIL is unset", async () => {
    delete process.env.ADMIN_EMAIL;

    const { requireAdminUser } = await import("@/features/admin/services/admin-server");
    const error = (await requireAdminUser().catch((thrown: unknown) => thrown)) as {
      digest?: string;
    };

    expect(error?.digest).toMatch(/404/);
  });

  it("S-050: document and portfolio pages read their own summaries, not the full overview", async () => {
    for (const page of ["app/admin/documents/page.tsx", "app/admin/portfolios/page.tsx"]) {
      const source = await readFile(path.join(`${__dirname}/../..`, page), "utf8");

      expect(source, page).not.toContain("fetchAdminOverview");
    }

    const calls = mockFetch(() => ({ status: 200, body: { success: true, data: {} } }));
    const { fetchAdminDocumentSummary, fetchAdminPortfolioSummary } =
      await import("@/features/admin/services/admin-server");

    await fetchAdminDocumentSummary();
    await fetchAdminPortfolioSummary();

    expect(calls.map((call) => new URL(call.url).pathname)).toEqual([
      "/api/v1/admin/documents/summary",
      "/api/v1/admin/portfolios/summary",
    ]);
  });

  it("S-187: an unreadable queue reports unknown counts, never zeros", async () => {
    mockFetch(() => ({ status: 500, body: { message: "boom" } }));

    const { fetchAdminActionQueue } = await import("@/features/admin/services/admin-server");
    const queue = await fetchAdminActionQueue();

    expect(Object.values(queue).every((count) => count === null)).toBe(true);
  });

  it("S-187: an overview section that failed reads as unavailable", async () => {
    const { adminSection } = await import("@/features/admin/types/admin-types");

    expect(adminSection({ error: true })).toBeNull();
    expect(adminSection({ total: 3 })).toEqual({ total: 3 });
  });
});

describe("admin chart trend", () => {
  it("S-144: a flat series has no trend", async () => {
    const { trendFromSeries } = await import("@/components/admin/charts/geometry");

    expect(trendFromSeries([5, 5, 5, 5, 5, 5, 5])).toBe(0);
    expect(trendFromSeries([5, 5, 5, 5, 5, 5])).toBe(0);
    expect(trendFromSeries([1, 1, 1, 9, 3, 3, 3])).toBe(200);
  });
});

describe("admin mutation contract", () => {
  it("S-077: a roadmap create body carries no null fields", async () => {
    const calls = mockFetch(() => ({ status: 201, body: { success: true, data: { id: "f" } } }));

    const { buildRoadmapPayload } = await import("@/app/admin/roadmap/components/roadmap-payload");
    const { createRoadmapFeature } = await import("@/features/roadmap/services/admin-roadmap");

    const empty = {
      title: " New ",
      description: " Desc ",
      status: "todo" as const,
      eta: "",
      completedQuarter: "",
      tags: "",
      fullDescription: "",
      whyItMatters: "",
      timeline: "",
      startedAt: "",
      completedAt: "",
      detailsJson: "",
    };

    await createRoadmapFeature(buildRoadmapPayload(empty, "create"), "Planned for Q4");

    const body = JSON.parse(String(calls[0].init.body)) as Record<string, unknown>;
    expect(Object.values(body)).not.toContain(null);
    expect(body).toEqual({
      title: "New",
      description: "Desc",
      status: "todo",
      tags: [],
      reason: "Planned for Q4",
    });

    // An edit still clears a field the operator emptied.
    expect(buildRoadmapPayload(empty, "edit").startedAt).toBeNull();
  });

  it("S-077: a rejected roadmap write shows the server's message", async () => {
    mockFetch(() => ({ status: 400, body: { message: "completedAt: Invalid datetime" } }));

    const { createRoadmapFeature } = await import("@/features/roadmap/services/admin-roadmap");

    await expect(
      createRoadmapFeature({ title: "t", description: "d", status: "todo" }, "Planned for Q4"),
    ).rejects.toThrow("completedAt: Invalid datetime");
  });

  it("S-186: a credit adjustment carries an idempotency key", async () => {
    const calls = mockFetch(() => ({ status: 200, body: { success: true, data: {} } }));

    const { adjustAdminCredits } = await import("@/features/admin/services/admin-actions");
    await adjustAdminCredits("user-1", 50, "goodwill", "attempt-1");

    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      userId: "user-1",
      amount: 50,
      reason: "goodwill",
      idempotencyKey: "attempt-1",
    });
  });

  it("S-186/S-090: optional reasons may be blank but never 1–2 characters", async () => {
    const { isAdminReasonValid } = await import("@/components/admin/admin-reason");

    expect(isAdminReasonValid("", { required: false, minLength: 3 })).toBe(true);
    expect(isAdminReasonValid("ok", { required: false, minLength: 3 })).toBe(false);
    expect(isAdminReasonValid("", { required: true, minLength: 3 })).toBe(false);
    expect(isAdminReasonValid("too short", { required: true, minLength: 10 })).toBe(false);
    expect(isAdminReasonValid("long enough", { required: true, minLength: 10 })).toBe(true);
  });

  it("S-090 S-358: suspending a portfolio asks for the server's 10-character minimum", async () => {
    const { default: PortfolioModerationActions } =
      await import("@/app/admin/portfolios/PortfolioModerationActions");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const statusDialogMinimum = (status: "LIVE" | "SUSPENDED") => {
      const html = renderToStaticMarkup(
        createElement(PortfolioModerationActions, {
          publicationId: "p1",
          subdomain: "jane",
          status,
          templateId: "signal",
          compact: true,
        }),
      );

      return html.match(/data-min-reason="(\d+)"/)?.[1];
    };

    // The status dialog opens on the status already picked, the current one before any change.
    expect(statusDialogMinimum("SUSPENDED")).toBe("10");
    expect(statusDialogMinimum("LIVE")).toBe("3");
  });

  it("S-186: suspension reasons are shown without the internal moderation prefix", async () => {
    const { formatSuspensionReason } = await import("@/features/admin/utils/admin-format");

    expect(formatSuspensionReason("moderation:Spam links")).toBe("Spam links");
    expect(formatSuspensionReason("payment lapsed")).toBe("payment lapsed");
    expect(formatSuspensionReason(null)).toBe("—");
  });

  it("S-189: the admin entitlement list matches the server's", async () => {
    const { ADMIN_ENTITLEMENT_KEYS } = await import("@/features/admin/services/admin-actions");
    const validator = await readFile(
      path.join(`${__dirname}/../..`, "../server/src/validators/admin/adminBillingValidator.ts"),
      "utf8",
    );
    const serverKeys = [
      ...(validator.match(/ENTITLEMENT_KEYS = \[([^\]]+)\]/)?.[1] ?? "").matchAll(/"([^"]+)"/g),
    ].map((match) => match[1]);

    expect(serverKeys.length).toBeGreaterThan(0);
    expect([...ADMIN_ENTITLEMENT_KEYS].sort()).toEqual([...serverKeys].sort());

    for (const file of [
      "app/admin/billing/BillingActions.tsx",
      "app/admin/billing/entitlements/page.tsx",
      "app/admin/users/[id]/UserAdminActions.tsx",
    ]) {
      const source = await readFile(path.join(`${__dirname}/../..`, file), "utf8");
      expect(source, file).not.toContain("custom_subdomain");
    }
  });

  it("S-188/S-249: restore and delete failures carry the server's own message", async () => {
    const { deleteAdminUser, restoreAdminDocument } =
      await import("@/features/admin/services/admin-actions");

    mockFetch(() => ({
      status: 410,
      body: {
        message: "This document was deleted and its content has since been permanently removed.",
      },
    }));
    await expect(restoreAdminDocument("doc-1", "owner asked")).rejects.toThrow(
      /permanently removed/,
    );

    mockFetch(() => ({
      status: 409,
      body: { message: "This account has a live subscription. Cancel it first." },
    }));
    await expect(deleteAdminUser("user-1", "a@b.c", "owner asked")).rejects.toThrow(
      /live subscription/,
    );
  });

  it("S-191: a GitHub sync start is accepted as running, and polling reports when it ends", async () => {
    const { fetchAdminGithubSyncRunning, triggerAdminGithubSync } =
      await import("@/features/admin/services/admin-actions");

    mockFetch((url) =>
      url.pathname.endsWith("/sync")
        ? {
            status: 202,
            body: {
              success: true,
              data: { status: "started", statusUrl: "/api/v1/admin/system/github" },
            },
          }
        : { status: 200, body: { success: true, data: { running: false, latestSync: null } } },
    );

    await expect(triggerAdminGithubSync("refresh", false)).resolves.toEqual({
      status: "started",
      statusUrl: "/api/v1/admin/system/github",
    });
    await expect(fetchAdminGithubSyncRunning()).resolves.toBe(false);
  });
});

describe("admin route boundaries", () => {
  async function adminFiles(name: string) {
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(path.join(`${__dirname}/../..`, "app/admin"), {
      recursive: true,
    });

    return entries
      .map((entry) => entry.split(path.sep).join("/"))
      .filter((entry) => entry === name || entry.endsWith(`/${name}`));
  }

  function routeOf(file: string) {
    const folder = path.posix.dirname(file);
    return folder === "." ? "/admin" : `/admin/${folder}`;
  }

  it("names every admin page in the route table, static siblings before [id]", async () => {
    const { resolveAdminRoute } = await import("@/features/admin/config/admin-routes");

    // A redirect-only page never renders, so it needs no surface or skeleton.
    const pages = (await adminFiles("page.tsx")).filter((page) => page !== "monetization/page.tsx");

    expect(pages.length).toBeGreaterThan(20);

    for (const page of pages) {
      const route = routeOf(page);
      const url = route.replaceAll("[id]", "abc123");

      expect(resolveAdminRoute(url).path, page).toBe(route);
    }

    expect(resolveAdminRoute("/admin/affiliates/commissions").surface).toBe(
      "the commissions queue",
    );
    expect(resolveAdminRoute("/admin/users/abc123").surface).toBe("this user");
    expect(resolveAdminRoute("/admin/nope/at/all").surface).toBe("this page");
  });

  it("has one admin error boundary and one shared loading UI", async () => {
    expect(await adminFiles("error.tsx")).toEqual(["error.tsx"]);

    const loaders = await adminFiles("loading.tsx");
    expect(loaders).toContain("loading.tsx");

    for (const loader of loaders.filter((file) => file !== "loading.tsx")) {
      const source = await readFile(path.join(`${__dirname}/../..`, "app/admin", loader), "utf8");
      expect(source.trim(), loader).toBe('export { default } from "../loading";');
    }
  });

  it("gives each list and detail page a skeleton with its own stat row and side form", async () => {
    const { resolveAdminRoute } = await import("@/features/admin/config/admin-routes");

    // A redirect-only page never renders, so it needs no skeleton.
    const pages = (await adminFiles("page.tsx")).filter((page) => page !== "monetization/page.tsx");
    let measured = 0;

    for (const page of pages) {
      const { skeleton, path: route } = resolveAdminRoute(routeOf(page).replaceAll("[id]", "x"));
      expect(route, page).toBe(routeOf(page));

      const source = await readFile(path.join(`${__dirname}/../..`, "app/admin", page), "utf8");
      const statRow = source.match(/<section className="grid gap-3[^"]*">([\s\S]*?)<\/section>/);
      const statCount = statRow?.[1].match(/<AdminStatCard\b/g)?.length ?? 0;

      if (skeleton.kind === "list" || skeleton.kind === "detail") {
        // A stat card outside the matched row means the pattern missed the row, not that the
        // page has none.
        expect(source.match(/<AdminStatCard\b/g)?.length ?? 0, page).toBe(statCount);
        expect(skeleton.stats ?? 0, page).toBe(statCount);
        measured += 1;
      }

      if (skeleton.kind === "list") {
        expect(Boolean(skeleton.aside), page).toBe(source.includes("aside={"));
      }
    }

    expect(measured).toBeGreaterThan(20);

    expect(resolveAdminRoute("/admin/roadmap").skeleton.kind).toBe("kanban");
  });
});

/** The text an admin control and its confirmation dialog show, dialog copy included. */
async function renderAdminText(element: ReactElement) {
  const { renderToStaticMarkup } = await import("react-dom/server");

  return renderToStaticMarkup(element)
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&quot;/g, "'")
    .replace(/\s+/g, " ");
}

const adminBillingServiceSource = () =>
  readFile(
    path.join(`${__dirname}/../..`, "../server/src/services/admin/adminBillingService.ts"),
    "utf8",
  );

async function serverUpdateSubscription() {
  const source = await adminBillingServiceSource();
  return source.slice(source.indexOf("export async function updateSubscription"));
}

describe("admin copy says what the server does", () => {
  it("S-274: cancel at period end is described as the Dodo cancellation it is", async () => {
    // If the server stops calling the provider here, this copy is wrong again.
    expect(await serverUpdateSubscription()).toMatch(
      /BillingService\.setProviderCancelAtPeriodEnd\(/,
    );

    const { SubscriptionActions } = await import("@/app/admin/billing/BillingActions");

    for (const cancelAtPeriodEnd of [false, true]) {
      const page = await renderAdminText(
        createElement(SubscriptionActions, {
          id: "sub_1",
          status: "ACTIVE",
          email: "jane@example.com",
          cancelAtPeriodEnd,
          deleted: false,
        }),
      );

      expect(page).not.toMatch(
        /local flag|Nothing changes at Dodo|does not cancel|next webhook overwrites/i,
      );
      expect(page).toMatch(/at Dodo/);
      expect(page).toMatch(cancelAtPeriodEnd ? /charged again at renewal/ : /not charged again/);
    }
  });

  it("S-295: a status override says it moves access and that Dodo must agree to end a subscription", async () => {
    const updateSubscription = await serverUpdateSubscription();

    expect(updateSubscription).toMatch(/syncSubscriptionGrants\(/);
    expect(updateSubscription).toMatch(/BillingService\.getProviderSubscriptionState\(/);

    const { SubscriptionActions } = await import("@/app/admin/billing/BillingActions");
    const page = await renderAdminText(
      createElement(SubscriptionActions, {
        id: "sub_1",
        status: "PAST_DUE",
        email: "jane@example.com",
        cancelAtPeriodEnd: false,
        deleted: false,
      }),
    );

    expect(page).not.toMatch(/nothing else|does not grant or revoke access|Change label/i);
    expect(page).toMatch(/Active grants the plan/);
    expect(page).toMatch(/refused unless Dodo/);
  });

  it("S-336 S-337: rows of a deleted account link nowhere and offer no actions", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { default: AdminUserLink } = await import("@/components/admin/AdminUserLink");
    const placeholder = {
      id: "deleted",
      name: null,
      email: "Deleted account",
      image: null,
      deleted: true as const,
    };

    for (const user of [placeholder, null]) {
      const html = renderToStaticMarkup(createElement(AdminUserLink, { user }));

      expect(html).toContain("Deleted account");
      expect(html).not.toContain("href");
    }

    const { SubscriptionActions, EntitlementRevokeAction } =
      await import("@/app/admin/billing/BillingActions");
    const subscription = await renderAdminText(
      createElement(SubscriptionActions, {
        id: "sub_1",
        status: "ACTIVE",
        email: "Deleted account",
        cancelAtPeriodEnd: false,
        deleted: true,
      }),
    );
    expect(subscription).not.toMatch(/Apply|Cancel at period end/);

    const grant = { id: "g1", entitlementKey: "portfolio_publish", revoked: false };
    expect(
      await renderAdminText(
        createElement(EntitlementRevokeAction, { ...grant, source: "MANUAL", expired: false }),
      ),
    ).toContain("Revoke this entitlement");
    for (const props of [
      { source: "SUBSCRIPTION", expired: false },
      { source: "MANUAL", expired: true },
      { source: "MANUAL", expired: false, deleted: true },
    ]) {
      expect(
        await renderAdminText(createElement(EntitlementRevokeAction, { ...grant, ...props })),
        JSON.stringify(props),
      ).not.toMatch(/Revoke this entitlement/);
    }

    for (const page of [
      "billing/page.tsx",
      "billing/credits/page.tsx",
      "billing/entitlements/page.tsx",
      "billing/webhooks/page.tsx",
      "affiliates/commissions/page.tsx",
      "affiliates/withdrawals/page.tsx",
    ]) {
      const source = await readFile(path.join(`${__dirname}/../..`, "app/admin", page), "utf8");
      expect(source, page).toContain("<AdminUserLink");
      expect(source, page).not.toMatch(
        /href=\{`\/admin\/(users|affiliates)\/\$\{row\.(user|affiliate)\.id\}`\}/,
      );
    }
  });

  it("S-294 S-252: moderation dialogs say a takedown locks the owner out and how to lift it", async () => {
    const { default: DocumentModerationActions } =
      await import("@/app/admin/documents/DocumentModerationActions");
    const { default: PortfolioModerationActions } =
      await import("@/app/admin/portfolios/PortfolioModerationActions");

    const publicDoc = await renderAdminText(
      createElement(DocumentModerationActions, {
        documentId: "d1",
        title: "CV",
        type: "RESUME",
        visibility: "PUBLIC",
        deleted: false,
      }),
    );
    expect(publicDoc).not.toMatch(/share links keep working/i);
    expect(publicDoc).toMatch(/share links stop working/i);
    expect(publicDoc).toMatch(/owner cannot/i);

    const privateDoc = await renderAdminText(
      createElement(DocumentModerationActions, {
        documentId: "d1",
        title: "CV",
        type: "RESUME",
        visibility: "PRIVATE",
        moderatorPrivate: true,
        deleted: false,
      }),
    );
    expect(privateDoc).toMatch(/Lift takedown/);

    // V-199: a document its owner kept private has no takedown to lift.
    const ownerPrivate = await renderAdminText(
      createElement(DocumentModerationActions, {
        documentId: "d1",
        title: "CV",
        type: "RESUME",
        visibility: "PRIVATE",
        moderatorPrivate: false,
        deleted: false,
      }),
    );
    expect(ownerPrivate).not.toMatch(/Lift takedown/);

    // Server V-203: only PRIVATE suspends a portfolio; UNLISTED on a moderation-locked one lifts
    // the lock (the site stays offline until the owner publishes), and changes nothing on a live one.
    const source = await readFile(
      path.join(`${__dirname}/../..`, "../server/src/services/admin/adminDocumentService.ts"),
      "utf8",
    );
    expect(source.replace(/\s+/g, " ")).toContain(
      'const lift = publication !== null && visibility !== "PRIVATE" && locked;',
    );

    for (const visibility of ["PUBLIC", "UNLISTED", "PRIVATE"] as const) {
      const page = await renderAdminText(
        createElement(DocumentModerationActions, {
          documentId: "d2",
          title: "Site",
          type: "PORTFOLIO",
          visibility,
          deleted: false,
        }),
      );
      // Not under a moderator's takedown: nothing to lift, and no promise it can be published.
      expect(page, visibility).not.toMatch(/Make unlisted|stays offline until|can publish/);
      if (visibility === "PUBLIC") expect(page, visibility).toMatch(/live site is not affected/);
    }

    const lockedPortfolio = await renderAdminText(
      createElement(DocumentModerationActions, {
        documentId: "d3",
        title: "Site",
        type: "PORTFOLIO",
        visibility: "PRIVATE",
        moderatorPrivate: true,
        deleted: false,
      }),
    );
    expect(lockedPortfolio).toMatch(/Lift takedown/);
    expect(lockedPortfolio).toMatch(/stays offline until the owner publishes it again/);

    const portfolio = await renderAdminText(
      createElement(PortfolioModerationActions, {
        publicationId: "p1",
        subdomain: "jane",
        status: "LIVE",
        templateId: "nimbus",
      }),
    );
    expect(portfolio).not.toMatch(/can publish again from their editor/);
    expect(portfolio).toMatch(/cannot publish it again until a moderator lifts the takedown/);
  });

  it("S-335: an enabled API key works at once", async () => {
    const { default: ApiKeyActions } = await import("@/app/admin/api-keys/ApiKeyActions");
    const page = await renderAdminText(
      createElement(ApiKeyActions, {
        id: "k1",
        name: "CI",
        keyPrefix: "vw_3fa9c",
        isActive: false,
        revoked: false,
      }),
    );

    expect(page).not.toMatch(/5½|few minutes/);
    expect(page).toMatch(/immediately/);
  });

  it("S-334: account deletion is blocked by the same chargeable-subscription rule as the server", async () => {
    const source = await readFile(
      path.join(`${__dirname}/../..`, "../server/src/services/userService.ts"),
      "utf8",
    );
    const serverRaw = [
      ...(source.match(/CHARGEABLE_RAW_STATUSES = \[([^\]]+)\]/)?.[1] ?? "").matchAll(/"([^"]+)"/g),
    ].map((match) => match[1]);
    expect(serverRaw.length).toBeGreaterThan(0);

    const { chargeableSubscription } = await import("@/app/admin/users/[id]/UserAdminActions");
    const hasChargeableSubscription = (...args: Parameters<typeof chargeableSubscription>) =>
      Boolean(chargeableSubscription(...args));
    const now = Date.parse("2026-10-26T12:00:00Z");
    const row = (overrides: Record<string, unknown>) => ({
      status: "CANCELED" as const,
      rawStatus: "cancelled" as string | null,
      createdAt: "2026-01-01T00:00:00Z",
      lastWebhookAt: null as string | null,
      ...overrides,
    });

    for (const rawStatus of serverRaw) {
      expect(hasChargeableSubscription([row({ rawStatus })], now), rawStatus).toBe(true);
    }
    expect(hasChargeableSubscription([row({ status: "ACTIVE", rawStatus: null })], now)).toBe(true);
    expect(
      hasChargeableSubscription(
        [row({ rawStatus: "pending", lastWebhookAt: "2026-10-26T08:00:00Z" })],
        now,
      ),
    ).toBe(true);
    expect(
      hasChargeableSubscription(
        [row({ rawStatus: "pending", lastWebhookAt: "2026-10-20T08:00:00Z" })],
        now,
      ),
    ).toBe(false);
    expect(hasChargeableSubscription([row({})], now)).toBe(false);
  });
});

describe("SV verification follow-ups", () => {
  it("SV S-336: a webhook with no account reads 'Deleted or unmatched account' and links nowhere", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { default: AdminUserLink } = await import("@/components/admin/AdminUserLink");
    const html = renderToStaticMarkup(
      createElement(AdminUserLink, { user: null, emptyLabel: "Deleted or unmatched account" }),
    );

    expect(html).toContain("Deleted or unmatched account");
    expect(html).not.toContain("href");

    const source = await readFile(
      path.join(`${__dirname}/../..`, "app/admin/billing/webhooks/page.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/row\.user \?/);
    expect(source).toContain('emptyLabel="Deleted or unmatched account"');
  });

  it("SV S-334: the disabled delete says why, from the chargeable subscription", async () => {
    const { default: UserAdminActions } = await import("@/app/admin/users/[id]/UserAdminActions");
    const end = "2026-12-01T00:00:00.000Z";
    const detail = (cancelAtPeriodEnd: boolean) =>
      ({
        user: {
          id: "u1",
          email: "jane@example.com",
          name: null,
          username: null,
          role: "USER",
          emailVerified: true,
          autoSyncEnabled: false,
          _count: { sessions: 1 },
        },
        subscriptions: [
          {
            id: "s1",
            productKey: "portfolio_pro",
            status: "ACTIVE",
            rawStatus: "active",
            cancelAtPeriodEnd,
            currentPeriodEnd: end,
            lastWebhookAt: null,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }) as never;

    const cancelled = await renderAdminText(
      createElement(UserAdminActions, { detail: detail(true), protectedAdmin: false }),
    );
    expect(cancelled).toMatch(/Renewal is already cancelled; delete is available after/);
    expect(cancelled).toContain("Dec 1, 2026");

    const renewing = await renderAdminText(
      createElement(UserAdminActions, { detail: detail(false), protectedAdmin: false }),
    );
    expect(renewing).toMatch(/Cancel it at Dodo first/);
    expect(renewing).toContain("Dec 1, 2026");
  });

  it("SV S-336: a commission whose referred account is gone says so", async () => {
    vi.resetModules();
    vi.doMock("@/features/admin/services/admin-server", () => ({
      fetchAdminCommissions: async () => ({
        items: [
          {
            id: "c1",
            amountCents: 500,
            currency: "USD",
            rateBps: 2000,
            status: "PENDING",
            reason: null,
            createdAt: "2026-10-01T00:00:00.000Z",
            affiliate: { id: "a1", name: "Ann", email: "ann@example.com", affiliateCode: "ANN" },
            referral: null,
          },
        ],
        total: 1,
        limit: 25,
        offset: 0,
        totalAmountCents: 500,
      }),
    }));

    try {
      const { default: Page } = await import("@/app/admin/affiliates/commissions/page");
      const tree = await Page({ searchParams: Promise.resolve({}) });
      const props = (
        tree as {
          props: Parameters<typeof import("@/components/admin/AdminListPage").default>[0];
        }
      ).props;
      const column = props.columns.find((item) => item.key === "referred");
      const { renderToStaticMarkup } = await import("react-dom/server");

      expect(renderToStaticMarkup(column!.render(props.page.items[0]) as never)).toContain(
        "Deleted account",
      );
    } finally {
      vi.doUnmock("@/features/admin/services/admin-server");
    }
  });

  it("SV: a credit adjustment sends its idempotency key in the header too", async () => {
    const calls = mockFetch(() => ({ status: 200, body: { data: {} } }));
    const { adjustAdminCredits } = await import("@/features/admin/services/admin-actions");

    await adjustAdminCredits("u1", 10, "goodwill", "key-9");

    expect(new Headers(calls[0].init.headers).get("Idempotency-Key")).toBe("key-9");
    expect(JSON.parse(calls[0].init.body as string).idempotencyKey).toBe("key-9");
  });
});

describe("admin dashboard page", () => {
  /** Every export of the "use client" modules a page imports: React serialises their props. */
  async function clientComponentsImportedBy(page: string) {
    const { existsSync } = await import("node:fs");
    const source = await readFile(path.join(`${__dirname}/../..`, page), "utf8");
    const refs = new Set<unknown>();

    for (const [, specifier] of source.matchAll(/from "(@\/[^"]+)"/g)) {
      const base = path.join(`${__dirname}/../..`, specifier.slice(2));
      const file = [".tsx", ".ts"].map((ext) => base + ext).find((item) => existsSync(item));
      if (!file || !(await readFile(file, "utf8")).trimStart().startsWith('"use client"')) continue;

      for (const value of Object.values(await import(/* @vite-ignore */ specifier))) {
        refs.add(value);
      }
    }

    return refs;
  }

  function containsFunction(value: unknown): boolean {
    if (typeof value === "function") return true;
    if (isValidElement(value) || value === null || typeof value !== "object") return false;
    return Object.values(value).some(containsFunction);
  }

  /** `Component.prop` for every function a server render hands to a client component. */
  function functionProps(node: unknown, clientRefs: Set<unknown>, found: string[]) {
    if (Array.isArray(node)) {
      for (const child of node) functionProps(child, clientRefs, found);
      return;
    }
    if (!isValidElement(node)) return;

    const name = typeof node.type === "string" ? node.type : (node.type as { name?: string }).name;

    for (const [key, value] of Object.entries(node.props as Record<string, unknown>)) {
      if (clientRefs.has(node.type) && containsFunction(value)) found.push(`${name}.${key}`);
      functionProps(value, clientRefs, found);
    }
  }

  it("S-293: hands its client charts only serialisable props", async () => {
    vi.resetModules();
    vi.doMock("@/features/admin/services/admin-server", () => ({
      fetchAdminOverview: async () => ({
        generatedAt: "2026-10-26T00:00:00Z",
        windowDays: 30,
        ...Object.fromEntries(
          [
            "users",
            "billing",
            "portfolios",
            "documents",
            "affiliates",
            "ambassadors",
            "apiKeys",
            "jobs",
            "health",
            "recentActivity",
          ].map((section) => [section, { error: true }]),
        ),
        actionQueue: {
          failedWebhooks: 0,
          pendingWithdrawals: 0,
          pendingAmbassadorApplications: 0,
          pendingCommissions: 0,
          suspendedPortfolios: 0,
          pendingPortfolioAssets: 0,
        },
      }),
      fetchAdminRecentActivity: async () => ({
        signups: [],
        publications: [],
        subscriptions: [],
        applications: [],
      }),
      fetchAdminTimeSeries: async () => ({
        buckets: ["2026-10-25", "2026-10-26"],
        series: new Proxy({}, { get: () => [1, 2] }),
      }),
    }));

    try {
      const { default: AdminPage } = await import("@/app/admin/page");
      const tree = await AdminPage({ searchParams: Promise.resolve({}) });
      const clientRefs = await clientComponentsImportedBy("app/admin/page.tsx");
      const found: string[] = [];

      expect(clientRefs.size).toBeGreaterThan(0);
      functionProps(tree, clientRefs, found);
      expect(found).toEqual([]);
    } finally {
      vi.doUnmock("@/features/admin/services/admin-server");
    }
  }, 60_000); // imports the whole admin page fresh, slow on a cold, loaded run
});

/** Every element in a server-rendered tree, nested props included, for finding one by its props. */
function findElements(node: unknown, match: (props: Record<string, unknown>) => boolean) {
  const found: Array<Record<string, unknown>> = [];

  const walk = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!isValidElement(value)) return;

    const props = value.props as Record<string, unknown>;
    if (match(props)) found.push(props);
    Object.values(props).forEach(walk);
  };

  walk(node);
  return found;
}

/** A page module imported fresh with \`admin-server\` replaced, so it renders canned data. */
async function withAdminServer<T>(
  mock: Record<string, unknown>,
  run: () => Promise<T>,
): Promise<T> {
  vi.resetModules();
  vi.doMock("@/features/admin/services/admin-server", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/features/admin/services/admin-server")>()),
    ...mock,
  }));

  try {
    return await run();
  } finally {
    vi.doUnmock("@/features/admin/services/admin-server");
  }
}

/** The server's access summary for one user (`describeAccessForUsers`): free unless overridden. */
function accessSummary(overrides: Record<string, unknown>) {
  return {
    tier: "free",
    isPaid: false,
    isPaying: false,
    paymentIssue: false,
    passEndsAt: null,
    portfolioAccessEndsAt: null,
    aiCreditsEndsAt: null,
    creditBalance: 0,
    paidCredits: 0,
    creditSources: {},
    ...overrides,
  };
}

function userDetail(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    user: {
      id: "u1",
      email: "jane@example.com",
      name: "Jane",
      username: null,
      image: null,
      role: "USER",
      emailVerified: true,
      ambassadorStatus: "NONE",
      affiliateStatus: "NOT_ENROLLED",
      affiliateTier: "TIER_1",
      affiliateCode: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      creditBalance: 0,
      subscription: null,
      portfolioPublication: null,
      autoSyncEnabled: false,
      affiliateEnrolledAt: null,
      lastGithubImportAt: null,
      lastLinkedinImportAt: null,
      _count: {
        resumes: 40,
        shareLinks: 0,
        apiKeys: 0,
        sessions: 12,
        affiliateReferrals: 0,
        portfolioAssets: 0,
      },
    },
    subscriptions: [],
    entitlements: [],
    credits: { wallet: null, transactions: [] },
    documents: [],
    publication: null,
    ambassadorApplication: null,
    affiliate: { wallet: null, withdrawals: [] },
    apiKeys: [],
    sessions: [],
    auditEntries: [],
    access: accessSummary({}),
    ...overrides,
  } as unknown as import("@/features/admin/types/admin-types").AdminUserDetail;
}

describe("Phase 9 Part E: admin console", () => {
  it("S-339 V-266: the users list shows the server's access summary; a pass holder or a credit buyer is never Free", async () => {
    const row = (id: string, access: Record<string, unknown> | null) => ({
      ...userDetail().user,
      id,
      email: `${id}@example.com`,
      access,
    });

    const cells = await withAdminServer(
      {
        fetchAdminUsers: async () => ({
          items: [
            row("pass", accessSummary({ tier: "pass", isPaying: true })),
            row("buyer", accessSummary({ tier: "credits", isPaying: true, paidCredits: 250 })),
            row("dunning", accessSummary({ tier: "portfolio_pro", paymentIssue: true })),
            row("free", accessSummary({})),
            row("unknown", null),
          ],
          total: 5,
          limit: 20,
          offset: 0,
        }),
      },
      async () => {
        const { default: Page } = await import("@/app/admin/users/page");
        const tree = await Page({ searchParams: Promise.resolve({}) });
        const props = (
          tree as {
            props: {
              columns: Array<{ key: string; render: (row: unknown) => ReactNode }>;
              page: { items: unknown[] };
            };
          }
        ).props;
        const column = props.columns.find((item) => item.key === "access")!;

        return Promise.all(
          props.page.items.map((item) => renderAdminText(column.render(item) as ReactElement)),
        );
      },
    );

    expect(cells[0]).toMatch(/Job Hunter pass/);
    expect(cells[1]).toMatch(/Credits customer/);
    expect(cells[2]).toMatch(/Creator Pro \(payment issue\)/);
    expect(cells[3]).toMatch(/Free/);
    expect(cells[4]).toMatch(/Unavailable/);
    for (const cell of cells.slice(0, 3)) expect(cell).not.toMatch(/Free/);
  });

  it("S-339 V-266: the user page shows the server's access summary, not one worked out from grants", async () => {
    const { existsSync } = await import("node:fs");
    expect(
      existsSync(path.join(`${__dirname}/../..`, "features/admin/utils/admin-access.ts")),
    ).toBe(false);

    const render = (detail: ReturnType<typeof userDetail>) =>
      withAdminServer({ fetchAdminUserDetail: async () => detail }, async () => {
        const { default: Page } = await import("@/app/admin/users/[id]/page");
        return renderAdminText(
          (await Page({ params: Promise.resolve({ id: "u1" }) })) as ReactElement,
        );
      });

    // No grant on the detail says so: the summary is the only source.
    const pass = await render(
      userDetail({
        access: accessSummary({
          tier: "pass",
          isPaying: true,
          passEndsAt: "2026-11-30T00:00:00Z",
          creditBalance: 120,
          paidCredits: 100,
        }),
      }),
    );
    expect(pass).toMatch(/Access Job Hunter pass/);
    expect(pass).toMatch(/Pass until Nov 30, 2026/);
    expect(pass).toMatch(/120 credits available, 100 of them paid for/);

    const buyer = await render(
      userDetail({
        access: accessSummary({
          tier: "credits",
          isPaying: true,
          creditBalance: 250,
          paidCredits: 250,
        }),
      }),
    );
    expect(buyer).toMatch(/Access Credits customer/);
    expect(buyer).not.toMatch(/Access Free/);

    const goodwill = await render(
      userDetail({
        access: accessSummary({ creditBalance: 50, creditSources: { admin_adjustment: 50 } }),
      }),
    );
    expect(goodwill).toMatch(/Access Free/);
    expect(goodwill).toMatch(/50 credits available, none paid for/);

    expect(await render(userDetail({ access: null }))).toMatch(/Access Unavailable/);
  });

  it("S-339 S-341 LOW: the user page shows access, record history links, counts and honest dates", async () => {
    const detail = userDetail({
      subscriptions: [
        {
          id: "sub_9",
          productKey: "portfolio_pro",
          status: "CANCELED",
          interval: "monthly",
          currentPeriodEnd: "2026-09-01T00:00:00.000Z",
          cancelAtPeriodEnd: false,
          provider: "dodo",
          rawStatus: "cancelled",
          lastWebhookAt: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-09-01T00:00:00.000Z",
        },
      ],
      documents: Array.from({ length: 25 }, (_, index) => ({
        id: `d${index}`,
        title: `Doc ${index}`,
        type: "RESUME",
        slug: `doc-${index}`,
        visibility: "PRIVATE",
        updatedAt: "2026-10-01T00:00:00.000Z",
        deletedAt: null,
      })),
      sessions: [
        {
          id: "sess1",
          ipAddress: "10.0.0.1",
          userAgent: "Chrome",
          createdAt: "2026-01-01T00:00:00.000Z",
          expiresAt: "2026-02-01T00:00:00.000Z",
        },
      ],
    });

    const html = await withAdminServer({ fetchAdminUserDetail: async () => detail }, async () => {
      const { default: Page } = await import("@/app/admin/users/[id]/page");
      const { renderToStaticMarkup } = await import("react-dom/server");
      return renderToStaticMarkup(
        (await Page({ params: Promise.resolve({ id: "u1" }) })) as ReactElement,
      ).replace(/&amp;/g, "&");
    });

    expect(html).toMatch(/>Access</);
    expect(html).toContain("/admin/audit?targetType=Subscription&targetId=sub_9");
    expect(html).toContain("/admin/audit?targetType=Document&targetId=d0");
    expect(html).toMatch(/ended Sep 1, 2026/);
    expect(html).not.toMatch(/renews Sep 1, 2026/);
    expect(html).toMatch(/Latest 25 of 40 documents/);
    expect(html).toMatch(/expired [^<]*ago/);
    expect(html).toMatch(/Latest 1 of 12 sessions/);
    // V-271: the server counts live documents only.
    expect(html).not.toMatch(/deleted ones included/);
  });

  it("S-340 V-267 V-271: the dashboard shows revenue per currency, USD commission with its series, and honest key counts", async () => {
    const money = (currency: string, netCents: number) => ({
      currency,
      payments: 1,
      grossCents: netCents,
      reversedCents: 0,
      netCents,
    });

    const tree = await withAdminServer(
      {
        fetchAdminOverview: async () => ({
          generatedAt: "2026-10-26T00:00:00Z",
          windowDays: 30,
          ...Object.fromEntries(
            [
              "users",
              "portfolios",
              "documents",
              "ambassadors",
              "jobs",
              "health",
              "recentActivity",
            ].map((section) => [section, { error: true }]),
          ),
          billing: {
            subscriptions: {
              byStatus: {},
              paying: 3,
              byProduct: {},
              newLast30Days: 0,
              cancelingAtPeriodEnd: 0,
            },
            credits: {
              balance: 0,
              reserved: 0,
              lifetimeCredited: 0,
              lifetimeDebited: 0,
              grantedLast30Days: 0,
              spentLast30Days: 0,
            },
            webhooks: { byStatus: {}, failed: 0 },
            activeEntitlements: 0,
            revenue: {
              last30Days: [money("EUR", 4_500), money("USD", 12_000)],
              allTime: [money("EUR", 9_000), money("INR", 150_000), money("USD", 50_000)],
            },
          },
          apiKeys: { total: 3, active: 1, revoked: 1, expired: 1, usedLast7Days: 2 },
          affiliates: {
            affiliatesByStatus: {},
            commissionsByStatus: {
              PENDING: { count: 1, amountCents: 100 },
              AVAILABLE: { count: 1, amountCents: 200 },
              PAID: { count: 1, amountCents: 300 },
              REVERSED: { count: 1, amountCents: 10_000 },
            },
            wallets: { pendingCents: 100, availableCents: 200, paidCents: 300 },
            pendingWithdrawals: { count: 0, amountCents: 0 },
            referralsByStatus: {},
            totalClicks: 0,
            commissionsAwaitingConversion: 2,
          },
          actionQueue: {
            failedWebhooks: 0,
            pendingWithdrawals: 0,
            pendingAmbassadorApplications: 0,
            pendingCommissions: 0,
            suspendedPortfolios: 0,
            pendingPortfolioAssets: 0,
          },
        }),
        fetchAdminRecentActivity: async () => ({
          signups: [],
          publications: [],
          subscriptions: [],
          applications: [],
        }),
        // The server's commission series is USD only, reversed rows left out (V-267).
        fetchAdminTimeSeries: async () => ({
          buckets: ["2026-10-25", "2026-10-26"],
          series: new Proxy({}, { get: () => [5_000, 7_000] }),
        }),
      },
      async () => {
        const { default: AdminPage } = await import("@/app/admin/page");
        return AdminPage({ searchParams: Promise.resolve({}) });
      },
    );

    const [revenue] = findElements(tree, (props) => props.label === "Revenue · last 30 days");
    const revenueText = await renderAdminText(
      createElement("div", null, revenue.value as ReactNode, revenue.hint as ReactNode),
    );
    expect(revenueText).toMatch(/€45\.00/);
    expect(revenueText).toMatch(/\$120\.00/);
    expect(revenueText).toMatch(/All time: €90\.00 · ₹1,500\.00 · \$500\.00/);

    const [commission] = findElements(
      tree,
      (props) => props.label === "Commission earned · USD, all time",
    );
    expect(commission.value).toBe("$6.00");
    expect(commission.hint).toMatch(/2 in other currencies/);
    expect(commission.trend).toEqual([5_000, 7_000]);

    const [keys] = findElements(tree, (props) => props.label === "Enabled API keys");
    expect(keys.value).toBe("1");
    expect(keys.hint).not.toMatch(/expired ones included/);
  }, 60_000);

  it("S-341: the audit log links targets, shows metadata and sends a whole-day UTC range", async () => {
    const { adminAuditTargetHref, formatAuditMetadata } =
      await import("@/components/admin/AdminAuditList");

    expect(
      adminAuditTargetHref({ action: "user.role.change", targetType: "User", targetId: "u/1" }),
    ).toBe("/admin/users/u%2F1");
    expect(
      adminAuditTargetHref({ action: "user.delete", targetType: "User", targetId: "u1" }),
    ).toBe(null);
    expect(
      adminAuditTargetHref({ action: "api_key.update", targetType: "ApiKey", targetId: "k1" }),
    ).toBe(null);
    // V-272: the server says whether the target is still there.
    expect(
      adminAuditTargetHref({
        action: "user.role.change",
        targetType: "User",
        targetId: "u1",
        targetExists: false,
      }),
    ).toBe(null);
    expect(
      adminAuditTargetHref({
        action: "user.role.change",
        targetType: "User",
        targetId: "u1",
        targetExists: true,
      }),
    ).toBe("/admin/users/u1");
    expect(formatAuditMetadata({ previousRole: "USER", nextRole: "AMBASSADOR" })).toBe(
      "previousRole: USER · nextRole: AMBASSADOR",
    );

    const sent: Array<Record<string, unknown>> = [];

    await withAdminServer(
      {
        fetchAdminAuditFilters: async () => ({ actions: [], targetTypes: [], actors: [] }),
        fetchAdminAuditEntries: async (params: Record<string, unknown>) => {
          sent.push(params);
          return { items: [], total: 0, limit: 20, offset: 0 };
        },
      },
      async () => {
        const { default: Page } = await import("@/app/admin/audit/page");
        const tree = await Page({
          searchParams: Promise.resolve({ from: "2026-10-01", to: "2026-10-02", action: "x" }),
        });
        const props = (tree as { props: Record<string, unknown> }).props;

        expect((props.dateFilters as Array<{ name: string }>).map((item) => item.name)).toEqual([
          "from",
          "to",
        ]);
        expect((props.columns as Array<{ key: string }>).map((item) => item.key)).toContain(
          "details",
        );
      },
    );

    expect(sent[0]).toMatchObject({
      action: "x",
      from: "2026-10-01T00:00:00.000Z",
      to: "2026-10-02T23:59:59.999Z",
    });
  });

  it("S-343: the overview and its series wait longer than the default 5 s server fetch", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const calls = mockFetch(() => ({ status: 200, body: { data: {} } }));
    const { fetchAdminOverview, fetchAdminTimeSeries, ADMIN_REPORT_TIMEOUT_MS } =
      await import("@/features/admin/services/admin-server");

    await fetchAdminOverview(30);
    await fetchAdminTimeSeries(30);

    expect(ADMIN_REPORT_TIMEOUT_MS).toBeGreaterThanOrEqual(40_000);
    const reportSignals = timeout.mock.results
      .filter((_, index) => timeout.mock.calls[index][0] === ADMIN_REPORT_TIMEOUT_MS)
      .map((result) => result.value);
    expect(calls.map((call) => call.init.signal)).toEqual(reportSignals);
    expect(reportSignals).toHaveLength(2);
  });

  it("S-140: an expired admin session goes to sign in again, not to a 404", async () => {
    session.user = null;
    const { requireAdminUser } = await import("@/features/admin/services/admin-server");
    const error = (await requireAdminUser().catch((thrown: unknown) => thrown)) as {
      digest?: string;
    };

    expect(error?.digest).toMatch(/NEXT_REDIRECT.*\/auth\/session-expired\?callbackURL=%2Fadmin/);

    session.cookie = false;
    const signedOut = (await requireAdminUser().catch((thrown: unknown) => thrown)) as {
      digest?: string;
    };
    expect(signedOut?.digest).toMatch(/404/);
  });

  it("S-140: an outage during the admin gate shows a generic outage panel, no error text", async () => {
    session.error = new Error("Auth service unavailable at 10.0.0.5");
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { default: AdminLayout } = await import("@/app/admin/layout");
    const { default: AdminOutage } = await import("@/components/admin/AdminOutage");
    const tree = (await AdminLayout({ children: null })) as ReactElement;

    expect(tree.type).toBe(AdminOutage);
    const html = await renderAdminText(tree);
    expect(html).toMatch(/This page could not load/);
    expect(html).not.toMatch(/10\.0\.0\.5|admin/i);

    // A non-admin still gets the 404, whatever else is going on.
    session.error = null;
    session.user = { id: "u2", email: "someone@example.com" };
    const error = (await AdminLayout({ children: null }).catch((thrown: unknown) => thrown)) as {
      digest?: string;
    };
    expect(error?.digest).toMatch(/404/);
  });

  it("S-344 V-269: an approved withdrawal can still be rejected; a released or paid commission can be reversed", async () => {
    const { WithdrawalActions, CommissionActions } =
      await import("@/app/admin/affiliates/AffiliateActions");

    const approved = await renderAdminText(
      createElement(WithdrawalActions, {
        id: "w1",
        status: "APPROVED",
        amountCents: 5000,
        currency: "USD",
        email: "ann@example.com",
      }),
    );
    expect(approved).toMatch(/Mark paid/);
    expect(approved).toMatch(/Reject this withdrawal/);
    expect(approved).toMatch(/\$50\.00 is returned to ann@example\.com's available balance/);

    const commission = (status: string) =>
      renderAdminText(
        createElement(CommissionActions, {
          id: "c1",
          status,
          amountCents: 500,
          currency: "USD",
          rateBps: 2000,
          referredUserId: "u9",
          providerPaymentId: "pay_1",
          subscriptionId: null,
          affiliateActive: true,
        }),
      );

    for (const status of ["AVAILABLE", "PAID"]) {
      const html = await commission(status);
      expect(html, status).toMatch(/Reverse this commission/);
      expect(html, status).toMatch(
        /\$5\.00 comes back out of the affiliate's available balance first; whatever it cannot cover is owed back/,
      );
      expect(html, status).not.toMatch(/cannot be reversed/);
      expect(html, status).not.toMatch(/Release commission/);
    }

    expect(await commission("REVERSED")).toMatch(/No action/);
  });

  it("S-256 V-270: a pending non-USD commission offers Convert, at the original's rate, only for an active affiliate", async () => {
    // The browser suite drives the dialog's confirm (admin-console.test.ts, S-256).
    const { CommissionActions, commissionConversion } =
      await import("@/app/admin/affiliates/AffiliateActions");
    const row = {
      id: "c1",
      status: "PENDING",
      amountCents: 900,
      currency: "EUR",
      rateBps: 2000,
      referredUserId: "u9",
      providerPaymentId: "pay_1",
      subscriptionId: "sub_1",
    };

    const active = await renderAdminText(
      createElement(CommissionActions, { ...row, affiliateActive: true }),
    );
    expect(active).toMatch(/Convert to USD/);
    expect(active).toMatch(/uses the same 20\.0% rate as the original/);
    expect(active).not.toMatch(/current tier rate/);
    expect(active).not.toMatch(/Release commission/);

    const inactive = await renderAdminText(
      createElement(CommissionActions, { ...row, affiliateActive: false }),
    );
    expect(inactive).not.toMatch(/Convert to USD/);
    expect(inactive).toMatch(/affiliate is not active/);

    expect(
      commissionConversion({
        commissionId: "c1",
        referredUserId: "u9",
        providerPaymentId: null,
        subscriptionId: null,
        purchaseUsd: "12.555",
        reference: "",
      }).ok,
    ).toBe(false);
  });

  it("S-256 V-272: the commissions page reads each row's affiliate status, with no lookups", async () => {
    const eurRow = (id: string, affiliateId: string, affiliateStatus: string) => ({
      id,
      amountCents: 900,
      currency: "EUR",
      rateBps: 2000,
      status: "PENDING",
      reason: null,
      providerPaymentId: null,
      subscriptionId: null,
      createdAt: "2026-10-01T00:00:00.000Z",
      affiliateStatus,
      affiliate: {
        id: affiliateId,
        name: null,
        email: `${affiliateId}@x.com`,
        affiliateCode: null,
      },
      referral: { id: "r", referredUser: { id: "u9", email: "u9@x.com" } },
    });
    const lookups: unknown[] = [];

    const html = await withAdminServer(
      {
        fetchAdminCommissions: async () => ({
          items: [eurRow("c1", "a-active", "ACTIVE"), eurRow("c2", "a-suspended", "SUSPENDED")],
          total: 2,
          limit: 20,
          offset: 0,
          totalAmountCents: 0,
        }),
        fetchAdminAffiliates: async (params: unknown) => {
          lookups.push(params);
          return { items: [], total: 0, limit: 20, offset: 0 };
        },
      },
      async () => {
        const { default: Page } = await import("@/app/admin/affiliates/commissions/page");
        const tree = await Page({ searchParams: Promise.resolve({}) });
        const props = (
          tree as {
            props: {
              columns: Array<{ key: string; render: (row: unknown) => ReactNode }>;
              page: { items: unknown[] };
            };
          }
        ).props;
        const actions = props.columns.find((column) => column.key === "actions")!;

        return Promise.all(
          props.page.items.map((item) => renderAdminText(actions.render(item) as ReactElement)),
        );
      },
    );

    expect(lookups).toEqual([]);
    expect(html[0]).toMatch(/Convert to USD/);
    expect(html[1]).toMatch(/affiliate is not active/);
  });

  it("V-272: an affiliate's 'See all' and 'Manage' links filter the lists by exact id", async () => {
    const source = await readFile(
      path.join(`${__dirname}/../..`, "app/admin/affiliates/[id]/page.tsx"),
      "utf8",
    );
    const links = [...source.matchAll(/href=\{`(\/admin\/affiliates\/[a-z]+\?[^`]+)`\}/g)].map(
      ([, href]) => href,
    );

    expect(links.length).toBeGreaterThan(0);
    for (const href of links)
      expect(href).toMatch(/\?affiliateId=\$\{encodeURIComponent\(affiliate\.id\)\}$/);

    // The list pages hand every URL param to the server, which filters on `affiliateId`.
    const calls = mockFetch(() => ({ status: 200, body: { data: { items: [] } } }));
    const admin = await import("@/features/admin/services/admin-server");
    await admin.fetchAdminCommissions({ affiliateId: "a1" });
    await admin.fetchAdminWithdrawals({ affiliateId: "a1" });
    await admin.fetchAdminReferrals({ affiliateId: "a1" });
    expect(calls.map((call) => new URL(call.url).searchParams.get("affiliateId"))).toEqual([
      "a1",
      "a1",
      "a1",
    ]);
  });

  it("brief: every admin list asks the server for 20 rows, whatever the URL says", async () => {
    const calls = mockFetch(() => ({ status: 200, body: { data: { items: [] } } }));
    const admin = await import("@/features/admin/services/admin-server");

    await admin.fetchAdminUsers({ limit: "100", offset: "40" });
    await admin.fetchAdminAuditEntries({});
    await admin.fetchAdminWebhooks({ status: "FAILED" });

    for (const call of calls) {
      expect(new URL(call.url).searchParams.get("limit"), call.url).toBe("20");
    }
    expect(new URL(calls[0].url).searchParams.get("offset")).toBe("40");
  });

  it("LOW: record ids are encoded into request paths", async () => {
    const calls = mockFetch(() => ({ status: 200, body: { data: {} } }));
    const { fetchAdminUserDetail } = await import("@/features/admin/services/admin-server");
    const { updateAdminUser, revokeAdminEntitlement } =
      await import("@/features/admin/services/admin-actions");

    await fetchAdminUserDetail("a/b?c");
    await updateAdminUser("a/b", { reason: "fix" });
    await revokeAdminEntitlement("g#1", "fix");

    expect(new URL(calls[0].url).pathname).toBe("/api/v1/admin/users/a%2Fb%3Fc");
    expect(new URL(calls[1].url).pathname).toBe("/api/v1/admin/users/a%2Fb");
    expect(new URL(calls[2].url).pathname).toBe("/api/v1/admin/billing/entitlements/g%231");
  });

  it("LOW: paging past the end says so and goes back to the last page", async () => {
    const { default: AdminPagination } = await import("@/components/admin/AdminPagination");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const html = renderToStaticMarkup(
      createElement(AdminPagination, {
        total: 50,
        limit: 20,
        offset: 60,
        basePath: "/admin/users",
      }),
    );

    expect(html).not.toMatch(/61/);
    expect(html).toMatch(/Past the last page/);
    expect(html).toContain('href="/admin/users?offset=40"');
  });

  it("LOW: an admin table has a real caption and names its action column", async () => {
    const { default: AdminTable } = await import("@/components/admin/AdminTable");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const html = renderToStaticMarkup(
      createElement(AdminTable<{ id: string }>, {
        columns: [
          { key: "id", header: "Id", render: (row) => row.id },
          { key: "actions", header: "", render: () => "x" },
        ],
        rows: [{ id: "r1" }],
        rowKey: (row) => row.id,
        caption: "3 rows",
      }),
    );

    expect(html).toMatch(/<caption[^>]*>3 rows<\/caption>/);
    expect(html).toMatch(/<th[^>]*><span class="sr-only">Actions<\/span><\/th>/);
  });

  it("LOW: chart axes never repeat a label", async () => {
    const { gridSteps, niceMax } = await import("@/components/admin/charts/geometry");

    for (const peak of [1, 2, 3, 7, 10, 18, 45, 99, 250, 1_000]) {
      const max = niceMax(peak);
      const steps = gridSteps(max);
      const ticks = Array.from({ length: steps + 1 }, (_, step) => (max / steps) * step);

      expect(ticks.every(Number.isInteger), String(max)).toBe(true);
      expect(new Set(ticks).size, String(max)).toBe(ticks.length);
    }
  });

  it("LOW: the trend chart's daily values are readable without hovering", async () => {
    const { default: TrendChart } = await import("@/components/admin/charts/TrendChart");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const html = renderToStaticMarkup(
      createElement(TrendChart, {
        buckets: ["2026-10-25", "2026-10-26"],
        datasets: [{ label: "Signups", values: [3, 4], series: 1 }],
      }),
    );

    expect(html).toMatch(/<table class="sr-only">/);
    expect(html).toMatch(/<th scope="row">Oct 26<\/th><td>4<\/td>/);
  });

  it("LOW: a roadmap item's dates are editable only where the server keeps them", async () => {
    const { default: RoadmapFeatureForm, roadmapDateFields } =
      await import("@/app/admin/roadmap/components/RoadmapFeatureForm");

    expect(roadmapDateFields("todo")).toEqual({
      startedAt: false,
      completedAt: false,
      completedQuarter: false,
    });
    expect(roadmapDateFields("in-progress").completedAt).toBe(false);
    expect(roadmapDateFields("done")).toEqual({
      startedAt: true,
      completedAt: true,
      completedQuarter: true,
    });

    const { renderToStaticMarkup } = await import("react-dom/server");
    const html = renderToStaticMarkup(
      createElement(RoadmapFeatureForm, {
        mode: "edit",
        feature: {
          id: "f1",
          title: "T",
          description: "D",
          status: "todo",
          startedAt: "2026-01-01T00:00:00.000Z",
          completedAt: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        } as never,
      }),
    );

    expect(html).toMatch(/<input[^>]*id="startedAt"[^>]*disabled=""[^>]*value=""/);
    expect(html).not.toMatch(/#0f172a|py-\.5|text-muted-foreground/);
  });

  it("LOW: a roadmap item's breadcrumb neither links to a missing page nor spells out its UUID", async () => {
    const { buildAdminBreadcrumbs } = await import("@/features/admin/config/admin-nav");
    const crumbs = buildAdminBreadcrumbs(
      "/admin/roadmap/3f2504e0-4f89-41d3-9a0c-0305e82c3301/edit",
    );

    expect(crumbs.map((crumb) => [crumb.label, crumb.href])).toEqual([
      ["Admin", "/admin"],
      ["Roadmap", "/admin/roadmap"],
      ["Detail", null],
      ["Edit", "/admin/roadmap/3f2504e0-4f89-41d3-9a0c-0305e82c3301/edit"],
    ]);
  });

  it("LOW: a control's staged value follows the server after a refresh", async () => {
    const { resolveServerDraft } = await import("@/features/admin/utils/use-server-draft");

    // Staged CANCELED from ACTIVE; the refresh brings PAST_DUE: the control shows the server.
    expect(resolveServerDraft({ base: "ACTIVE", value: "CANCELED" }, "PAST_DUE")).toBe("PAST_DUE");
    expect(resolveServerDraft({ base: "ACTIVE", value: "CANCELED" }, "ACTIVE")).toBe("CANCELED");
  });

  it("LOW: Grace is offered only for a premium portfolio template", async () => {
    const { default: PortfolioModerationActions } =
      await import("@/app/admin/portfolios/PortfolioModerationActions");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const render = (templateId: string) =>
      renderToStaticMarkup(
        createElement(PortfolioModerationActions, {
          publicationId: "p1",
          subdomain: "jane",
          status: "LIVE",
          templateId,
          compact: true,
        }),
      );

    expect(render("signal")).not.toMatch(/value="GRACE"/);
    expect(render("atelier")).not.toMatch(/value="GRACE"/);
    expect(render("nimbus")).toMatch(/value="GRACE"/);
  });

  it("LOW: the role select offers no Admin role, and the admin account's role is locked", async () => {
    const { default: UserAdminActions } = await import("@/app/admin/users/[id]/UserAdminActions");
    const { renderToStaticMarkup } = await import("react-dom/server");

    const user = renderToStaticMarkup(
      createElement(UserAdminActions, { detail: userDetail(), protectedAdmin: false }),
    );
    expect(user).not.toMatch(/value="ADMIN"/);
    expect(user).not.toMatch(/active session/);
    expect(user).toMatch(/expired ones included/);

    const admin = renderToStaticMarkup(
      createElement(UserAdminActions, { detail: userDetail(), protectedAdmin: true }),
    );
    expect(admin).toMatch(/<select[^>]*id="admin-user-role"[^>]*disabled=""/);
  });

  it("LOW: an entitlement ends at the end of the chosen local day, never in the past", async () => {
    const { parseEntitlementEnd } = await import("@/app/admin/billing/entitlement-end");
    const now = new Date(2026, 9, 27, 12).getTime();

    expect(parseEntitlementEnd("", now)).toEqual({ ok: true, endsAt: null });
    expect(parseEntitlementEnd("2026-10-26", now).ok).toBe(false);
    expect(parseEntitlementEnd("2026-10-27", now)).toEqual({
      ok: true,
      endsAt: new Date(2026, 9, 27, 23, 59, 59, 999).toISOString(),
    });
    expect(parseEntitlementEnd("not-a-day", now).ok).toBe(false);
  });

  it("LOW: a stored webhook payload can be read", async () => {
    const html = await withAdminServer(
      {
        fetchAdminWebhookDetail: async () => ({
          id: "e1",
          providerEventId: "evt_1",
          type: "subscription.active",
          status: "FAILED",
          error: "boom",
          retryCount: 2,
          lastAttemptAt: null,
          processedAt: null,
          createdAt: "2026-10-01T00:00:00.000Z",
          user: null,
          payload: { data: { subscription_id: "sub_77" } },
        }),
      },
      async () => {
        const { default: Page } = await import("@/app/admin/billing/webhooks/[id]/page");
        const { renderToStaticMarkup } = await import("react-dom/server");
        return renderToStaticMarkup(
          (await Page({ params: Promise.resolve({ id: "e1" }) })) as ReactElement,
        );
      },
    );

    expect(html).toContain("sub_77");
    expect(html).toContain("Deleted or unmatched account");
  });

  it("LOW: the affiliate page says how many of each list it shows", async () => {
    const referrals = Array.from({ length: 30 }, (_, index) => ({
      id: `r${index}`,
      status: "SIGNED_UP",
      createdAt: "2026-10-01T00:00:00.000Z",
      referredUser: { id: `u${index}`, email: `u${index}@example.com` },
    }));

    const html = await withAdminServer(
      {
        fetchAdminAffiliateDetail: async () => ({
          affiliate: {
            id: "a1",
            name: "Ann",
            email: "ann@example.com",
            image: null,
            affiliateCode: "ANN",
            affiliateStatus: "ACTIVE",
            affiliateTier: "TIER_1",
            affiliateEnrolledAt: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            affiliateWallet: null,
            _count: { affiliateReferrals: 30, affiliateClicks: 0 },
          },
          referrals,
          commissions: [],
          withdrawals: [],
          topReferrerHosts: [],
        }),
      },
      async () => {
        const { default: Page } = await import("@/app/admin/affiliates/[id]/page");
        const { renderToStaticMarkup } = await import("react-dom/server");
        return renderToStaticMarkup(
          (await Page({ params: Promise.resolve({ id: "a1" }) })) as ReactElement,
        );
      },
    );

    expect(html).toMatch(/20 of 30 referrals shown/);
  });

  it("LOW: the API keys page does not call expired keys active", async () => {
    const tree = await withAdminServer(
      {
        fetchAdminApiKeySummary: async () => ({
          total: 3,
          active: 2,
          revoked: 0,
          expired: 1,
          usedLast7Days: 0,
        }),
        fetchAdminApiKeys: async () => ({ items: [], total: 0, limit: 20, offset: 0 }),
      },
      async () => {
        const { default: Page } = await import("@/app/admin/api-keys/page");
        return Page({ searchParams: Promise.resolve({}) });
      },
    );

    const labels = findElements(tree, (props) => typeof props.label === "string").map(
      (props) => props.label,
    );
    expect(labels).not.toContain("Active");
    expect(labels).toContain("Enabled");
    // V-271: the server's count leaves expired keys out.
    const [enabled] = findElements(tree, (props) => props.label === "Enabled");
    expect(enabled.hint).not.toMatch(/expired ones included/);
  });
});

describe("Phase 9 Part E review fixes", () => {
  it("S-140: signing in again after an expired admin session returns to the admin", async () => {
    mockFetch(() => ({ status: 401, body: { message: "Session expired" } }));
    const { NextRequest } = await import("next/server");
    const { GET } = await import("@/app/auth/session-expired/route");

    const response = await GET(
      new NextRequest("http://localhost:4311/auth/session-expired?callbackURL=%2Fadmin", {
        headers: { cookie: "veriworkly-auth.session_token=dead" },
      }),
    );
    const location = new URL(response.headers.get("location")!);

    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("session")).toBe("expired");
    expect(location.searchParams.get("callbackURL")).toBe("/admin");

    const offsite = await GET(
      new NextRequest(
        "http://localhost:4311/auth/session-expired?callbackURL=https%3A%2F%2Fevil.com",
        { headers: { cookie: "veriworkly-auth.session_token=dead" } },
      ),
    );
    expect(new URL(offsite.headers.get("location")!).searchParams.has("callbackURL")).toBe(false);
  });

  it("audit links: a deleted account, portfolio or roadmap item shows a 'no longer exists' page with its history", async () => {
    mockFetch(() => ({ status: 404, body: { message: "Not found" } }));
    const { renderToStaticMarkup } = await import("react-dom/server");
    const render = async (element: unknown) =>
      renderToStaticMarkup((await element) as ReactElement).replace(/&amp;/g, "&");

    const { default: UserPage } = await import("@/app/admin/users/[id]/page");
    const { default: PortfolioPage } = await import("@/app/admin/portfolios/[id]/page");
    const { default: RoadmapEditPage } = await import("@/app/admin/roadmap/[id]/edit/page");

    const pages = [
      [await render(UserPage({ params: Promise.resolve({ id: "u-gone" }) })), "User", "u-gone"],
      [
        await render(PortfolioPage({ params: Promise.resolve({ id: "p-gone" }) })),
        "PortfolioPublication",
        "p-gone",
      ],
      [
        await render(RoadmapEditPage({ params: Promise.resolve({ id: "f-gone" }) })),
        "RoadmapFeature",
        "f-gone",
      ],
    ] as const;

    for (const [html, targetType, id] of pages) {
      expect(html, targetType).toContain("This record no longer exists");
      expect(html, targetType).toContain(`/admin/audit?targetType=${targetType}&targetId=${id}`);
    }
  });

  it("LOW: an offset past an empty result goes back to page 1, with no 'page 3 of 1'", async () => {
    const { default: AdminPagination } = await import("@/components/admin/AdminPagination");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const html = renderToStaticMarkup(
      createElement(AdminPagination, { total: 0, limit: 20, offset: 40, basePath: "/admin/users" }),
    );

    expect(html).not.toMatch(/page \d+ of/);
    expect(html).toMatch(/Past the last page/);
    expect(html).toContain('href="/admin/users"');
  });

  it("the admin shell test harness does not exist in a production build", async () => {
    const { default: Harness } = await import("@/app/parity/admin-shell/page");

    vi.stubEnv("NODE_ENV", "production");
    const error = (() => {
      try {
        Harness();
        return null;
      } catch (thrown) {
        return thrown as { digest?: string };
      }
    })();
    expect(error?.digest).toMatch(/404/);

    vi.stubEnv("NODE_ENV", "development");
    expect(isValidElement(Harness())).toBe(true);
  });
});

describe("affiliate and ambassador copy says what the server does", () => {
  const dashboard = (currentConversions: number, nextTierConversions: number | null) =>
    ({
      affiliateStatus: "ACTIVE",
      affiliateTier: "TIER_1",
      affiliateCode: "ANN",
      clicks: 0,
      conversions: currentConversions,
      wallet: { pendingCents: 0, availableCents: 0, paidCents: 0 },
      minimumWithdrawalCents: 5000,
      tierProgress: { currentConversions, nextTierConversions },
      tiers: [
        { key: "TIER_1", name: "Starter", rateBps: 2000, requiredConversions: 0, perks: [] },
        { key: "TIER_2", name: "Pro", rateBps: 2500, requiredConversions: 10, perks: [] },
      ],
      totalReferrals: 0,
      referrals: [],
      commissions: [],
      withdrawals: [],
    }) as unknown as import("@/features/affiliate/types").AffiliateDashboard;

  it("S-255: promotion is automatic at the tier's paid-conversion count, refunds excluded", async () => {
    const commissions = await readFile(
      path.join(`${__dirname}/../..`, "../server/src/services/affiliate/commissions.ts"),
      "utf8",
    );
    // The server promotes in the conversion's own transaction, counting clean conversions only.
    expect(commissions).toMatch(/const promotion = await promoteForConversions\(tx/);
    expect(commissions).toMatch(/where: cleanConversionsWhere\(affiliateId\)/);

    const { AffiliatePage } = await import("@/features/affiliate/AffiliatePage");
    const overview = await renderAdminText(
      createElement(AffiliatePage, { dashboard: dashboard(3, 10) }),
    );
    expect(overview).toMatch(
      /3 of 10 paid conversions toward the next tier\. You move up automatically at 10 paid conversions; refunded purchases don't count\./,
    );
    expect(overview).not.toMatch(/not automatic|reviewed by our team/i);

    vi.resetModules();
    vi.doMock("@/features/billing/billing-server", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/features/billing/billing-server")>()),
      getProgramServerData: async () => dashboard(3, 10),
    }));
    try {
      const { default: TiersPage } = await import("@/app/(main)/(dashboard)/affiliate/tiers/page");
      const tiers = await renderAdminText((await TiersPage()) as ReactElement);

      expect(tiers).toMatch(/You move up automatically at 10 paid conversions/);
      expect(tiers).toMatch(/refunded purchases don't count/);
      expect(tiers).not.toMatch(/not automatic|by hand|Reviewed for promotion/i);
    } finally {
      vi.doUnmock("@/features/billing/billing-server");
    }
  });

  it("S-258: the ambassador review dialogs say the applicant is emailed the decision with the note", async () => {
    const service = await readFile(
      path.join(`${__dirname}/../..`, "../server/src/services/ambassadorService.ts"),
      "utf8",
    );
    expect(service).toMatch(/sendAmbassadorDecisionEmail\(email, \{[\s\S]*reviewNote:/);

    const { default: AmbassadorReviewActions } =
      await import("@/app/admin/ambassadors/AmbassadorReviewActions");
    const html = await renderAdminText(
      createElement(AmbassadorReviewActions, {
        applicationId: "a1",
        status: "PENDING",
        applicantEmail: "ann@example.com",
      }),
    );

    expect(html).not.toMatch(/No email is sent/);
    expect(
      html.match(
        /ann@example\.com is emailed the decision, with your note, and also sees it on their ambassador page/g,
      ),
    ).toHaveLength(2);
  });
});

describe("admin money forms say what they do", () => {
  const source = (file: string) => readFile(path.join(`${__dirname}/../..`, file), "utf8");

  it("SV-22 a credit adjustment sends what the credits are and the customer's note", async () => {
    const calls = mockFetch(() => ({ status: 200, body: { data: {} } }));
    const { adjustAdminCredits } = await import("@/features/admin/services/admin-actions");

    await adjustAdminCredits("u1", 1000, "lost pack webhook", "key-1", {
      kind: "pack",
      customerNote: "Your lost credit pack was restored",
    });

    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      userId: "u1",
      amount: 1000,
      reason: "lost pack webhook",
      idempotencyKey: "key-1",
      kind: "pack",
      customerNote: "Your lost credit pack was restored",
    });
  });

  it("SV-22 the amount is judged by its kind, as the server's validator does", async () => {
    const { parseCreditAmount } = await import("@/app/admin/billing/credit-amount");

    expect(parseCreditAmount("-50", "goodwill")).toEqual({ ok: true, amount: -50 });
    expect(parseCreditAmount("-50", "pack").ok).toBe(false);
    expect(parseCreditAmount("-50", "subscription_month").ok).toBe(false);
    expect(parseCreditAmount("1000", "subscription_month")).toEqual({ ok: true, amount: 1000 });
    expect(parseCreditAmount("1001", "subscription_month")).toMatchObject({
      ok: false,
      message: expect.stringMatching(/1,000/),
    });
  });

  it("SV-22 both credit forms ask what the credits are and send it", async () => {
    for (const file of [
      "app/admin/billing/BillingActions.tsx",
      "app/admin/users/[id]/UserAdminActions.tsx",
    ]) {
      const form = await source(file);

      expect(form, file).toContain("<CreditKindFields");
      expect(form, file).toMatch(/adjustAdminCredits\([^;]*\{\s*kind[^;]*customerNote/);
    }
  });

  it("S-415 each grantable entitlement says what it unlocks; ai_credits says it adds no credits", async () => {
    const { ADMIN_ENTITLEMENT_KEYS, ADMIN_ENTITLEMENT_LABELS } =
      await import("@/features/admin/services/admin-actions");

    for (const key of ADMIN_ENTITLEMENT_KEYS) expect(ADMIN_ENTITLEMENT_LABELS[key]).toBeTruthy();
    expect(ADMIN_ENTITLEMENT_LABELS.ai_credits).toMatch(/adds no credits/);

    for (const file of [
      "app/admin/billing/BillingActions.tsx",
      "app/admin/users/[id]/UserAdminActions.tsx",
    ]) {
      const form = await source(file);
      expect(form, file).not.toContain('.replace(/_/g, " ")');
      expect(form, file).toContain("ADMIN_ENTITLEMENT_LABELS[");
    }
    expect(await source("app/admin/billing/entitlements/page.tsx")).not.toContain(
      '{ label: "AI credits", value: "ai_credits" }',
    );
  });

  it("S-414 the referrer of a pasted user id is found by that account, not by a near match", async () => {
    mockFetch(() => ({
      status: 200,
      body: {
        data: {
          items: [
            { id: "r1", referredUser: { id: "other" }, affiliate: { email: "x@example.com" } },
            { id: "r2", referredUser: { id: "u1" }, affiliate: { email: "aff@example.com" } },
          ],
          total: 2,
          limit: 100,
          offset: 0,
        },
      },
    }));
    const { fetchAdminReferrer } = await import("@/features/admin/services/admin-actions");

    await expect(fetchAdminReferrer("u1", "jane@example.com")).resolves.toMatchObject({
      id: "r2",
      affiliate: { email: "aff@example.com" },
    });
    await expect(fetchAdminReferrer("nobody", "jane@example.com")).resolves.toBeNull();
  });

  it("S-414 a manual commission names both accounts and holds the money unless released", async () => {
    const form = await source("app/admin/affiliates/AffiliateActions.tsx");
    const body = form.slice(form.indexOf("export function CommissionCreateForm"));

    expect(body).toContain("useAdminAccount(referredUserId)");
    expect(body).toContain("useReferrer(referredUserId");
    expect(form).toContain("fetchAdminReferrer(id, referredEmail)");
    expect(body).not.toContain('status: "AVAILABLE",');
    expect(body).toContain('status: releaseNow ? "AVAILABLE" : "PENDING"');
    expect(body).toMatch(/withdrawable immediately/);
    // Nothing releases a pending commission on its own.
    expect(body).toContain("held as pending until an admin releases it");
    expect(body).not.toMatch(/through the refund window/);
  });

  it("S-414 a referral the server would refuse, or one that was rejected, cannot be paid", async () => {
    const { commissionBlocker } = await import("@/app/admin/affiliates/AffiliateActions");
    const referral = (status: string, affiliateStatus: string) => ({
      status,
      affiliate: { affiliateStatus },
    });

    expect(commissionBlocker(referral("SIGNED_UP", "ACTIVE"))).toBeNull();
    expect(commissionBlocker(referral("CONVERTED", "ACTIVE"))).toBeNull();
    expect(commissionBlocker(referral("SIGNED_UP", "SUSPENDED"))).toMatch(/affiliate not active/i);
    expect(commissionBlocker(referral("REJECTED", "ACTIVE"))).toMatch(/rejected/i);
  });
});
