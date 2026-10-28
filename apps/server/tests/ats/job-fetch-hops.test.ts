import { EventEmitter } from "node:events";

import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * V-385: what happens after the first URL passed `validateUrl`. `node:https`'s `request` is
 * replaced by a scripted server, so each case runs the real redirect loop, size cap and
 * content-type check without a network. The hosts are public literal IPs (no DNS lookup).
 */
type Reply = { status: number; headers?: Record<string, string>; chunks?: Buffer[] };

const replies: Reply[] = [];
const calls: { url: string; signal: AbortSignal | undefined }[] = [];

const request = vi.hoisted(() => vi.fn());
vi.mock("node:https", () => ({ request }));
vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
vi.mock("#lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { AtsJobFetchService } = await import("#services/ats/jobFetch");

const PAGE = `<html><body><main>${"Senior engineer building payment systems. ".repeat(10)}</main></body></html>`;

beforeEach(() => {
  replies.length = 0;
  calls.length = 0;
  request.mockImplementation(
    (url: URL, options: { signal?: AbortSignal }, onResponse: (response: EventEmitter) => void) => {
      calls.push({ url: url.toString(), signal: options.signal });
      const reply = replies.shift() ?? { status: 500 };
      const req = Object.assign(new EventEmitter(), {
        setTimeout: vi.fn(),
        destroy: vi.fn(),
        end: () => {
          const response = Object.assign(new EventEmitter(), {
            statusCode: reply.status,
            headers: reply.headers ?? {},
            destroy: vi.fn(),
          });
          onResponse(response);
          setImmediate(() => {
            for (const chunk of reply.chunks ?? []) response.emit("data", chunk);
            response.emit("end");
          });
        },
      });
      return req;
    },
  );
});

const redirectTo = (location: string): Reply => ({ status: 302, headers: { location } });

describe("AtsJobFetchService after the first hop (V-385)", () => {
  it("re-checks a redirect target and refuses a blocked address after one request", async () => {
    replies.push(redirectTo("https://169.254.169.254/latest/meta-data/"));

    await expect(AtsJobFetchService.fetch("https://93.184.216.34/job")).rejects.toThrow(
      /blocked network/i,
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("follows at most three redirects", async () => {
    for (let hop = 1; hop <= 4; hop += 1) replies.push(redirectTo(`https://93.184.216.34/${hop}`));

    await expect(AtsJobFetchService.fetch("https://93.184.216.34/job")).rejects.toThrow(
      "Job page redirect limit exceeded.",
    );
    expect(request).toHaveBeenCalledTimes(4);
  });

  it("spends one deadline across every hop, not a fresh one per hop", async () => {
    replies.push(redirectTo("https://93.184.216.34/next"), {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
      chunks: [Buffer.from(PAGE)],
    });

    await expect(AtsJobFetchService.fetch("https://93.184.216.34/job")).resolves.toContain(
      "payment systems",
    );
    expect(calls).toHaveLength(2);
    expect(calls[0].signal).toBeInstanceOf(AbortSignal);
    expect(calls[1].signal).toBe(calls[0].signal);
  });

  it("refuses a body over 2 MB, declared or streamed", async () => {
    replies.push({
      status: 200,
      headers: { "content-type": "text/html", "content-length": String(3 * 1024 * 1024) },
    });
    await expect(AtsJobFetchService.fetch("https://93.184.216.34/job")).rejects.toThrow(
      "Job page exceeds the download limit.",
    );

    const megabyte = Buffer.alloc(1024 * 1024, "a");
    replies.push({
      status: 200,
      headers: { "content-type": "text/html" },
      chunks: [megabyte, megabyte, Buffer.from("one byte too many")],
    });
    await expect(AtsJobFetchService.fetch("https://93.184.216.34/job")).rejects.toThrow(
      "Job page exceeds the download limit.",
    );
  });

  it("refuses a page that is not HTML or plain text", async () => {
    replies.push({
      status: 200,
      headers: { "content-type": "application/pdf" },
      chunks: [Buffer.from(PAGE)],
    });

    await expect(AtsJobFetchService.fetch("https://93.184.216.34/job")).rejects.toThrow(
      "Job page must be HTML or plain text.",
    );
  });
});
