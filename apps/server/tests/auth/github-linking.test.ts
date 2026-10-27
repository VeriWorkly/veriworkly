import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GitHub linking rules (V-265, owner decision): one GitHub per VeriWorkly account, never removed
 * or swapped. Free users import only from their linked GitHub, so an unlink and relink of another
 * GitHub would get round that. Postgres-backed checks (the unique account constraint, the real
 * unlink endpoint) are in `tests/integration/github-linking.test.ts`.
 */

const { mockPrisma, mockGetOAuthState } = vi.hoisted(() => ({
  mockPrisma: { account: { findFirst: vi.fn() } },
  mockGetOAuthState: vi.fn(),
}));

vi.mock("#lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("better-auth/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("better-auth/api")>()),
  getOAuthState: mockGetOAuthState,
}));

import { APIError } from "better-auth/api";

import {
  GITHUB_ALREADY_LINKED,
  GITHUB_UNLINK_FORBIDDEN,
  assertGithubUnlinkAllowed,
  refuseSecondGithubAccount,
  surfaceRefusedGithubSignIn,
} from "../../src/auth/githubLinking.js";

function githubAccount(accountId: string) {
  return { userId: "user-1", providerId: "github", accountId };
}

function caught(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
}

async function caughtAsync(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  return undefined;
}

beforeEach(() => {
  mockPrisma.account.findFirst.mockReset();
  mockGetOAuthState.mockReset().mockResolvedValue(null);
});

describe("unlinking GitHub", () => {
  it("is refused with GITHUB_UNLINK_FORBIDDEN", () => {
    const error = caught(() =>
      assertGithubUnlinkAllowed("/unlink-account", { providerId: "github" }),
    );

    expect(error).toBeInstanceOf(APIError);
    expect((error as APIError).statusCode).toBe(403);
    expect((error as APIError).body).toMatchObject({ code: GITHUB_UNLINK_FORBIDDEN });
  });

  it("leaves other providers and other endpoints alone", () => {
    expect(() =>
      assertGithubUnlinkAllowed("/unlink-account", { providerId: "google" }),
    ).not.toThrow();
    expect(() => assertGithubUnlinkAllowed("/link-social", { provider: "github" })).not.toThrow();
    expect(() => assertGithubUnlinkAllowed("/unlink-account", undefined)).not.toThrow();
  });
});

describe("linking a GitHub account", () => {
  it("is allowed when the user has no GitHub yet", async () => {
    mockPrisma.account.findFirst.mockResolvedValue(null);

    await expect(refuseSecondGithubAccount(githubAccount("111"), null)).resolves.toBeUndefined();
  });

  it("is allowed again for the same GitHub account id (an expired token being renewed)", async () => {
    mockPrisma.account.findFirst.mockResolvedValue(null);

    await expect(refuseSecondGithubAccount(githubAccount("111"), null)).resolves.toBeUndefined();
    // Only a GitHub row with a different account id counts as "another GitHub".
    expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", providerId: "github", accountId: { not: "111" } },
      select: { id: true },
    });
  });

  it("is refused with GITHUB_ALREADY_LINKED when a different GitHub is linked", async () => {
    mockPrisma.account.findFirst.mockResolvedValue({ id: "acc-old" });

    const error = await caughtAsync(() => refuseSecondGithubAccount(githubAccount("222"), null));

    expect(error).toBeInstanceOf(APIError);
    expect((error as APIError).statusCode).toBe(403);
    expect((error as APIError).body).toMatchObject({ code: GITHUB_ALREADY_LINKED });
  });

  it("sends the browser back to the link's error URL with the code during an OAuth callback", async () => {
    mockPrisma.account.findFirst.mockResolvedValue({ id: "acc-old" });
    mockGetOAuthState.mockResolvedValue({
      errorURL: "http://localhost:3001/settings?tab=account",
    });
    const redirect = vi.fn((url: string) => new Error(`redirect:${url}`));

    const error = await caughtAsync(() =>
      refuseSecondGithubAccount(githubAccount("222"), {
        redirect,
        context: { options: {}, baseURL: "http://localhost:8080/api/v1/auth" },
      }),
    );

    expect(redirect).toHaveBeenCalledWith(
      "http://localhost:3001/settings?tab=account&error=GITHUB_ALREADY_LINKED",
    );
    expect((error as Error).message).toContain("error=GITHUB_ALREADY_LINKED");
  });

  it("ignores accounts from other providers", async () => {
    await expect(
      refuseSecondGithubAccount({ userId: "user-1", providerId: "google", accountId: "9" }, null),
    ).resolves.toBeUndefined();
    expect(mockPrisma.account.findFirst).not.toHaveBeenCalled();
  });
});

describe("an implicit sign-in link refused for a second GitHub", () => {
  function callbackContext(location: string) {
    const redirect = vi.fn((url: string) => new Error(`redirect:${url}`));
    return {
      redirect,
      ctx: {
        path: "/callback/:id",
        context: { returned: new APIError("FOUND", undefined, { location }) },
        redirect,
      },
    };
  }

  it("reaches the browser as GITHUB_ALREADY_LINKED, not unable_to_link_account", async () => {
    const state = { errorURL: "http://localhost:3001/login" };
    mockGetOAuthState.mockResolvedValue(state);
    mockPrisma.account.findFirst.mockResolvedValue({ id: "acc-old" });
    // better-auth swallows this error inside its sign-in link and redirects with its own code.
    await caughtAsync(() => refuseSecondGithubAccount(githubAccount("222"), null));

    const { ctx, redirect } = callbackContext(
      "http://localhost:3001/login?error=unable_to_link_account",
    );
    const error = await caughtAsync(() => surfaceRefusedGithubSignIn(ctx));

    expect(redirect).toHaveBeenCalledWith(
      "http://localhost:3001/login?error=GITHUB_ALREADY_LINKED",
    );
    expect(error).toBeInstanceOf(Error);
  });

  it("leaves other link failures alone", async () => {
    mockGetOAuthState.mockResolvedValue({ errorURL: "http://localhost:3001/login" });

    const { ctx, redirect } = callbackContext(
      "http://localhost:3001/login?error=unable_to_link_account",
    );
    await expect(surfaceRefusedGithubSignIn(ctx)).resolves.toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });
});
