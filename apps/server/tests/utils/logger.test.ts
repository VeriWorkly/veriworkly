import { afterEach, describe, expect, it, vi } from "vitest";

import { logger } from "#lib/logger";

const previousEnv = process.env.NODE_ENV;

function captureProductionLine(write: () => void) {
  const chunks: string[] = [];
  const capture = (chunk: unknown) => {
    chunks.push(String(chunk));
    return true;
  };
  vi.spyOn(process.stdout, "write").mockImplementation(capture);
  vi.spyOn(process.stderr, "write").mockImplementation(capture);

  process.env.NODE_ENV = "production";
  try {
    write();
  } finally {
    process.env.NODE_ENV = previousEnv;
  }
  return JSON.parse(chunks.join(""));
}

afterEach(() => {
  vi.restoreAllMocks();
});

/** V-159: an Error anywhere in the meta used to serialise as `{}` in production. */
describe("logger in production", () => {
  it("serialises an Error nested in the meta", () => {
    const line = captureProductionLine(() =>
      logger.warn("audit write failed", { action: "X", error: new Error("boom") }),
    );

    expect(line.data.action).toBe("X");
    expect(line.data.error).toMatchObject({ name: "Error", message: "boom" });
    expect(line.data.error.stack).toContain("boom");
  });

  it("serialises the cause chain and own properties such as a Prisma code", () => {
    const error = Object.assign(new Error("outer", { cause: new TypeError("inner") }), {
      code: "P2002",
    });

    const line = captureProductionLine(() => logger.error("failed", { deep: { error } }));

    expect(line.data.deep.error).toMatchObject({ message: "outer", code: "P2002" });
    expect(line.data.deep.error.cause).toMatchObject({ name: "TypeError", message: "inner" });
  });

  it("writes a cause cycle as [Circular] instead of overflowing the stack", () => {
    const a = new Error("a");
    const b = new Error("b", { cause: a });
    a.cause = b;

    const line = captureProductionLine(() => logger.error("cycle", { error: a }));

    expect(line.data.error.message).toBe("a");
    expect(line.data.error.cause.message).toBe("b");
    expect(line.data.error.cause.cause).toBe("[Circular]");
  });

  it("writes a self-reference on an Error as [Circular]", () => {
    const error = new Error("self") as Error & { self?: unknown };
    error.self = error;

    const line = captureProductionLine(() => logger.error("self", error));

    expect(line.error).toMatchObject({ message: "self", self: "[Circular]" });
  });

  it("stops a long cause chain at depth 5", () => {
    let error = new Error("e0");
    for (let i = 1; i <= 8; i += 1) error = new Error(`e${i}`, { cause: error });

    const line = captureProductionLine(() => logger.error("chain", error));

    let node = line.error;
    for (let i = 0; i < 5; i += 1) node = node.cause;
    expect(node.message).toBe("e3");
    expect(node.cause).toBe("[Cause chain truncated]");
  });

  it("drops request/PII-bearing error keys and truncates long strings", () => {
    const error = Object.assign(new Error("duplicate key"), {
      code: "23505",
      detail: "Key (email)=(jane@example.com) already exists.",
      headers: { authorization: "Bearer secret" },
      config: { url: "https://x" },
      request: {},
      response: { body: "x" },
      blob: "y".repeat(10_000),
    });

    const line = captureProductionLine(() => logger.error("pg", { error }));
    const out = line.data.error;

    expect(out.code).toBe("23505");
    for (const key of ["detail", "headers", "config", "request", "response"])
      expect(out).not.toHaveProperty(key);
    expect(JSON.stringify(line)).not.toContain("jane@example.com");
    expect(out.blob.length).toBeLessThan(4200);
    expect(out.blob).toContain("[truncated");
  });

  it("still writes one parseable line with the message when the data cannot be serialised", () => {
    const line = captureProductionLine(() => logger.warn("bigint", { n: BigInt(1) }));

    expect(line).toMatchObject({
      level: "WARN",
      message: "bigint",
      data: "[Unserializable Data]",
    });
    expect(typeof line.timestamp).toBe("string");
  });

  it("still unwraps a top-level Error and leaves plain objects alone", () => {
    const top = captureProductionLine(() => logger.error("top", new Error("direct")));
    expect(top.error).toMatchObject({ name: "Error", message: "direct" });

    const plain = captureProductionLine(() => logger.info("plain", { a: { b: [1, 2] } }));
    expect(plain.data).toEqual({ a: { b: [1, 2] } });
  });
});

/** V-255: customer email addresses never reach a log line, whatever the caller passes. */
describe("logger masks recipients", () => {
  it("masks an email in the message, in nested meta, in arrays and in an error message", () => {
    const line = captureProductionLine(() =>
      logger.error("send to jane.doe@example.com failed", {
        to: "jane.doe@example.com",
        nested: { list: ["bob+tag@mail.example.co.uk"] },
        error: new Error("550 mailbox jane.doe@example.com unavailable"),
      }),
    );
    const text = JSON.stringify(line);

    expect(text).not.toContain("jane.doe");
    expect(text).not.toContain("bob+tag");
    expect(line.message).toBe("send to j***@e***.com failed");
    expect(line.data.to).toBe("j***@e***.com");
    expect(line.data.nested.list[0]).toBe("b***@m***.uk");
    expect(line.data.error.message).toContain("j***@e***.com");
  });

  it("keeps only the origin of a referer", () => {
    const line = captureProductionLine(() =>
      logger.warn("rejected", {
        referer: "https://evil.example/reset?email=jane@example.com&token=abc",
      }),
    );

    expect(line.data.referer).toBe("https://evil.example");
  });

  it("masks in the development format too", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("Admin user created for auth", { email: "admin@veriworkly.com" });

    expect(JSON.stringify(spy.mock.calls)).not.toContain("admin@veriworkly.com");
  });
});

describe("better-auth's own logs (V-255)", () => {
  it("go through the masking logger", async () => {
    const { betterAuthLogger } = await import("#auth/authLogger");
    const line = captureProductionLine(() =>
      betterAuthLogger.log("error", "Failed to send OTP to jane.doe@example.com", {
        email: "jane.doe@example.com",
      }),
    );

    expect(JSON.stringify(line)).not.toContain("jane.doe");
    expect(line.level).toBe("ERROR");
    expect(line.message).toBe("[better-auth] Failed to send OTP to j***@e***.com");
  });
});
