import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, client } = vi.hoisted(() => {
  const client = {
    isOpen: true,
    isReady: true,
    on: vi.fn(),
    connect: vi.fn(async () => undefined),
    destroy: vi.fn(),
    quit: vi.fn(async () => undefined),
    get: vi.fn(async () => JSON.stringify({ cached: true })),
  };
  return { client, createClient: vi.fn(() => client) };
});

vi.mock("redis", () => ({ createClient }));
vi.mock("#config", () => ({ config: { redis: { url: "redis://localhost:6379" } } }));

const { cacheGet, closeRedis, getRedis, initRedis } = await import("../../src/lib/redis.js");

describe("Redis client during an outage", () => {
  beforeEach(async () => {
    await closeRedis();
    client.isOpen = true;
    client.isReady = true;
    await initRedis();
  });

  it("fails commands at once while disconnected instead of queueing them", () => {
    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({ disableOfflineQueue: true }),
    );
  });

  it("is unusable while reconnecting, though the socket still counts as open", async () => {
    client.isReady = false;

    expect(() => getRedis()).toThrow("Redis client not ready");
    expect(await cacheGet("key")).toBeNull();
    expect(client.get).not.toHaveBeenCalled();
  });

  it("serves commands again once ready", async () => {
    // A bounded wrapper (V-095) around the same client.
    expect(getRedis().isReady).toBe(true);
    expect(await getRedis().get("key")).toBe(JSON.stringify({ cached: true }));
    expect(await cacheGet("key")).toEqual({ cached: true });
  });
});
