import { isValidElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `admin-server.ts` is a server module: it imports the `server-only` guard (which throws when
// resolved outside a React Server Component) and reads request cookies. Both are stubbed so the
// data-loading contract below can be exercised in a plain node environment.
vi.mock("server-only", () => ({}));

// The detail pages render through `@veriworkly/ui`, which loads its fonts from `next/font`.
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "" }),
  Geist_Mono: () => ({ variable: "" }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ toString: () => "veriworkly-auth.session_token=test-session" }),
  headers: async () => new Headers(),
}));

// Every admin read passes the admin gate first; these tests run as the configured admin.
vi.mock("@/features/auth/services/current-user", () => ({
  fetchCurrentUser: async () => ({ id: "admin-1", email: "admin@example.com" }),
}));

const ORIGINAL_FETCH = globalThis.fetch;

function respondWith(status: number, body: unknown) {
  globalThis.fetch = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  ) as unknown as typeof fetch;
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL ||= "http://localhost:8080/api/v1";
  process.env.ADMIN_EMAIL = "admin@example.com";
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

/**
 * Admin detail pages (`/admin/users/[id]`, `/admin/affiliates/[id]`, `/admin/portfolios/[id]`,
 * `/admin/ambassadors/[id]`) must distinguish "this record does not exist" from "the API is
 * broken": a 500, an expired session or an unreachable API must reach the admin error boundary,
 * not render a 404 for a record that exists.
 */
describe("admin detail loading contract", () => {
  it("carries the upstream status on the thrown error", async () => {
    const { AdminApiError, fetchAdminUserDetail } =
      await import("@/features/admin/services/admin-server");

    respondWith(500, { message: "Database unavailable" });

    const error = await fetchAdminUserDetail("user-1").catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(AdminApiError);
    expect((error as InstanceType<typeof AdminApiError>).status).toBe(500);
  });

  it("returns null only for a genuine 404, so the page can call notFound()", async () => {
    const { fetchAdminUserDetail, loadAdminDetail } =
      await import("@/features/admin/services/admin-server");

    respondWith(404, { message: "User not found." });

    await expect(loadAdminDetail(fetchAdminUserDetail("missing"))).resolves.toBeNull();
  });

  it("rethrows a server error instead of degrading it into a not-found page", async () => {
    const { fetchAdminUserDetail, loadAdminDetail } =
      await import("@/features/admin/services/admin-server");

    respondWith(500, { message: "Database unavailable" });

    await expect(loadAdminDetail(fetchAdminUserDetail("user-1"))).rejects.toThrow(
      /Admin request failed \(500\)/,
    );
  });

  it("rethrows an auth failure rather than claiming the record is missing", async () => {
    const { fetchAdminUserDetail, loadAdminDetail } =
      await import("@/features/admin/services/admin-server");

    respondWith(403, { message: "Forbidden" });

    await expect(loadAdminDetail(fetchAdminUserDetail("user-1"))).rejects.toThrow(
      /Admin request failed \(403\)/,
    );
  });

  it("rethrows a transport failure, which carries no HTTP status at all", async () => {
    const { loadAdminDetail } = await import("@/features/admin/services/admin-server");

    await expect(loadAdminDetail(Promise.reject(new TypeError("fetch failed")))).rejects.toThrow(
      /fetch failed/,
    );
  });

  // The defect lived in the pages, not the service, so render the pages too: one that goes back
  // to catching everything would pass the unit tests above while showing an outage as a missing
  // record.
  it("S-358: every admin detail page throws an outage and shows a missing record as gone", async () => {
    const pages = {
      users: await import("@/app/admin/users/[id]/page"),
      affiliates: await import("@/app/admin/affiliates/[id]/page"),
      portfolios: await import("@/app/admin/portfolios/[id]/page"),
      ambassadors: await import("@/app/admin/ambassadors/[id]/page"),
    };
    const params = Promise.resolve({ id: "record-1" });

    for (const [name, { default: Page }] of Object.entries(pages)) {
      respondWith(500, { success: false, message: "Database unavailable" });
      await expect(Page({ params }), name).rejects.toMatchObject({ status: 500 });

      // A missing record renders its "gone" notice or the 404 page, never the error boundary.
      respondWith(404, { success: false, message: "Not found" });
      const missing: unknown = await Page({ params }).catch((error: unknown) => error);
      const digest = (missing as { digest?: unknown } | null)?.digest;
      expect(isValidElement(missing) || /404/.test(String(digest)), name).toBe(true);
    }
  });

  it("passes a successful payload straight through", async () => {
    const { fetchAdminUserDetail, loadAdminDetail } =
      await import("@/features/admin/services/admin-server");

    respondWith(200, { success: true, message: "ok", data: { user: { id: "user-1" } } });

    await expect(loadAdminDetail(fetchAdminUserDetail("user-1"))).resolves.toEqual({
      user: { id: "user-1" },
    });
  });
});
