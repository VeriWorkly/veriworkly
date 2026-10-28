import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * V-346: every route the server mounts is either in the published API reference or listed here
 * as not public, with the reason. A new public route that nobody documented fails this test
 * instead of going missing from docs.veriworkly.com/api-reference.
 *
 * Routes are read from the router files by pattern (`router.get("/x", …)` and
 * `router.route("/x").get(…)`), mounted at the prefixes `app.ts` gives them.
 */

const serverRoot = path.resolve(__dirname, "../..");
const bundledSpecPath = path.resolve(serverRoot, "../docs-platform/public/openapi.json");

/** Mounted, and deliberately left out of the public reference. */
const NOT_PUBLIC: Record<string, string> = {
  "GET /api/v1/stats/admin/dashboard": "admin console",
  "GET /api/v1/health/metrics": "operator scrape, x-internal-key only",
  "GET /api/v1/health/jobs": "operator check, x-internal-key only",
  "POST /api/v1/contact": "the marketing site's contact form",
  "POST /api/v1/client-errors": "first-party apps report their own errors",
};
/** Whole areas that are not public: the admin console and the payment provider's webhook. */
const NOT_PUBLIC_PREFIXES = ["/api/v1/admin", "/api/v1/billing/webhook"];

const METHODS = ["get", "post", "put", "patch", "delete"] as const;

function routeFile(module: string) {
  const direct = path.join(serverRoot, "src/routes", `${module}.ts`);
  return fs.existsSync(direct) ? direct : path.join(serverRoot, "src/routes", module, "index.ts");
}

function toOpenApiPath(base: string, sub: string) {
  return `${base}${sub}`.replace(/\/$/, "").replace(/:(\w+)/g, "{$1}");
}

function mountedRoutes(): string[] {
  const app = fs.readFileSync(path.join(serverRoot, "src/app.ts"), "utf8");
  const modules = new Map(
    [...app.matchAll(/import (\w+) from "#routes\/([\w/]+)"/g)].map((m) => [m[1]!, m[2]!]),
  );
  const routes: string[] = [];

  for (const [, base, name] of app.matchAll(/app\.use\(\s*"([^"]+)",\s*(\w+)\s*\)/g)) {
    const routeModule = modules.get(name!);
    if (!routeModule) continue;
    const source = fs.readFileSync(routeFile(routeModule), "utf8");

    for (const [, method, sub] of source.matchAll(
      /router\.(get|post|put|patch|delete)\(\s*"([^"]*)"/g,
    ))
      routes.push(`${method!.toUpperCase()} ${toOpenApiPath(base!, sub!)}`);

    // `router.route("/x").get(…).post(…)`, possibly split over several lines.
    for (const [, sub, chain] of source.matchAll(/\.route\(\s*"([^"]*)"\s*\)([^;]*);/g))
      for (const [, method] of chain!.matchAll(/\.(get|post|put|patch|delete)\(/g))
        routes.push(`${method!.toUpperCase()} ${toOpenApiPath(base!, sub!)}`);
  }
  return routes;
}

describe("API reference route coverage (V-346)", () => {
  const spec = JSON.parse(fs.readFileSync(bundledSpecPath, "utf8")) as {
    paths: Record<string, Partial<Record<(typeof METHODS)[number], unknown>>>;
  };
  const documented = new Set(
    Object.entries(spec.paths).flatMap(([route, item]) =>
      METHODS.filter((method) => item[method]).map((method) => `${method.toUpperCase()} ${route}`),
    ),
  );
  const routes = mountedRoutes();

  it("finds the routes it is checking", () => {
    expect(routes.length).toBeGreaterThan(60);
    expect(routes).toContain("GET /api/v1/documents/{id}");
  });

  it("documents every public route, or lists it as not public", () => {
    const undocumented = routes.filter(
      (route) =>
        !documented.has(route) &&
        !(route in NOT_PUBLIC) &&
        !NOT_PUBLIC_PREFIXES.some((prefix) => route.split(" ")[1]!.startsWith(prefix)),
    );
    expect(undocumented).toEqual([]);
  });

  it("lists as not public only routes that exist and are not documented", () => {
    for (const route of Object.keys(NOT_PUBLIC)) {
      expect(routes, route).toContain(route);
      expect(documented.has(route), route).toBe(false);
    }
  });
});

describe("documented contracts the clients depend on (V-345, V-346)", () => {
  const spec = JSON.parse(fs.readFileSync(bundledSpecPath, "utf8")) as {
    paths: Record<string, Record<string, Record<string, unknown>>>;
    components: { schemas: Record<string, { properties?: Record<string, unknown> }> };
  };
  const operation = (route: string, method: string) => spec.paths[route]![method]!;
  const text = (value: unknown) => JSON.stringify(value);

  it("account deletion says billing records are kept and documents the forfeit confirmation", () => {
    const remove = operation("/api/v1/users/me", "delete");
    expect(remove.description).not.toMatch(/credit and payout record attached/);
    expect(remove.description).toMatch(/Billing and payout records are kept/);

    const responses = remove.responses as Record<string, unknown>;
    expect(text(responses["409"])).toContain("AFFILIATE_BALANCE_FORFEIT");
    expect(text(responses["409"])).toContain("CHECKOUT_IN_PROGRESS");
    expect(text(remove.requestBody)).toContain("DeleteAccountRequest");
    expect(Object.keys(spec.components.schemas.DeleteAccountRequest!.properties!)).toEqual([
      "confirmAffiliateForfeit",
      "confirmedAffiliateForfeitCents",
    ]);
  });

  it("checkout names the 409 codes that send a customer to the plan upgrade or an open checkout", () => {
    const conflict = text(
      (operation("/api/v1/billing/checkout", "post").responses as Record<string, unknown>)["409"],
    );
    for (const code of ["UPGRADE_AVAILABLE", "CHECKOUT_IN_PROGRESS", "ALREADY_SUBSCRIBED"])
      expect(conflict).toContain(code);
  });
});
