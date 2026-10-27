import { describe, expect, it, vi } from "vitest";

// `#auth/index` wraps the client with `$extends` at import (V-265).
vi.mock("#lib/prisma", () => ({ prisma: { $extends: () => ({}) } }));
vi.mock("#lib/redis", () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  cacheDel: vi.fn(),
  cacheDelByPrefix: vi.fn(),
  getRedis: vi.fn(),
}));

import { parseGithubUsername } from "../../src/services/profileImportService.js";

/**
 * V-144: the username is interpolated into a GitHub API URL, with the server's token for paid
 * users. A URL's first path segment used to be returned verbatim; now both forms go through
 * the same character filter and GitHub's own username rule.
 */
describe("parseGithubUsername", () => {
  it("accepts bare usernames and github.com profile URLs", () => {
    expect(parseGithubUsername("octocat")).toBe("octocat");
    expect(parseGithubUsername("  Octo-Cat1 ")).toBe("Octo-Cat1");
    expect(parseGithubUsername("https://github.com/octocat")).toBe("octocat");
    expect(parseGithubUsername("https://www.github.com/octocat/")).toBe("octocat");
    expect(parseGithubUsername("http://github.com/octocat?tab=repositories")).toBe("octocat");
    expect(parseGithubUsername("https://github.com/octocat/some-repo")).toBe("octocat");
  });

  it("rejects input the old filter would have silently altered, URL or bare", () => {
    expect(parseGithubUsername("octo.cat")).toBeNull();
    expect(parseGithubUsername("https://github.com/octo.cat")).toBeNull();
    expect(parseGithubUsername("https://github.com/octo%20cat")).toBeNull();
    expect(parseGithubUsername("octo cat")).toBeNull();
    expect(parseGithubUsername("../../repos")).toBeNull();
  });

  it("rejects what GitHub would reject", () => {
    expect(parseGithubUsername("")).toBeNull();
    expect(parseGithubUsername("   ")).toBeNull();
    expect(parseGithubUsername("-octocat")).toBeNull();
    expect(parseGithubUsername("https://github.com/-octocat")).toBeNull();
    expect(parseGithubUsername("a".repeat(40))).toBeNull();
    expect(parseGithubUsername("a".repeat(39))).toHaveLength(39);
    expect(parseGithubUsername("https://github.com/")).toBeNull();
    expect(parseGithubUsername("https://github.com")).toBeNull();
  });

  it("rejects URLs that are not github.com, instead of mangling them into a name", () => {
    expect(parseGithubUsername("https://gitlab.com/octocat")).toBeNull();
    expect(parseGithubUsername("https://evil-github.com/octocat")).toBeNull();
    expect(parseGithubUsername("https://github.com.evil.test/octocat")).toBeNull();
    expect(parseGithubUsername("http://[bad")).toBeNull();
  });
});
