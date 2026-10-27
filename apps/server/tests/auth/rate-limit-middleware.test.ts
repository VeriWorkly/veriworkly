import { beforeEach, describe, expect, it, vi } from "vitest";
import express, { Router } from "express";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";

const { mockGetRedis } = vi.hoisted(() => {
  return {
    mockGetRedis: vi.fn(),
  };
});

vi.mock("#config", () => ({
  config: {
    nodeEnv: "production",
    rateLimit: {
      windowMs: 60000,
      maxRequests: 5,
      authWindowMs: 60000,
      authMaxRequests: 2,
      globalWindowMs: 900000,
      globalMaxRequests: 50,
    },
    ai: {
      rateLimitWindowMs: 60000,
      rateLimitMaxRequests: 3,
    },
    metrics: { statsInternalKey: "test-stats-internal-key" },
    internal: { apiKey: "test-internal-api-key-0123456789abcdef" },
  },
}));

const INTERNAL_KEY = "test-internal-api-key-0123456789abcdef";

// The real deadline helper and timeout error, so the limiter's timeout handling is exercised.
vi.mock("#lib/redis", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#lib/redis")>()),
  getRedis: mockGetRedis,
}));

vi.mock("#lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { logger } from "#lib/logger";
import {
  AI_IN_FLIGHT_MAX,
  autosaveRateLimit,
  rateLimitMiddleware,
  withAiSlot,
} from "#middleware/rateLimit";

describe("rateLimitMiddleware", () => {
  // `path` is a read-only getter on Request; the mock is a plain object the tests point elsewhere.
  let req: Partial<Omit<Request, "path">> & { headers: Record<string, string>; path: string };
  let res: Partial<Response>;
  let next: NextFunction;
  beforeEach(() => {
    mockGetRedis.mockReset();
    req = {
      headers: {},
      ip: "192.168.1.100",
      path: "/api/v1/auth/sign-in",
      method: "POST",
      socket: {
        remoteAddress: "192.168.1.100",
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    res = {
      set: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });
  it("passes requests under the limit using Redis", async () => {
    const redisMockInstance = {
      isReady: true,
      // [routeCount, routeTtl, globalCount, globalTtl] — one script bumps both buckets.
      eval: vi.fn().mockResolvedValue([1, 60000, 1, 900000]),
    };
    mockGetRedis.mockReturnValue(redisMockInstance);

    await rateLimitMiddleware(req as Request, res as Response, next);

    // Wait briefly for promises in middleware to resolve
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 429 when request count exceeds the limit using Redis", async () => {
    const redisMockInstance = {
      isReady: true,
      // route count 3 against authMaxRequests 2; global bucket still well under its ceiling.
      eval: vi.fn().mockResolvedValue([3, 50000, 3, 900000]),
    };
    mockGetRedis.mockReturnValue(redisMockInstance);

    await rateLimitMiddleware(req as Request, res as Response, next);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.set).toHaveBeenCalledWith("Retry-After", "50");
  });

  /**
   * The per-route buckets are keyed by (method, path, ip), so on their own they bound each
   * endpoint independently and never bound a client's total load. This coarse bucket is the
   * ceiling underneath them.
   */
  it("returns 429 on the global bucket even when the per-route bucket is under its limit", async () => {
    const redisMockInstance = {
      isReady: true,
      // Route count 1 (limit 2) but global count 51 against globalMaxRequests 50.
      eval: vi.fn().mockResolvedValue([1, 60000, 51, 120000]),
    };
    mockGetRedis.mockReturnValue(redisMockInstance);

    await rateLimitMiddleware(req as Request, res as Response, next);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    // Retry-After comes from the bucket that actually tripped.
    expect(res.set).toHaveBeenCalledWith("Retry-After", "120");
  });

  /**
   * The billing webhook arrives from a handful of provider egress IPs and is authenticated by
   * HMAC signature. Rate limiting it means a provider retry storm gets 429'd and payment state
   * silently diverges from reality.
   */
  it("exempts the billing webhook from IP rate limiting entirely", async () => {
    const redisMockInstance = { isReady: true, eval: vi.fn() };
    mockGetRedis.mockReturnValue(redisMockInstance);

    req.path = "/api/v1/billing/webhooks/dodo";

    await rateLimitMiddleware(req as Request, res as Response, next);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(next).toHaveBeenCalled();
    expect(redisMockInstance.eval).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  /**
   * V-096: a load balancer probing from one IP every few seconds must never be 429'd (the
   * instance would be marked unhealthy), and a liveness probe must not depend on Redis at all.
   * Express routing is case-insensitive and non-strict, so every spelling that reaches the
   * health router has to be exempt.
   */
  it.each([
    "/api/v1/health",
    "/api/v1/health/",
    "/api/v1/HEALTH/ready",
    "/api/v1/health/ready",
    "/api/v1/health/ready/",
  ])("exempts the health endpoint %s without touching Redis", async (path) => {
    Object.assign(req, { path, method: "GET" });

    await rateLimitMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockGetRedis).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  /**
   * The operator endpoints are polled by a scraper from one address, so a request carrying the
   * right internal key is exempt. Without it (or with a wrong one) it is rate limited like any
   * other request, so guessing the key stays throttled.
   */
  it.each(["/api/v1/health/metrics", "/api/v1/health/jobs", "/api/v1/Health/Jobs/"])(
    "exempts %s only with the valid internal key",
    async (path) => {
      const redisMockInstance = {
        isReady: true,
        eval: vi.fn().mockResolvedValue([1, 60000, 1, 1]),
      };
      mockGetRedis.mockReturnValue(redisMockInstance);

      Object.assign(req, { path, method: "GET", headers: { "x-internal-key": INTERNAL_KEY } });
      await rateLimitMiddleware(req as Request, res as Response, next);
      expect(redisMockInstance.eval).not.toHaveBeenCalled();

      for (const headers of [{}, { "x-internal-key": "a-wrong-guess" }]) {
        Object.assign(req, { headers });
        await rateLimitMiddleware(req as Request, res as Response, next);
      }
      expect(redisMockInstance.eval).toHaveBeenCalledTimes(2);
      expect(next).toHaveBeenCalledTimes(3);
    },
  );

  it.each(["/api/v1/healthz", "/api/v1/health-x", "/api/v1/health/../admin"])(
    "does not exempt %s, which only shares the health prefix",
    async (path) => {
      const redisMockInstance = {
        isReady: true,
        eval: vi.fn().mockResolvedValue([1, 60000, 1, 1]),
      };
      mockGetRedis.mockReturnValue(redisMockInstance);
      Object.assign(req, { path, method: "GET" });

      await rateLimitMiddleware(req as Request, res as Response, next);

      // Went through the bucket check before being let through.
      expect(mockGetRedis).toHaveBeenCalled();
      expect(redisMockInstance.eval).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledTimes(1);
      expect(redisMockInstance.eval.mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(next).mock.invocationCallOrder[0],
      );
    },
  );

  it("falls back to in-memory storage when Redis fails", async () => {
    mockGetRedis.mockImplementation(() => {
      throw new Error("Redis connection lost");
    });

    // Request 1: should pass
    await rateLimitMiddleware(req as Request, res as Response, next);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(next).toHaveBeenCalled();

    next = vi.fn();
    // Request 2: should pass (limit is 2)
    await rateLimitMiddleware(req as Request, res as Response, next);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(next).toHaveBeenCalled();

    next = vi.fn();
    // Request 3: should fail with 429
    await rateLimitMiddleware(req as Request, res as Response, next);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
  });
});

/**
 * V-087: Express routing is case-insensitive and ignores a trailing slash, so every spelling that
 * reaches a handler has to land in that handler's limit class and in one bucket.
 */
describe("rateLimitMiddleware path normalisation", () => {
  async function routeCall(path: string) {
    const redisMockInstance = {
      isReady: true,
      eval: vi.fn().mockResolvedValue([1, 60000, 1, 900000]),
    };
    mockGetRedis.mockReturnValue(redisMockInstance);

    const req = {
      headers: {},
      ip: "203.0.113.7",
      path,
      method: "POST",
      socket: { remoteAddress: "203.0.113.7" },
    } as unknown as Request;
    const res = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };

    await rateLimitMiddleware(req, res as unknown as Response, vi.fn());

    const [, options] = redisMockInstance.eval.mock.calls[0] as [
      string,
      { keys: string[]; arguments: string[] },
    ];
    return { routeKey: options.keys[0], windowMs: options.arguments[0] };
  }

  // A statement body: `mockReset()` returns the mock, and vitest would call a returned function
  // as the hook's cleanup, invoking whatever implementation the test had installed.
  beforeEach(() => {
    mockGetRedis.mockReset();
  });

  it("puts /api/v1/Contact/ and /api/v1/contact in one bucket with the contact limit", async () => {
    const canonical = await routeCall("/api/v1/contact");
    const shouted = await routeCall("/api/v1/Contact/");

    expect(shouted.routeKey).toBe(canonical.routeKey);
    expect(canonical.routeKey).toBe("rate-limit:POST:/api/v1/contact:203.0.113.7");
    // 1 hour: the contact class, not the 15-minute default a mis-cased path used to get.
    expect(shouted.windowMs).toBe(String(60 * 60 * 1000));
  });

  it("applies the share-verify class to an upper-case, trailing-slash spelling", async () => {
    const canonical = await routeCall("/api/v1/shares/public/alice/my-resume/verify");
    const shouted = await routeCall("/api/v1/SHARES/PUBLIC/Alice/My-Resume/VERIFY/");

    expect(shouted.routeKey).toBe(canonical.routeKey);
    expect(shouted.windowMs).toBe(String(5 * 60 * 1000));
  });

  it("uses 20 per 5 minutes as the share-verify outer bound (the per-link limit is in the handler)", async () => {
    const outcome = async (routeCount: number) => {
      mockGetRedis.mockReturnValue({
        isReady: true,
        eval: vi.fn().mockResolvedValue([routeCount, 120000, 1, 900000]),
      });
      const res = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();
      const req = {
        headers: {},
        ip: "203.0.113.7",
        path: "/api/v1/shares/public/alice/my-resume/verify",
        method: "POST",
        socket: { remoteAddress: "203.0.113.7" },
      } as unknown as Request;
      await rateLimitMiddleware(req, res as unknown as Response, next);
      return { passed: next.mock.calls.length === 1, res };
    };

    expect((await outcome(20)).passed).toBe(true);
    const over = await outcome(21);
    expect(over.passed).toBe(false);
    expect(over.res.status).toHaveBeenCalledWith(429);
  });
});

/**
 * V-162: the per-route key used to be built from the raw path, so every random 404 path made a
 * new Redis key for the whole window. A path no route answers now shares one `unmatched` bucket
 * per client, in the generic class.
 */
describe("rateLimitMiddleware unmatched paths", () => {
  function appUnderTest() {
    const app = express();
    app.use(rateLimitMiddleware);
    const things = Router();
    things.get("/:id", (_req, res) => res.json({ ok: true }));
    things.route("/:id/parts").get((_req, res) => res.json({ ok: true }));
    app.use("/api/v1/things", things);
    app.post("/api/v1/contact", (_req, res) => res.json({ ok: true }));
    return app;
  }

  async function keysFor(method: "get" | "post" | "head", path: string) {
    const evalFn = vi.fn().mockResolvedValue([1, 60000, 1, 900000]);
    mockGetRedis.mockReturnValue({ isReady: true, eval: evalFn });
    await request(appUnderTest())[method](path);
    const [, options] = evalFn.mock.calls[0] as [string, { keys: string[]; arguments: string[] }];
    return { routeKey: options.keys[0]!, windowMs: options.arguments[0] };
  }

  beforeEach(() => {
    mockGetRedis.mockReset();
  });

  it("keys a matched route on its pattern, so parameter values share one bucket (V-162)", async () => {
    const { routeKey } = await keysFor("get", "/api/v1/things/widget");
    expect(routeKey).toMatch(/^rate-limit:GET:\/api\/v1\/things\/:id:/);
    expect((await keysFor("get", "/api/v1/things/another-value")).routeKey).toBe(routeKey);
    expect((await keysFor("get", "/api/v1/things/widget/parts")).routeKey).toMatch(
      /^rate-limit:GET:\/api\/v1\/things\/:id\/parts:/,
    );
    // HEAD is answered by the GET route.
    expect((await keysFor("head", "/api/v1/things/widget")).routeKey).toMatch(
      /^rate-limit:HEAD:\/api\/v1\/things\/:id:/,
    );
  });

  it("keys an auth request by the better-auth endpoint it reaches, and an unknown one as unmatched (V-162)", async () => {
    const app = express();
    app.locals.authEndpointPaths = ["/sign-in/email-otp", "/get-session", "/callback/:id"];
    app.use(rateLimitMiddleware);
    app.all(["/api/v1/auth", "/api/v1/auth/*"], (_req, res) => res.json({ ok: true }));
    const evalFn = vi.fn().mockResolvedValue([1, 60000, 1, 900000]);
    mockGetRedis.mockReturnValue({ isReady: true, eval: evalFn });
    const keyFor = async (path: string) => {
      evalFn.mockClear();
      await request(app).post(path);
      return (evalFn.mock.calls[0]![1] as { keys: string[] }).keys[0]!;
    };

    // Two endpoints, two buckets: sign-in is not spent by session reads.
    expect(await keyFor("/api/v1/auth/sign-in/email-otp")).toMatch(
      /^rate-limit:POST:\/api\/v1\/auth\/sign-in\/email-otp:/,
    );
    expect(await keyFor("/api/v1/auth/get-session")).toMatch(
      /^rate-limit:POST:\/api\/v1\/auth\/get-session:/,
    );
    // A parameterised endpoint keys on its pattern, so provider names share one bucket.
    expect(await keyFor("/api/v1/auth/callback/google")).toBe(
      await keyFor("/api/v1/auth/callback/github"),
    );
    // Anything else under /auth is one bucket per client, not a key per random value.
    expect(await keyFor("/api/v1/auth/a-random-value")).toMatch(/^rate-limit:unmatched:/);
    expect(await keyFor("/api/v1/auth/another/deeper/path")).toMatch(/^rate-limit:unmatched:/);
  });

  it("puts every path no route answers in one bucket per client, in the generic class", async () => {
    const random = await keysFor("get", `/api/v1/${"x".repeat(2000)}`);
    const other = await keysFor("get", "/wp-admin/setup-config.php");
    const deeper = await keysFor("get", "/api/v1/things/widget/parts/extra");
    const wrongMethod = await keysFor("post", "/api/v1/things/widget");
    // Under a class prefix, but no route: still the generic class, not the contact one.
    const contactish = await keysFor("post", "/api/v1/contact/anything");

    const client = random.routeKey.split(":").pop();
    for (const outcome of [random, other, deeper, wrongMethod, contactish]) {
      expect(outcome.routeKey).toBe(`rate-limit:unmatched:${client}`);
      expect(outcome.windowMs).toBe("60000");
    }
  });
});

/**
 * V-038: the ATS routes that spend AI credits belong to the AI class (`config.ai.rateLimit*`),
 * not the generic one they used to fall into because only `/api/v1/ai` was matched.
 */
describe("rateLimitMiddleware AI class", () => {
  async function outcome(path: string, routeCount: number) {
    mockGetRedis.mockReturnValue({
      isReady: true,
      eval: vi.fn().mockResolvedValue([routeCount, 60000, 1, 900000]),
    });
    const res = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    const req = {
      headers: {},
      ip: "203.0.113.7",
      path,
      method: "POST",
      socket: { remoteAddress: "203.0.113.7" },
    } as unknown as Request;
    await rateLimitMiddleware(req, res as unknown as Response, next);
    return next.mock.calls.length === 1;
  }

  // A statement body: `mockReset()` returns the mock, and vitest would call a returned function
  // as the hook's cleanup, invoking whatever implementation the test had installed.
  beforeEach(() => {
    mockGetRedis.mockReset();
  });

  // The mocked AI class allows 3; the generic class 5. A 4th request tells them apart.
  it.each(["/api/v1/ats/analyze", "/api/v1/ats/convert-resume", "/api/v1/ai/generate"])(
    "limits %s at the AI class ceiling",
    async (path) => {
      expect(await outcome(path, 3)).toBe(true);
      expect(await outcome(path, 4)).toBe(false);
    },
  );

  it("leaves the free ATS routes in the generic class", async () => {
    expect(await outcome("/api/v1/ats/check", 4)).toBe(true);
    expect(await outcome("/api/v1/ats/extract", 5)).toBe(true);
    expect(await outcome("/api/v1/ats/check", 6)).toBe(false);
  });
});

/**
 * V-160: without Redis the per-process map multiplies every limit by the number of workers. The
 * classes that guard a password guess, an outbound mail or an OTP answer 503 instead, and the
 * degradation is logged once per transition rather than silently or on every request.
 */
describe("rateLimitMiddleware without Redis", () => {
  const warn = logger.warn as ReturnType<typeof vi.fn>;

  function call(path: string) {
    const res = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    const req = {
      headers: {},
      ip: "203.0.113.8",
      path,
      method: "POST",
      socket: { remoteAddress: "203.0.113.8" },
    } as unknown as Request;
    return rateLimitMiddleware(req, res as unknown as Response, next).then(() => ({
      passed: next.mock.calls.length === 1,
      status: (res.status.mock.calls[0] as [number] | undefined)?.[0],
      retryAfter: (res.set.mock.calls[0] as [string, string] | undefined)?.[1],
    }));
  }

  const transitions = () =>
    warn.mock.calls.map(([message]) => String(message)).filter((m) => /rate limiter/i.test(m));

  beforeEach(async () => {
    mockGetRedis.mockReset();
    // Start from a healthy limiter so the transition under test is the only one recorded.
    mockGetRedis.mockReturnValue({
      isReady: true,
      eval: vi.fn().mockResolvedValue([1, 60000, 1, 900000]),
    });
    await call("/api/v1/documents");
    warn.mockClear();
    mockGetRedis.mockImplementation(() => {
      throw new Error("Redis client not ready");
    });
  });

  it.each([
    "/api/v1/shares/public/alice/my-resume/verify",
    "/api/v1/contact",
    "/api/v1/auth/email-otp/send-verification-otp",
    "/api/v1/auth/email-otp/request-password-reset",
  ])("fails %s closed with 503 and Retry-After", async (path) => {
    const result = await call(path);
    expect(result.passed).toBe(false);
    expect(result.status).toBe(503);
    expect(result.retryAfter).toBe("5");
  });

  it("still serves the other classes from the per-process map", async () => {
    expect((await call("/api/v1/auth/sign-in")).passed).toBe(true);
    expect((await call("/api/v1/documents")).passed).toBe(true);
  });

  it("logs the fallback once, and the recovery once", async () => {
    await call("/api/v1/documents");
    await call("/api/v1/contact");
    await call("/api/v1/documents");
    expect(transitions()).toHaveLength(1);
    expect(transitions()[0]).toMatch(/memory/i);

    mockGetRedis.mockReturnValue({
      isReady: true,
      eval: vi.fn().mockResolvedValue([1, 60000, 1, 900000]),
    });
    await call("/api/v1/documents");
    await call("/api/v1/documents");
    expect(transitions()).toHaveLength(2);
    expect(transitions()[1]).toMatch(/recovered/i);
  });
});

/** V-038: at most two provider calls in flight per user, counted in Redis for the deadline. */
describe("withAiSlot", () => {
  function redisWithCount(count: number) {
    const exec = vi.fn().mockResolvedValue([count, 1]);
    const chain = { incr: vi.fn(), expire: vi.fn(), exec };
    chain.incr.mockReturnValue(chain);
    chain.expire.mockReturnValue(chain);
    const redis = { isReady: true, multi: vi.fn(() => chain), eval: vi.fn().mockResolvedValue(0) };
    mockGetRedis.mockReturnValue(redis);
    return { redis, chain };
  }

  // A statement body: `mockReset()` returns the mock, and vitest would call a returned function
  // as the hook's cleanup, invoking whatever implementation the test had installed.
  beforeEach(() => {
    mockGetRedis.mockReset();
  });

  it("runs the work inside a slot and releases it afterwards", async () => {
    const { redis, chain } = redisWithCount(1);
    const work = vi.fn(async () => "done");

    expect(await withAiSlot("user-1", work)).toBe("done");

    expect(chain.incr).toHaveBeenCalledWith("ai:in-flight:user-1");
    // Deadline (85 s) + the longest job fetch (80 s) + margin: a crashed worker's slot outlives
    // nothing it could have been held for.
    expect(chain.expire).toHaveBeenCalledWith("ai:in-flight:user-1", 170, "NX");
    expect(redis.eval).toHaveBeenCalledTimes(1);
  });

  it("releases the slot when the work throws", async () => {
    const { redis } = redisWithCount(2);

    await expect(
      withAiSlot("user-1", async () => Promise.reject(new Error("boom"))),
    ).rejects.toThrow("boom");
    expect(redis.eval).toHaveBeenCalledTimes(1);
  });

  it("refuses a call past the cap with 429 before any work runs", async () => {
    const { redis } = redisWithCount(AI_IN_FLIGHT_MAX + 1);
    const work = vi.fn(async () => "done");

    await expect(withAiSlot("user-1", work)).rejects.toMatchObject({
      statusCode: 429,
      message: expect.stringMatching(/in progress/i),
      details: { retryAfterSeconds: expect.any(Number) },
    });
    expect(work).not.toHaveBeenCalled();
    // The over-count increment is undone so the user is not locked out by their own refusal.
    expect(redis.eval).toHaveBeenCalledTimes(1);
  });

  it("runs the work uncounted when Redis is unavailable", async () => {
    mockGetRedis.mockImplementation(() => {
      throw new Error("Redis client not ready");
    });
    const work = vi.fn(async () => "done");

    expect(await withAiSlot("user-1", work)).toBe("done");
  });
});

/** The server's own apps post stats with the internal key; they must not share the public class. */
describe("rateLimitMiddleware internal stats requests", () => {
  async function outcome(headers: Record<string, string>, routeCount: number) {
    mockGetRedis.mockReturnValue({
      isReady: true,
      eval: vi.fn().mockResolvedValue([routeCount, 60000, 1, 900000]),
    });
    const res = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    const req = {
      headers,
      ip: "203.0.113.9",
      path: "/api/v1/stats/events",
      method: "POST",
      socket: { remoteAddress: "203.0.113.9" },
    } as unknown as Request;
    await rateLimitMiddleware(req, res as unknown as Response, next);
    return next.mock.calls.length === 1;
  }

  beforeEach(() => {
    mockGetRedis.mockReset();
  });

  it("keeps anonymous posts in the 15-per-minute class", async () => {
    expect(await outcome({}, 15)).toBe(true);
    expect(await outcome({}, 16)).toBe(false);
    expect(await outcome({ "x-internal-key": "wrong" }, 16)).toBe(false);
  });

  // The mocked generic class allows 5, the stats class 15: a 6th request tells them apart.
  it("moves a request with the internal key to the generic class", async () => {
    const internal = { "x-internal-key": "test-stats-internal-key" };
    expect(await outcome(internal, 5)).toBe(true);
    expect(await outcome(internal, 6)).toBe(false);
    expect(await outcome({}, 6)).toBe(true);
  });
});

describe("withAiSlot on a Redis that cannot count", () => {
  beforeEach(() => {
    mockGetRedis.mockReset();
  });

  it("undoes the increment best-effort and runs the work uncounted when exec fails", async () => {
    const exec = vi.fn().mockRejectedValue(new Error("ERR syntax error"));
    const chain = { incr: vi.fn(), expire: vi.fn(), exec };
    chain.incr.mockReturnValue(chain);
    chain.expire.mockReturnValue(chain);
    const redis = { isReady: true, multi: vi.fn(() => chain), eval: vi.fn().mockResolvedValue(0) };
    mockGetRedis.mockReturnValue(redis);
    const work = vi.fn(async () => "done");

    expect(await withAiSlot("user-1", work)).toBe("done");
    expect(redis.eval).toHaveBeenCalledTimes(1);
    expect(work).toHaveBeenCalledTimes(1);
  });
});

describe("rateLimitMiddleware on a stalled Redis (V-095)", () => {
  function call(path: string, method = "POST") {
    const res = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    const req = {
      headers: {},
      ip: "203.0.113.20",
      path,
      method,
      socket: { remoteAddress: "203.0.113.20" },
    } as unknown as Request;
    return rateLimitMiddleware(req, res as unknown as Response, next).then(() => ({
      passed: next.mock.calls.length === 1,
      status: (res.status.mock.calls[0] as [number] | undefined)?.[0],
    }));
  }

  beforeEach(() => {
    mockGetRedis.mockReset();
    // Connected, but the reply never comes.
    mockGetRedis.mockReturnValue({ isReady: true, eval: vi.fn(() => new Promise(() => {})) });
  });

  it("stops waiting after the timeout and counts the request in memory", async () => {
    const started = Date.now();
    const result = await call("/api/v1/documents", "GET");
    expect(result.passed).toBe(true);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("keeps a fail-closed class closed: 503", async () => {
    expect((await call("/api/v1/contact")).status).toBe(503);
  });
});

describe("autosave class (V-130)", () => {
  beforeEach(() => mockGetRedis.mockReset());

  it("counts PATCH /documents/:id only in the global bucket at the IP limiter", async () => {
    const evalFn = vi.fn().mockResolvedValue([1, 900000]);
    mockGetRedis.mockReturnValue({ isReady: true, eval: evalFn });
    const next = vi.fn();
    const req = {
      headers: {},
      ip: "203.0.113.30",
      path: "/api/v1/documents/doc_abc123def456",
      method: "PATCH",
      socket: { remoteAddress: "203.0.113.30" },
    } as unknown as Request;

    await rateLimitMiddleware(req, { set: vi.fn() } as unknown as Response, next);

    expect(next).toHaveBeenCalled();
    expect(evalFn.mock.calls[0][1].keys).toEqual(["rate-limit:global:203.0.113.30"]);
  });

  it("keys on the user and answers 429 with Retry-After past 600", async () => {
    const evalFn = vi.fn().mockResolvedValue([601, 42_000]);
    mockGetRedis.mockReturnValue({ isReady: true, eval: evalFn });
    const res = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    const req = {
      headers: {},
      ip: "203.0.113.31",
      path: "/api/v1/documents/doc_1",
      method: "PATCH",
      socket: { remoteAddress: "203.0.113.31" },
      authUser: { id: "user_1", email: null, name: null },
    } as unknown as Request;

    await autosaveRateLimit(req, res as unknown as Response, next);

    expect(evalFn.mock.calls[0][1].keys).toEqual(["rate-limit:autosave:user:user_1"]);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.set).toHaveBeenCalledWith("Retry-After", "42");
  });
});

// Last in the file: it opens the module-level breaker, then closes it again.
describe("rateLimitMiddleware circuit breaker (V-095)", () => {
  const call = () => {
    const req = {
      headers: {},
      ip: "203.0.113.40",
      path: "/api/v1/documents",
      method: "GET",
      socket: { remoteAddress: "203.0.113.40" },
    } as unknown as Request;
    const next = vi.fn();
    return rateLimitMiddleware(req, { set: vi.fn() } as unknown as Response, next).then(
      () => next.mock.calls.length === 1,
    );
  };

  it("skips Redis for 5 s after 3 timeouts in a row, then tries again", async () => {
    const stalled = vi.fn(() => new Promise(() => {}));
    mockGetRedis.mockReset();
    mockGetRedis.mockReturnValue({ isReady: true, eval: stalled });
    for (let i = 0; i < 3; i += 1) expect(await call()).toBe(true);
    expect(stalled).toHaveBeenCalledTimes(3);

    // Open: answered from memory without asking Redis.
    expect(await call()).toBe(true);
    expect(stalled).toHaveBeenCalledTimes(3);

    const healthy = vi.fn().mockResolvedValue([1, 60000, 1, 900000]);
    mockGetRedis.mockReturnValue({ isReady: true, eval: healthy });
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now + 6_000);
    expect(await call()).toBe(true);
    clock.mockRestore();
    expect(healthy).toHaveBeenCalledTimes(1);
  });
});
