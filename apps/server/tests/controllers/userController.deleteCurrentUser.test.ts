import { describe, expect, it, vi } from "vitest";

vi.mock("#config", () => ({ config: { auth: { cookieDomain: ".veriworkly.com" } } }));
vi.mock("#middleware/auth", () => ({ requireAuthUser: () => ({ id: "user-1" }) }));
vi.mock("#services/userService", () => ({ UserService: { deleteUserAccount: vi.fn() } }));
vi.mock("#utils/authCache", () => ({ invalidateSessionCache: vi.fn() }));

import { UserController } from "#controllers/userController";

/**
 * V-314: a browser drops a `Set-Cookie` for a `__Secure-` name that lacks `Secure`, so the
 * production clears must carry it; every better-auth cookie goes, not just the session token.
 */
describe("deleteCurrentUser", () => {
  it("clears every auth cookie, with Secure on the __Secure- names, at the configured domain", async () => {
    const res = { clearCookie: vi.fn(), json: vi.fn() };

    await UserController.deleteCurrentUser({ headers: {} } as never, res as never, vi.fn());

    const plain = { path: "/", domain: ".veriworkly.com" };
    const secure = { ...plain, secure: true };
    for (const name of ["session_token", "session_data", "dont_remember"]) {
      expect(res.clearCookie).toHaveBeenCalledWith(`veriworkly-auth.${name}`, plain);
      expect(res.clearCookie).toHaveBeenCalledWith(`__Secure-veriworkly-auth.${name}`, secure);
    }
  });
});
