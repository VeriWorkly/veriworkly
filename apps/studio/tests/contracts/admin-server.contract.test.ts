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
  }) =>
    createElement(
      "div",
      null,
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

vi.mock("next/headers", () => ({
  cookies: async () => ({ toString: () => "veriworkly-auth.session_token=test-session" }),
  headers: async () => new Headers(),
}));

const session = vi.hoisted(() => ({
  user: { id: "admin-1", email: "admin@example.com" } as {
    id: string;
    email: string;
  } | null,
}));

vi.mock("@/features/auth/services/current-user", () => ({
  fetchCurrentUser: async () => session.user,
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
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe("admin server contract", () => {
  it("S-042: follows hasMore so a 25-item roadmap shows all 25", async () => {
    const all = Array.from({ length: 25 }, (_, index) => roadmapItem(index));

    const calls = mockFetch((url) => {
      // Pages smaller than asked for, so only `hasMore` can tell the client there is more.
      const limit = Math.min(Number(url.searchParams.get("limit")), 20);
      const offset = Number(url.searchParams.get("offset"));
      const items = all.slice(offset, offset + limit);
      const hasMore = offset + limit < all.length;

      return {
        status: 200,
        body: {
          success: true,
          message: "ok",
          data: {
            items,
            total: all.length,
            limit,
            offset,
            hasMore,
            pagination: { mode: "offset", nextOffset: hasMore ? offset + limit : null },
          },
        },
      };
    });

    const { fetchAdminRoadmapServer } = await import("@/features/admin/services/admin-server");
    const items = await fetchAdminRoadmapServer();

    expect(items).toHaveLength(25);
    expect(new Set(items.map((item) => item.id)).size).toBe(25);
    expect(calls.length).toBeGreaterThan(1);
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
      const source = await readFile(path.join(process.cwd(), page), "utf8");

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

    await createRoadmapFeature(buildRoadmapPayload(empty, "create"));

    const body = JSON.parse(String(calls[0].init.body)) as Record<string, unknown>;
    expect(Object.values(body)).not.toContain(null);
    expect(body).toEqual({ title: "New", description: "Desc", status: "todo", tags: [] });

    // An edit still clears a field the operator emptied.
    expect(buildRoadmapPayload(empty, "edit").startedAt).toBeNull();
  });

  it("S-077: a rejected roadmap write shows the server's message", async () => {
    mockFetch(() => ({ status: 400, body: { message: "completedAt: Invalid datetime" } }));

    const { createRoadmapFeature } = await import("@/features/roadmap/services/admin-roadmap");

    await expect(
      createRoadmapFeature({ title: "t", description: "d", status: "todo" }),
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

  it("S-090: suspending a portfolio asks for the server's 10-character minimum", async () => {
    const source = await readFile(
      path.join(process.cwd(), "app/admin/portfolios/PortfolioModerationActions.tsx"),
      "utf8",
    );

    expect(source).toMatch(/minReasonLength=\{nextStatus === "SUSPENDED" \? 10 : 3\}/);
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
      path.join(process.cwd(), "../server/src/validators/admin/adminBillingValidator.ts"),
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
      const source = await readFile(path.join(process.cwd(), file), "utf8");
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
    const entries = await readdir(path.join(process.cwd(), "app/admin"), { recursive: true });

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
      const source = await readFile(path.join(process.cwd(), "app/admin", loader), "utf8");
      expect(source.trim(), loader).toBe('export { default } from "../loading";');
    }
  });

  it("gives each list and detail page a skeleton with its own stat row and side form", async () => {
    const { resolveAdminRoute } = await import("@/features/admin/config/admin-routes");

    for (const page of await adminFiles("page.tsx")) {
      const { skeleton, path: route } = resolveAdminRoute(routeOf(page).replaceAll("[id]", "x"));
      if (route !== routeOf(page)) continue;

      const source = await readFile(path.join(process.cwd(), "app/admin", page), "utf8");
      const statRow = source.match(/<section className="grid gap-3[^"]*">([\s\S]*?)<\/section>/);
      const statCount = statRow?.[1].match(/<AdminStatCard\b/g)?.length;

      if (skeleton.kind === "list") {
        expect(skeleton.stats, page).toBe(statCount);
        expect(Boolean(skeleton.aside), page).toBe(source.includes("aside={"));
      }

      if (skeleton.kind === "detail") {
        expect(skeleton.stats, page).toBe(statCount);
      }
    }

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
  readFile(path.join(process.cwd(), "../server/src/services/admin/adminBillingService.ts"), "utf8");

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
      const source = await readFile(path.join(process.cwd(), "app/admin", page), "utf8");
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

    // A visibility change on a portfolio also suspends its publication under a moderation lock
    // (`takeDownPortfolioPublication`), so "unlisted" cannot let the owner publish again.
    const source = await readFile(
      path.join(process.cwd(), "../server/src/services/admin/adminDocumentService.ts"),
      "utf8",
    );
    expect(source.replace(/\s+/g, " ")).toContain(
      'if (document.type === "PORTFOLIO") await takeDownPortfolioPublication(documentId, "document_hidden")',
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
      expect(page, visibility).not.toMatch(/Lift takedown|can publish/);
      if (visibility !== "PRIVATE") expect(page, visibility).toMatch(/publication is suspended/);
    }

    const portfolio = await renderAdminText(
      createElement(PortfolioModerationActions, {
        publicationId: "p1",
        subdomain: "jane",
        status: "LIVE",
      }),
    );
    expect(portfolio).not.toMatch(/can publish again from their editor/);
    expect(portfolio).not.toMatch(/Lift takedown/);
    expect(portfolio).toMatch(/cannot publish it again/);
  });

  it("S-335: an enabled API key works at once", async () => {
    const { default: ApiKeyActions } = await import("@/app/admin/api-keys/ApiKeyActions");
    const page = await renderAdminText(
      createElement(ApiKeyActions, { id: "k1", name: "CI", isActive: false, revoked: false }),
    );

    expect(page).not.toMatch(/5½|few minutes/);
    expect(page).toMatch(/immediately/);
  });

  it("S-334: account deletion is blocked by the same chargeable-subscription rule as the server", async () => {
    const source = await readFile(
      path.join(process.cwd(), "../server/src/services/userService.ts"),
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
      path.join(process.cwd(), "app/admin/billing/webhooks/page.tsx"),
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
      createElement(UserAdminActions, { detail: detail(true) }),
    );
    expect(cancelled).toMatch(/Renewal is already cancelled; delete is available after/);
    expect(cancelled).toContain("Dec 1, 2026");

    const renewing = await renderAdminText(
      createElement(UserAdminActions, { detail: detail(false) }),
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
    const source = await readFile(path.join(process.cwd(), page), "utf8");
    const refs = new Set<unknown>();

    for (const [, specifier] of source.matchAll(/from "(@\/[^"]+)"/g)) {
      const base = path.join(process.cwd(), specifier.slice(2));
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
