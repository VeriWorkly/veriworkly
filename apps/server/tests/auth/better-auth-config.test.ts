import { describe, expect, it, vi } from "vitest";

const { mockGetRedis, mockSendWelcomeEmail, mockSendLoginAlertEmail, mockPrisma } = vi.hoisted(
  () => {
    return {
      mockGetRedis: vi.fn(),
      mockSendWelcomeEmail: vi.fn(),
      mockSendLoginAlertEmail: vi.fn(),
      mockPrisma: {
        user: {
          findUnique: vi.fn(),
        },
      },
    };
  },
);

vi.mock("#lib/redis", () => ({
  getRedis: mockGetRedis,
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  cacheDel: vi.fn(),
}));

vi.mock("#lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("#services/mail", () => ({
  sendAuthOtpEmail: vi.fn(),
  sendWelcomeEmail: mockSendWelcomeEmail,
  sendLoginAlertEmail: mockSendLoginAlertEmail,
  sendAccountDeletedEmail: vi.fn(),
}));

import { auth } from "#auth/index";
import { betterAuthLogger } from "#auth/authLogger";

describe("Better Auth configuration", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options = auth.options as any;

  it("sends its own log lines through the masking app logger (V-255)", () => {
    expect(options.logger).toBe(betterAuthLogger);
  });

  it("has rate limiting enabled with correct settings and custom rules", () => {
    expect(options.rateLimit).toBeDefined();
    expect(options.rateLimit?.enabled).toBe(true);
    expect(options.rateLimit?.storage).toBe("secondary-storage");
    expect(options.rateLimit?.customRules).toEqual({
      "/email-otp/send-verification-otp": {
        window: 60,
        max: 3,
      },
      "/email-otp/verify-otp": {
        window: 60,
        max: 5,
      },
    });
  });

  it("has useSecureCookies defined under advanced settings", () => {
    expect(options.advanced).toBeDefined();
    // In test environment, nodeEnv is not production, so useSecureCookies should be false
    expect(options.advanced?.useSecureCookies).toBe(false);
  });

  it("has storeSessionInDatabase enabled to keep DB sessions active", () => {
    expect(options.session).toBeDefined();
    expect(options.session?.storeSessionInDatabase).toBe(true);
  });

  it("implements secondaryStorage adapter that interacts with Redis", async () => {
    expect(options.secondaryStorage).toBeDefined();
    const storage = options.secondaryStorage!;

    const redisMockInstance = {
      get: vi.fn().mockResolvedValue("cached-val"),
      set: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(1),
    };
    mockGetRedis.mockReturnValue(redisMockInstance);

    // Test get
    const getVal = await storage.get("test-key");
    expect(mockGetRedis).toHaveBeenCalled();
    expect(redisMockInstance.get).toHaveBeenCalledWith("test-key");
    expect(getVal).toBe("cached-val");

    // Test set without TTL
    await storage.set("test-key", "value");
    expect(redisMockInstance.set).toHaveBeenCalledWith("test-key", "value");

    // Test set with TTL
    await storage.set("test-key", "value", 120);
    expect(redisMockInstance.set).toHaveBeenCalledWith("test-key", "value", { EX: 120 });

    // Test delete
    await storage.delete("test-key");
    expect(redisMockInstance.del).toHaveBeenCalledWith("test-key");
  });

  it("sends a welcome email on user.create.after", async () => {
    const userCreateAfter = options.databaseHooks?.user?.create?.after;
    expect(userCreateAfter).toBeDefined();

    const mockUser = {
      email: "newuser@example.com",
      name: "John Doe",
    };

    await userCreateAfter(mockUser);
    await vi.waitFor(() =>
      expect(mockSendWelcomeEmail).toHaveBeenCalledWith("newuser@example.com", "John Doe"),
    );
  });

  /** V-047 / V-099: a transport that never answers must not hold up sign-up. */
  it("user.create.after returns while the welcome mail is still pending", async () => {
    mockSendWelcomeEmail.mockReturnValueOnce(new Promise(() => {}));
    const hook = options.databaseHooks.user.create.after;

    const outcome = await Promise.race([
      hook({ id: "u1", email: "a@example.com", name: "A" }).then(() => "done"),
      new Promise((resolve) => setTimeout(() => resolve("timed out"), 200)),
    ]);

    expect(outcome).toBe("done");
  });

  it("user.create.after swallows a failing welcome mail", async () => {
    mockSendWelcomeEmail.mockRejectedValueOnce(new Error("smtp down"));
    const hook = options.databaseHooks.user.create.after;

    await expect(hook({ id: "u1", email: "a@example.com", name: "A" })).resolves.toBeUndefined();
  });

  it("sends a login alert email on session.create.after", async () => {
    const sessionCreateAfter = options.databaseHooks?.session?.create?.after;
    expect(sessionCreateAfter).toBeDefined();

    mockPrisma.user.findUnique.mockResolvedValue({
      email: "user@example.com",
      createdAt: new Date("2026-06-20T12:00:00.000Z"),
    });

    const mockSession = {
      userId: "user-123",
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      createdAt: new Date("2026-06-25T12:00:00.000Z"),
      id: "session-123",
    };

    await sessionCreateAfter(mockSession);
    await vi.waitFor(() =>
      expect(mockSendLoginAlertEmail).toHaveBeenCalledWith("user@example.com", {
        ip: "192.168.1.1",
        device: "Mozilla/5.0",
        timestamp: mockSession.createdAt.toISOString(),
        provider: "unknown",
      }),
    );
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-123" },
      select: { email: true, createdAt: true },
    });
  });

  it("session.create.after returns while the login alert is still pending", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      email: "user@example.com",
      createdAt: new Date("2026-06-20T12:00:00.000Z"),
    });
    mockSendLoginAlertEmail.mockReturnValueOnce(new Promise(() => {}));
    const hook = options.databaseHooks.session.create.after;

    const outcome = await Promise.race([
      hook({ id: "s1", userId: "user-123", createdAt: new Date() }).then(() => "done"),
      new Promise((resolve) => setTimeout(() => resolve("timed out"), 200)),
    ]);

    expect(outcome).toBe("done");
    await vi.waitFor(() => expect(mockSendLoginAlertEmail).toHaveBeenCalled());
  });

  it("has Google, GitHub, and LinkedIn social providers configured", () => {
    expect(options.socialProviders).toBeDefined();
    expect(options.socialProviders?.google).toBeDefined();
    expect(options.socialProviders?.github).toBeDefined();
    expect(options.socialProviders?.linkedin).toBeDefined();
  });

  it("trusts only Google for account linking (unverified GitHub emails must not link)", () => {
    expect(options.account).toBeDefined();
    expect(options.account?.storeStateStrategy).toBe("cookie");
    expect(options.account?.accountLinking).toBeDefined();
    expect(options.account?.accountLinking?.enabled).toBe(true);
    // GitHub reports `verified: false` for any address a user adds without confirming it; a
    // trusted provider is linked to the same-email account regardless, which is an account
    // takeover. Only Google issues verified emails unconditionally.
    expect(options.account?.accountLinking?.trustedProviders).toEqual(["google"]);
    expect(options.account?.accountLinking?.trustedProviders).not.toContain("github");
    expect(options.account?.accountLinking?.trustedProviders).not.toContain("linkedin");
  });

  it("configures onAPIError with studioLoginUrl to redirect auth failures to studio login", () => {
    expect(options.onAPIError).toBeDefined();
    expect(options.onAPIError?.errorURL).toBe("http://localhost:3001/login");
  });
});

/**
 * V-094: without `increment`, better-auth falls back to a get-then-set limiter that a parallel
 * burst walks straight through, and that is fully open when Redis is down.
 */
describe("secondaryStorage.increment", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storage = (auth.options as any).secondaryStorage;

  function mockMulti(replies: unknown[]) {
    const chain = {
      incr: vi.fn(() => chain),
      expire: vi.fn(() => chain),
      ttl: vi.fn(() => chain),
      exec: vi.fn().mockResolvedValue(replies),
    };
    mockGetRedis.mockReturnValue({ multi: vi.fn(() => chain) });
    return chain;
  }

  it("is an atomic INCR + EXPIRE NX that returns the new count", async () => {
    const chain = mockMulti([4, 0, 57]);

    await expect(storage.increment("1.2.3.4|/sign-in/email-otp", 60)).resolves.toBe(4);
    expect(chain.incr).toHaveBeenCalledWith("ba-rl:1.2.3.4|/sign-in/email-otp");
    expect(chain.expire).toHaveBeenCalledWith("ba-rl:1.2.3.4|/sign-in/email-otp", 60, "NX");
    expect(chain.exec).toHaveBeenCalledTimes(1);
  });

  it("fails closed for the OTP-send endpoints and open for the rest when Redis is down", async () => {
    mockGetRedis.mockImplementation(() => {
      throw new Error("Redis client not ready");
    });

    for (const path of [
      "/email-otp/send-verification-otp",
      "/email-otp/request-password-reset",
      "/email-otp/request-email-change",
    ])
      expect(await storage.increment(`1.2.3.4|${path}`, 60)).toBeGreaterThan(1_000_000);

    expect(await storage.increment("1.2.3.4|/sign-in/email-otp", 60)).toBe(1);
    expect(await storage.increment("1.2.3.4|/get-session", 10)).toBe(1);

    mockGetRedis.mockReset();
  });
});
