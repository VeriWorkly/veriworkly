import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { config } from "../../src/config.js";

import { corsMiddleware, isWildcardPortfolioOrigin } from "../../src/middleware/cors.js";
import { errorHandler } from "../../src/middleware/errorHandler.js";

describe("CORS wildcard portfolio origin detection", () => {
  const allowedOrigins = [
    "https://veriworkly.com",
    "https://app.veriworkly.com",
    "https://docs.veriworkly.com",
    "https://blog.veriworkly.com",
    "https://portfolio.veriworkly.com",
    "https://api.veriworkly.com",
  ];

  it("does not treat explicit first-party origins as wildcard portfolio origins", () => {
    expect(isWildcardPortfolioOrigin("https://app.veriworkly.com", allowedOrigins)).toBe(false);
    expect(isWildcardPortfolioOrigin("https://portfolio.veriworkly.com", allowedOrigins)).toBe(
      false,
    );
  });

  it("treats unlisted subdomains as wildcard portfolio origins", () => {
    expect(isWildcardPortfolioOrigin("https://alice.veriworkly.com", allowedOrigins)).toBe(true);
  });

  it("treats local portfolio preview subdomains as wildcard portfolio origins", () => {
    expect(isWildcardPortfolioOrigin("http://alice.localhost:3004", allowedOrigins)).toBe(true);
  });
});

describe("CORS preflight", () => {
  function preflightApp() {
    const app = express();
    app.use(corsMiddleware);
    app.post("/admin/credits", (_req, res) => {
      res.json({ ok: true });
    });
    return app;
  }

  it("allows the Idempotency-Key header the admin credit-adjust route documents (V-194)", async () => {
    const origin = config.allowedOrigins[0];
    expect(origin).toBeTruthy();

    const response = await request(preflightApp())
      .options("/admin/credits")
      .set("Origin", origin)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type,idempotency-key");

    expect(response.status).toBe(204);
    const allowed = String(response.headers["access-control-allow-headers"])
      .split(",")
      .map((header) => header.trim().toLowerCase());
    expect(allowed).toContain("idempotency-key");
    expect(allowed).toContain("content-type");
  });
});

describe("CORS rejection", () => {
  it("keeps its message and carries a stable code the studio can match on (V-264)", async () => {
    const app = express();
    app.use(corsMiddleware);
    app.get("/documents", (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);

    const response = await request(app)
      .get("/documents")
      .set("Origin", "https://not-allowed.example.com");

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      success: false,
      statusCode: 403,
      message: "Not allowed by CORS",
      details: { code: "CORS_REJECTED" },
    });
  });
});
