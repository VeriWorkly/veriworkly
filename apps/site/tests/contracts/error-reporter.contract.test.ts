import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEDUPE_WINDOW_MS,
  MAX_IN_FLIGHT,
  RECEIVER_BACKOFF_MS,
  createErrorReporter,
} from "@/lib/error-reporter";

/** During an outage every uncached render throws the same error: reports must not grow with requests. */

const error = (digest = "d1", path = "/changelog/v1") => ({
  name: "ApiRequestError",
  message: "Could not reach the backend.",
  digest,
  path,
  method: "GET",
  routePath: "/changelog/[id]",
  routeType: "render",
});

describe("server error reports", () => {
  afterEach(() => vi.useRealTimers());

  it("reports one error once per window, then with the count it dropped", async () => {
    let now = 0;
    const send = vi.fn(async () => new Response(null, { status: 204 }));
    const log = vi.fn();
    const report = createErrorReporter({ reportUrl: "https://r.test", now: () => now, send, log });

    for (let i = 0; i < 50; i++) await report(error());
    expect(send).toHaveBeenCalledTimes(1);

    now += DEDUPE_WINDOW_MS;
    await report(error());
    expect(send).toHaveBeenCalledTimes(2);
    const [, init] = send.mock.calls[1] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({ suppressed: 49 });
  });

  it("keeps at most a few reports in flight and drops the rest", async () => {
    const pending: Array<() => void> = [];
    const send = vi.fn(
      () => new Promise<Response>((resolve) => pending.push(() => resolve(new Response(null)))),
    );
    const report = createErrorReporter({ reportUrl: "https://r.test", send, log: vi.fn() });

    const calls = Array.from({ length: 30 }, (_, i) => report(error(`d${i}`)));
    expect(send).toHaveBeenCalledTimes(MAX_IN_FLIGHT);

    pending.forEach((resolve) => resolve());
    await Promise.all(calls);
  });

  it("writes one 'report failed' line while the receiver is down, not one per error", async () => {
    let now = 0;
    const send = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    const log = vi.fn();
    const report = createErrorReporter({ reportUrl: "https://r.test", now: () => now, send, log });

    for (let i = 0; i < 10; i++) await report(error(`d${i}`));

    expect(send).toHaveBeenCalledTimes(1);
    expect(log.mock.calls.filter(([line]) => String(line).includes("report failed"))).toHaveLength(
      1,
    );

    now += RECEIVER_BACKOFF_MS;
    await report(error("later"));
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("cuts the path and message to a bounded size", async () => {
    const log = vi.fn();
    const report = createErrorReporter({ log });

    await report({ ...error("long", `/${"a".repeat(5000)}`), message: "m".repeat(5000) });

    const line = JSON.parse(String(log.mock.calls[0]![1]));
    expect(line.path).toHaveLength(256);
    expect(line.message).toHaveLength(500);
  });

  it("instrumentation.ts sends every report through the budget", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const source = readFileSync(join(__dirname, "..", "..", "instrumentation.ts"), "utf8");

    expect(source).toContain("createErrorReporter(");
    expect(source).not.toMatch(/\bfetch\(/);
  });
});
