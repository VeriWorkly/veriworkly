import { EventEmitter } from "node:events";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * V-331: an idle extraction child that dies from outside disconnects before it exits. An upload
 * in between forks a new child; the old child's late `exit` must not recycle the new one and fail
 * that upload.
 */

class FakeChild extends EventEmitter {
  connected = true;
  killed = false;
  sent: Array<{ id: number }> = [];
  send(message: { id: number }) {
    this.sent.push(message);
    return true;
  }
  kill() {
    this.killed = true;
    this.connected = false;
    return true;
  }
}

const children: FakeChild[] = [];
vi.mock("node:child_process", () => ({
  fork: vi.fn(() => {
    const child = new FakeChild();
    children.push(child);
    return child;
  }),
}));
vi.mock("node:module", () => ({
  createRequire: () => ({ resolve: () => "/fake/ats-engine/node/child.js" }),
}));
vi.mock("#lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { extractInChildProcess, stopExtractPool } =
  await import("../../src/services/ats/extractPool.js");

afterEach(() => stopExtractPool());

describe("extract pool and a replaced child's late exit", () => {
  it("ignores the old child's exit and serves the upload on the new one", async () => {
    // First upload: child #1 starts and answers.
    const first = extractInChildProcess("pdf", Buffer.from("one"));
    const one = children[0]!;
    one.emit("message", { id: one.sent[0]!.id, ok: true, text: "first" });
    await expect(first).resolves.toMatchObject({ text: "first" });

    // Killed from outside while idle: the IPC channel goes first.
    one.connected = false;

    // The next upload forks child #2 before #1's exit arrives.
    const second = extractInChildProcess("pdf", Buffer.from("two"));
    const two = children[1]!;
    expect(two).toBeDefined();

    one.emit("exit", null, "SIGKILL");
    expect(two.killed).toBe(false);

    two.emit("message", { id: two.sent[0]!.id, ok: true, text: "second" });
    await expect(second).resolves.toMatchObject({ text: "second" });
  });
});
