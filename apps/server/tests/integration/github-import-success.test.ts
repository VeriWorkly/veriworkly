import { randomUUID } from "node:crypto";

import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { config } from "#config";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

/**
 * V-411: a GitHub import that succeeds, and the owner rule on whose GitHub it reads. A free user
 * imports only their own linked GitHub: the requested username is replaced by the linked
 * account's login, read with the user's own token, and the day's free import is used. A paid
 * user may import any username, with the server's token and the paid daily cap, and the free
 * quota is left alone. Only `fetch` (GitHub) is replaced.
 */

const SERVER_TOKEN = "ghp_server_token";
const originalToken = config.github.token;

afterEach(() => {
  config.github.token = originalToken;
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function profile(login: string) {
  return {
    login,
    name: `${login} Person`,
    bio: "Builds things",
    location: "Somewhere",
    blog: "",
    email: null,
    html_url: `https://github.com/${login}`,
    public_repos: 1,
    followers: 1,
  };
}

/** GitHub as seen through `fetch`: `/user` is the token's own login. */
function stubGithub(tokenLogin: string | null) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/user")
      return tokenLogin ? json({ login: tokenLogin }) : json({ message: "Bad creds" }, 401);
    const repos = url.pathname.match(/^\/users\/([^/]+)\/repos$/);
    if (repos)
      return json([
        {
          name: `${repos[1]}-project`,
          description: "A project",
          html_url: `https://github.com/${repos[1]}/project`,
          language: "TypeScript",
          stargazers_count: 3,
          fork: false,
          updated_at: new Date().toISOString(),
        },
      ]);
    const user = url.pathname.match(/^\/users\/([^/]+)$/);
    if (user) return json(profile(user[1]!));
    return json({ message: "Not Found" }, 404);
  });
}

function importGithub(user: TestUser, usernameOrUrl: string) {
  return request(app)
    .post("/api/v1/profiles/import/github")
    .set("Origin", STUDIO_ORIGIN)
    .set("Cookie", user.cookie)
    .send({ usernameOrUrl, replaceMaster: false });
}

function calls(fetchSpy: ReturnType<typeof stubGithub>) {
  return fetchSpy.mock.calls.map(([input, init]) => ({
    path: new URL(String(input)).pathname,
    authorization: new Headers(init?.headers).get("authorization"),
  }));
}

describe("V-411 a successful GitHub import", () => {
  it("a free user gets their own linked GitHub, whatever username they ask for", async () => {
    const user = await createUserWithSession();
    await prisma.account.create({
      data: {
        userId: user.id,
        providerId: "github",
        accountId: `gh-${randomUUID()}`,
        accessToken: "gho_users_own",
      },
    });
    const fetchSpy = stubGithub("realme");

    const response = await importGithub(user, "https://github.com/someone-else");
    expect(response.status, JSON.stringify(response.body)).toBe(200);

    const documents = await prisma.document.findMany({ where: { userId: user.id } });
    expect(documents).toHaveLength(1);
    expect(documents[0]).toMatchObject({ type: "RESUME", title: "GitHub Import (realme)" });
    expect(JSON.stringify(documents[0]!.content)).toContain("realme Person");
    expect(JSON.stringify(documents[0]!.content)).not.toContain("someone-else");

    const made = calls(fetchSpy);
    expect(made.map((call) => call.path)).toEqual([
      "/user",
      "/users/realme",
      "/users/realme/repos",
    ]);
    for (const call of made) expect(call.authorization).toBe("Bearer gho_users_own");

    // The day's free import is used, and a second one is refused.
    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.lastGithubImportAt).toBeInstanceOf(Date);
    const again = await importGithub(user, "realme");
    expect(again.status).toBe(429);
  });

  it("a free user without a linked GitHub is refused and nothing is used", async () => {
    const user = await createUserWithSession();
    const fetchSpy = stubGithub("realme");

    const response = await importGithub(user, "octocat");
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/connect your GitHub account/);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await prisma.document.count({ where: { userId: user.id } })).toBe(0);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).lastGithubImportAt,
    ).toBeNull();
  });

  it("a paid user imports any username with the server's token and the paid cap", async () => {
    config.github.token = SERVER_TOKEN;
    const user = await createUserWithSession();
    await prisma.entitlementGrant.create({
      data: {
        userId: user.id,
        key: "portfolio_publish",
        source: "MANUAL",
        sourceId: `grant_${randomUUID()}`,
        startsAt: new Date(Date.now() - 60_000),
      },
    });
    const fetchSpy = stubGithub(null);

    const response = await importGithub(user, "octocat");
    expect(response.status, JSON.stringify(response.body)).toBe(200);

    const documents = await prisma.document.findMany({ where: { userId: user.id } });
    expect(documents.map((document) => document.title)).toEqual(["GitHub Import (octocat)"]);

    const made = calls(fetchSpy);
    expect(made.map((call) => call.path)).toEqual(["/users/octocat", "/users/octocat/repos"]);
    for (const call of made) expect(call.authorization).toBe(`Bearer ${SERVER_TOKEN}`);

    // The free quota is left alone; the paid daily cap counted this one.
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).lastGithubImportAt,
    ).toBeNull();
    const day = new Date().toISOString().slice(0, 10);
    expect(await getRedis().get(`import:paid-github:${user.id}:${day}`)).toBe("1");
  });
});
