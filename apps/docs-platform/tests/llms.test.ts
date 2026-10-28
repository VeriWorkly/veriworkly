import fs from "node:fs";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { GET as agentCard } from "@/app/.well-known/agent.json/route";
import { openApiCounts, openApiOperations, readOpenApiSpec } from "@/lib/llms";
import { appRoot, diskPages, llmsIndexText } from "./helpers/content";

const spec = readOpenApiSpec(appRoot);
const counts = openApiCounts(spec);
const index = llmsIndexText();

describe("/llms.txt and the agent card (D-015)", () => {
  it("is served by the route, not shadowed by a public file", () => {
    expect(fs.existsSync(path.join(appRoot, "public", "llms.txt"))).toBe(false);
    expect(fs.existsSync(path.join(appRoot, "public", ".well-known", "agent.json"))).toBe(false);
    for (const route of [
      "app/llms.txt/route.ts",
      "app/llms-full.txt/route.ts",
      "app/.well-known/agent.json/route.ts",
    ])
      expect(fs.readFileSync(path.join(appRoot, route), "utf8")).toMatch(
        /export const dynamic = "force-static"/,
      );
  });

  it("advertises the counts of the bundled spec", () => {
    expect(counts.operations).toBeGreaterThan(50);
    expect(index).toContain(
      `## API Directory (${counts.paths} paths, ${counts.operations} operations, ${counts.schemas} schemas, ${counts.tags} tags)`,
    );
  });

  it("lists every operation and links it to its page", () => {
    for (const operation of openApiOperations(spec)) {
      const route = operation.route.replace(/^\/api\/v1/, "");
      expect(index, `${operation.method} ${route}`).toContain(
        `[\`${operation.method} ${route}\`](https://docs.veriworkly.com/api-reference/`,
      );
    }
  });

  it("lists every docs and ATS Engine page and every hand-written API page", () => {
    const pages = [
      ...diskPages("docs"),
      ...diskPages("engine"),
      ...diskPages("api").filter((page) => !page.data._openapi),
    ];
    for (const page of pages) expect(index).toContain(`](https://docs.veriworkly.com${page.url})`);
  });

  it("links only to pages that exist", () => {
    const urls = new Set(
      [...diskPages("docs"), ...diskPages("engine"), ...diskPages("api")].map((page) => page.url),
    );
    const linked = [...index.matchAll(/\]\(https:\/\/docs\.veriworkly\.com(\/[^)]*)\)/g)].map(
      (m) => m[1]!,
    );
    expect(linked.length).toBeGreaterThan(100);
    expect(linked.filter((url) => !urls.has(url))).toEqual([]);
  });
});

describe("the agent card (D-015)", () => {
  let card = "";

  beforeAll(async () => {
    card = await agentCard().text();
  });

  it("parses", () => {
    expect(() => JSON.parse(card)).not.toThrow();
  });

  it("quotes the bundled spec's counts and no others", () => {
    const quoted = (noun: string) =>
      [...card.matchAll(new RegExp(`(\\d+) (?:domain |component )?${noun}`, "g"))].map((m) =>
        Number(m[1]),
      );

    for (const noun of ["operations", "paths", "tags", "schemas"] as const) {
      const numbers = quoted(noun);
      expect(numbers.length, `agent.json quotes no count of ${noun}`).toBeGreaterThan(0);
      expect(
        numbers.filter((n) => n !== counts[noun]),
        `agent.json quotes ${noun} that public/openapi.json does not have (${counts[noun]})`,
      ).toEqual([]);
    }
  });
});
