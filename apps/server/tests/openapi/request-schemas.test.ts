import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { buildRequestSchemas, toRequestJsonSchema } from "#openapi/requestSchemas";
import { HAND_WRITTEN_REQUESTS, OPENAPI_REQUEST_REGISTRY } from "#openapi/registry";
import { publicPageParam } from "#utils/pagination";

/**
 * The request half of the API reference is generated from the validators (IMPROVEMENTS 14). These
 * pin that the committed file is what the validators produce today, and that the registry names
 * only operations the reference documents.
 */

const docsRoot = path.resolve(__dirname, "../../../docs-platform");
const committedPath = path.join(docsRoot, "specs/generated/requests.json");
const bundledSpecPath = path.join(docsRoot, "public/openapi.json");

const HTTP_METHODS = ["get", "put", "post", "patch", "delete"];

describe("OpenAPI request schemas generated from zod", () => {
  it("the committed specs/generated/requests.json matches the validators", () => {
    const committed = JSON.parse(fs.readFileSync(committedPath, "utf8"));

    // Fails after a validator change until `npm run generate:openapi -w @veriworkly/server` and
    // `npm run generate:api` are run and the results committed.
    expect(committed).toEqual(buildRequestSchemas());
  });

  it("every registry and hand-written entry is a documented operation", () => {
    const spec = JSON.parse(fs.readFileSync(bundledSpecPath, "utf8")) as {
      paths: Record<string, Record<string, unknown>>;
    };

    const documented = new Set(
      Object.entries(spec.paths).flatMap(([route, item]) =>
        HTTP_METHODS.filter((method) => item[method]).map(
          (method) => `${method.toUpperCase()} ${route}`,
        ),
      ),
    );

    const unknown = [
      ...Object.keys(OPENAPI_REQUEST_REGISTRY),
      ...Object.keys(HAND_WRITTEN_REQUESTS),
    ].filter((key) => !documented.has(key));

    expect(unknown).toEqual([]);
  });

  it("documents what a client sends, not what transforms produce", () => {
    expect(toRequestJsonSchema(publicPageParam)).toEqual({
      type: "integer",
      minimum: 1,
      maximum: 1_000_000,
    });
    expect(toRequestJsonSchema(z.date())).toEqual({ type: "string", format: "date-time" });
    expect(
      toRequestJsonSchema(
        z
          .string()
          .optional()
          .transform((value) => value?.split(",")),
      ),
    ).toEqual({ type: "string" });
    expect(toRequestJsonSchema(z.string().datetime())).toEqual({
      type: "string",
      format: "date-time",
    });
  });
});
