import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * S-397: the owner opening their own link from the share modal ("Open link") is not a view. The
 * studio render forwards the owner's session cookie, so the public read can tell.
 */

const { recordShareView, getSessionUserFromRequest } = vi.hoisted(() => ({
  recordShareView: vi.fn(async () => undefined),
  getSessionUserFromRequest: vi.fn(),
}));

vi.mock("#services/shareService", () => ({
  ShareService: {
    recordShareView,
    isExpired: () => false,
    getPublicShareLinkByUsernameAndSlug: vi.fn(async () => ({
      id: "link-1",
      userId: "owner-1",
      slug: "resume",
      passwordHash: null,
      expiresAt: null,
      allowDownload: true,
      snapshot: {},
      document: { title: "Resume", slug: "resume" },
    })),
  },
}));

vi.mock("#middleware/auth", () => ({ requireAuthUser: vi.fn(), getSessionUserFromRequest }));

vi.mock("#lib/redis", () => ({
  cacheGet: vi.fn(async () => null),
  cacheSet: vi.fn(async () => undefined),
  cacheDel: vi.fn(async () => undefined),
}));

vi.mock("#lib/cacheGeneration", () => ({
  bumpGeneration: vi.fn(async () => undefined),
  resolveGenerationalKey: vi.fn(async () => "share:g0:resume"),
}));

vi.mock("#utils/requestIp", () => ({
  addressBucket: (ip: string) => ip,
  getRequestIpDetails: () => ({ resolvedIp: "1.2.3.4" }),
  getRequestUserAgent: () => "Mozilla/5.0",
}));

import { ShareController } from "../../src/controllers/shareController.js";

async function openLink() {
  const req = { params: { username: "jane", slug: "resume" }, headers: {} } as unknown as Request;
  const res = { json: vi.fn(), set: vi.fn() } as unknown as Response;
  const next = vi.fn() as NextFunction;

  await ShareController.getPublicReadable(req, res, next);
  // The view is recorded after the response, off the request's path.
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(next).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalled();
}

describe("S-397 the owner's own visit is not a view", () => {
  beforeEach(() => {
    recordShareView.mockClear();
  });

  it("S-397 the owner opening their link records nothing", async () => {
    getSessionUserFromRequest.mockResolvedValue({ id: "owner-1", email: null, name: null });

    await openLink();

    expect(recordShareView).not.toHaveBeenCalled();
  });

  it("S-397 a signed-out visitor and another signed-in user are counted", async () => {
    getSessionUserFromRequest.mockResolvedValueOnce(null);
    await openLink();
    getSessionUserFromRequest.mockResolvedValueOnce({
      id: "someone-else",
      email: null,
      name: null,
    });
    await openLink();

    expect(recordShareView).toHaveBeenCalledTimes(2);
  });

  it("S-397 a session store outage still counts the view: the reader is not taken for the owner", async () => {
    getSessionUserFromRequest.mockRejectedValueOnce(new Error("auth store unavailable"));

    await openLink();

    expect(recordShareView).toHaveBeenCalledTimes(1);
  });
});
