import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "#lib/logger";
import { recordClientError } from "../../src/routes/clientErrors.js";

vi.mock("#lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

function call(body: unknown) {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  };
  const req = { body, get: () => "Mozilla/5.0" } as unknown as Request;
  recordClientError(req, res as unknown as Response, vi.fn());
  return res;
}

describe("POST /client-errors", () => {
  beforeEach(() => vi.clearAllMocks());

  it("logs a site crash at warn and answers 204", () => {
    const res = call({
      app: "site",
      message: "boom",
      digest: "123",
      url: "https://veriworkly.com/",
    });

    expect(res.status).toHaveBeenCalledWith(204);
    expect(logger.warn).toHaveBeenCalledWith(
      "[client-error]",
      expect.objectContaining({ app: "site", message: "boom", userAgent: "Mozilla/5.0" }),
    );
  });

  it("refuses unknown apps, unknown fields and oversized text without logging", () => {
    for (const body of [
      { app: "studio", message: "x" },
      { app: "site", message: "x", extra: 1 },
      { app: "site", message: "x".repeat(501) },
      { app: "site", message: "" },
    ]) {
      expect(call(body).status).toHaveBeenCalledWith(400);
    }
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
