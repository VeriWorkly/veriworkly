import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetRedis, mockSendAuthOtpEmail } = vi.hoisted(() => ({
  mockGetRedis: vi.fn(),
  mockSendAuthOtpEmail: vi.fn(),
}));

vi.mock("#lib/redis", () => ({
  getRedis: mockGetRedis,
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  cacheDel: vi.fn(),
}));

// `#auth/index` wraps the client with `$extends` at import (V-265).
vi.mock("#lib/prisma", () => ({ prisma: { $extends: () => ({}) } }));

vi.mock("#services/mail", () => ({
  sendAuthOtpEmail: mockSendAuthOtpEmail,
  sendWelcomeEmail: vi.fn(),
  sendLoginAlertEmail: vi.fn(),
  sendAccountDeletedEmail: vi.fn(),
}));

import {
  auth,
  consumeOtpRecipientQuota,
  assertOtpRecipientQuotaAvailable,
  otpPrecheckRecipient,
} from "#auth/index";

/** Just enough of a Redis client: string counters, `MULTI` of INCR/EXPIRE/TTL, and GET. */
function fakeRedis() {
  const store = new Map<string, number>();
  const expireCalls: unknown[][] = [];

  const client = {
    isReady: true,
    get: vi.fn(async (key: string) => (store.has(key) ? String(store.get(key)) : null)),
    multi() {
      const ops: Array<() => number> = [];
      const chain = {
        incr(key: string) {
          ops.push(() => {
            const next = (store.get(key) ?? 0) + 1;
            store.set(key, next);
            return next;
          });
          return chain;
        },
        expire(...args: unknown[]) {
          expireCalls.push(args);
          ops.push(() => 1);
          return chain;
        },
        ttl() {
          ops.push(() => 3600);
          return chain;
        },
        exec: async () => ops.map((op) => op()),
      };
      return chain;
    },
  };

  return { client, store, expireCalls };
}

function sendVerificationOTP() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugin = (auth.options as any).plugins.find((p: { id: string }) => p.id === "email-otp");
  return plugin.options.sendVerificationOTP as (data: {
    email: string;
    otp: string;
    type: string;
  }) => Promise<void>;
}

describe("V-157 per-recipient OTP throttle", () => {
  beforeEach(() => {
    mockGetRedis.mockReset();
    mockSendAuthOtpEmail.mockReset();
  });

  it("allows 5 OTP mails per address per hour and refuses the 6th with TOO_MANY_REQUESTS", async () => {
    const { client, store, expireCalls } = fakeRedis();
    mockGetRedis.mockReturnValue(client);

    for (let i = 0; i < 5; i += 1) await consumeOtpRecipientQuota("victim@example.com");

    await expect(consumeOtpRecipientQuota("Victim@Example.com")).rejects.toMatchObject({
      status: "TOO_MANY_REQUESTS",
      statusCode: 429,
    });

    const key = `auth:otp:recipient:${createHash("sha256").update("victim@example.com").digest("hex")}`;
    expect(store.get(key)).toBe(6);
    // The window starts at the first mail and is never extended by later ones.
    expect(expireCalls[0]).toEqual([key, 3600, "NX"]);
  });

  it("counts +tag and Gmail dot variants against the one mailbox they reach (V-253)", async () => {
    const { client } = fakeRedis();
    mockGetRedis.mockReturnValue(client);

    for (const variant of [
      "victim@gmail.com",
      "victim+1@gmail.com",
      "v.i.c.t.i.m@gmail.com",
      "Vic.Tim+x@GoogleMail.com",
      " victim+2@gmail.com ",
    ])
      await consumeOtpRecipientQuota(variant);

    await expect(consumeOtpRecipientQuota("vi.ctim+6@gmail.com")).rejects.toMatchObject({
      status: "TOO_MANY_REQUESTS",
    });
    await expect(assertOtpRecipientQuotaAvailable("victim+7@gmail.com")).rejects.toMatchObject({
      status: "TOO_MANY_REQUESTS",
    });

    // +tags fold on any domain; dots only where the provider ignores them.
    for (let i = 0; i < 5; i += 1) await consumeOtpRecipientQuota(`jo.ann+${i}@example.com`);
    await expect(consumeOtpRecipientQuota("jo.ann@example.com")).rejects.toMatchObject({
      status: "TOO_MANY_REQUESTS",
    });
    await expect(consumeOtpRecipientQuota("joann@example.com")).resolves.toBeUndefined();
  });

  it("does not send the 6th mail from sendVerificationOTP", async () => {
    const { client } = fakeRedis();
    mockGetRedis.mockReturnValue(client);
    const send = sendVerificationOTP();

    for (let i = 0; i < 5; i += 1)
      await send({ email: "victim@example.com", otp: "123456", type: "sign-in" });

    await expect(
      send({ email: "victim@example.com", otp: "123456", type: "sign-in" }),
    ).rejects.toMatchObject({ status: "TOO_MANY_REQUESTS" });
    expect(mockSendAuthOtpEmail).toHaveBeenCalledTimes(5);
  });

  it("refuses to send (503) when Redis is unavailable", async () => {
    mockGetRedis.mockImplementation(() => {
      throw new Error("Redis client not ready");
    });

    await expect(
      sendVerificationOTP()({ email: "victim@example.com", otp: "123456", type: "sign-in" }),
    ).rejects.toMatchObject({ status: "SERVICE_UNAVAILABLE", statusCode: 503 });
    await expect(assertOtpRecipientQuotaAvailable("victim@example.com")).rejects.toMatchObject({
      status: "SERVICE_UNAVAILABLE",
    });
    expect(mockSendAuthOtpEmail).not.toHaveBeenCalled();
  });

  it("reports an exhausted recipient before the endpoint runs, so the client sees 429", async () => {
    const { client } = fakeRedis();
    mockGetRedis.mockReturnValue(client);

    await expect(assertOtpRecipientQuotaAvailable("victim@example.com")).resolves.toBeUndefined();
    for (let i = 0; i < 5; i += 1) await consumeOtpRecipientQuota("victim@example.com");

    await expect(assertOtpRecipientQuotaAvailable("victim@example.com")).rejects.toMatchObject({
      status: "TOO_MANY_REQUESTS",
    });
  });
});

describe("otpPrecheckRecipient", () => {
  it.each([
    ["/email-otp/send-verification-otp", { email: "a@x.test", type: "sign-in" }, "a@x.test"],
    ["/email-otp/send-verification-otp", { email: "a@x.test", type: "forget-password" }, undefined],
    [
      "/email-otp/send-verification-otp",
      { email: "a@x.test", type: "email-verification" },
      undefined,
    ],
    ["/email-otp/request-password-reset", { email: "a@x.test" }, undefined],
    ["/email-otp/request-email-change", { newEmail: "n@x.test", email: "a@x.test" }, "n@x.test"],
    ["/email-otp/request-email-change", { email: "a@x.test" }, undefined],
    ["/email-otp/send-verification-otp", { newEmail: "n@x.test", type: "sign-in" }, undefined],
    ["/sign-in/email-otp", { email: "a@x.test" }, undefined],
  ])("%s %j → %s", (path, body, expected) => {
    expect(otpPrecheckRecipient(path, body)).toBe(expected);
  });

  it.each([undefined, null, "a string body", 42, [], { email: 7, type: "sign-in" }])(
    "skips a malformed body (%j) without throwing",
    (body) => {
      expect(otpPrecheckRecipient("/email-otp/send-verification-otp", body)).toBeUndefined();
      expect(otpPrecheckRecipient("/email-otp/request-email-change", body)).toBeUndefined();
    },
  );
});
