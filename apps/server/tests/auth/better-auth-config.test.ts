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

vi.mock("#utils/redis", () => ({
  getRedis: mockGetRedis,
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  cacheDel: vi.fn(),
}));

vi.mock("#utils/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("#services/mail", () => ({
  sendAuthOtpEmail: vi.fn(),
  sendWelcomeEmail: mockSendWelcomeEmail,
  sendLoginAlertEmail: mockSendLoginAlertEmail,
  sendAccountDeletedEmail: vi.fn(),
}));

import { auth } from "#auth/index";

describe("Better Auth configuration", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options = auth.options as any;

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
    expect(mockSendWelcomeEmail).toHaveBeenCalledWith("newuser@example.com", "John Doe");
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
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-123" },
      select: { email: true, createdAt: true },
    });
    expect(mockSendLoginAlertEmail).toHaveBeenCalledWith("user@example.com", {
      ip: "192.168.1.1",
      device: "Mozilla/5.0",
      timestamp: mockSession.createdAt.toISOString(),
      provider: "unknown",
    });
  });

  it("has Google, GitHub, and LinkedIn social providers configured", () => {
    expect(options.socialProviders).toBeDefined();
    expect(options.socialProviders?.google).toBeDefined();
    expect(options.socialProviders?.github).toBeDefined();
    expect(options.socialProviders?.linkedin).toBeDefined();
  });

  it("has account linking enabled with trusted providers", () => {
    expect(options.account).toBeDefined();
    expect(options.account?.accountLinking).toBeDefined();
    expect(options.account?.accountLinking?.enabled).toBe(true);
    expect(options.account?.accountLinking?.trustedProviders).toEqual([
      "google",
      "github",
      "linkedin",
    ]);
  });
});
