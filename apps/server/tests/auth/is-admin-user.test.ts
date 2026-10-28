import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

/**
 * V-383: `isAdminUser` lets the admin past the production-only gates (payments, publishing) and
 * into the admin panel. It fails closed when ADMIN_EMAIL is empty or the session has no email,
 * and compares case- and space-insensitively (the config value is stored lower-cased).
 */
const config = vi.hoisted(() => ({ admin: { email: "admin@veriworkly.com" } }));
vi.mock("#config", () => ({ config }));
vi.mock("#lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
const getSessionUserFromRequest = vi.fn();
vi.mock("#middleware/auth", () => ({
  AuthUnavailableError: class extends Error {},
  getSessionUserFromRequest: (req: unknown) => getSessionUserFromRequest(req),
}));
vi.mock("#lib/prisma", () => ({ prisma: { user: { findUnique: vi.fn() } } }));

const { isAdminUser } = await import("#lib/isAdminUser");
const { adminAuthMiddleware } = await import("#middleware/adminAuth");

describe("isAdminUser", () => {
  it("matches the configured email whatever its case or surrounding spaces", () => {
    config.admin.email = "admin@veriworkly.com";
    expect(isAdminUser("admin@veriworkly.com")).toBe(true);
    expect(isAdminUser("Admin@VeriWorkly.com")).toBe(true);
    expect(isAdminUser("  admin@veriworkly.com ")).toBe(true);
    expect(isAdminUser("someone@veriworkly.com")).toBe(false);
  });

  it.each([null, undefined, "", "   "])("refuses a session email of %j", (email) => {
    config.admin.email = "admin@veriworkly.com";
    expect(isAdminUser(email)).toBe(false);
  });

  it("treats nobody as admin when ADMIN_EMAIL is empty, an empty session email included", () => {
    config.admin.email = "";
    expect(isAdminUser("")).toBe(false);
    expect(isAdminUser("   ")).toBe(false);
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser("admin@veriworkly.com")).toBe(false);
  });
});

describe("adminAuthMiddleware with ADMIN_EMAIL unset", () => {
  it("answers 500 and never reaches the route or the session", async () => {
    config.admin.email = "";
    const json = vi.fn();
    const res = { status: vi.fn(() => ({ json })) } as unknown as Response;
    const next = vi.fn();

    await adminAuthMiddleware({ headers: {} } as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
    expect(getSessionUserFromRequest).not.toHaveBeenCalled();
  });
});
