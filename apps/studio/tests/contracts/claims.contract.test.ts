import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";
import { parseDocumentRouteSegment } from "@/features/documents/core/routes";
import { coverLetterTemplateRegistry } from "@/templates/cover-letter/registry";
import { resumeTemplateRegistry } from "@/templates/resume/registry";

/** What the studio tells agents (`llms.txt`, `agent.json`) must match the app it describes. */

const studioDir = join(__dirname, "..", "..");
const publicDir = join(studioDir, "public");

const llmsTxt = readFileSync(join(publicDir, "llms.txt"), "utf8");
const agentJsonText = readFileSync(join(publicDir, ".well-known", "agent.json"), "utf8");
const agentJson = JSON.parse(agentJsonText) as Record<string, unknown>;

const appOrigin = siteConfig.links.app;
const appUrlPattern = new RegExp(`${appOrigin.replace(/[.]/g, "\\.")}(/[^\\s\`)"'&]*)?`, "g");

/** Each page or route handler under `app/`, as path segments with route groups removed. */
function appRoutes(directory = join(studioDir, "app"), segments: string[] = []): string[][] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const routes = entries.some((entry) => /^(page\.tsx|route\.ts)$/.test(entry.name))
    ? [segments]
    : [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const isGroup = /^\(.*\)$/.test(entry.name);
    const next = isGroup ? segments : [...segments, entry.name];

    routes.push(...appRoutes(join(directory, entry.name), next));
  }

  return routes;
}

const routes = appRoutes();

function isStudioPath(path: string) {
  if (existsSync(join(publicDir, path))) return true;

  const segments = path.split("/").filter(Boolean);

  return routes.some(
    (route) =>
      route.length === segments.length &&
      route.every((segment, i) => segment.startsWith("[") || segment === segments[i]),
  );
}

/** Studio paths named in the text: absolute app URLs, and backticked paths that are not API endpoints. */
function studioPathsIn(text: string) {
  const absolute = [...text.matchAll(appUrlPattern)].map((match) =>
    (match[1] ?? "/").replace(/[.,]+$/, ""),
  );
  const bare = [...text.matchAll(/`(\/[^`\s]*)`/g)]
    .map((match) => match[1]!)
    .filter((path) => !path.startsWith("/api/"));

  return [...new Set([...absolute, ...bare])];
}

function stringsIn(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringsIn);
  if (value && typeof value === "object") return Object.values(value).flatMap(stringsIn);
  return [];
}

const sources = [
  ["llms.txt", llmsTxt],
  ["agent.json", stringsIn(agentJson).join("\n")],
] as const;

describe("llms.txt and agent.json name only studio routes that exist", () => {
  it("finds the routes and paths it checks", () => {
    // Guards the assertions below from passing on a scan that matched nothing.
    expect(routes.length).toBeGreaterThan(10);
    expect(studioPathsIn(llmsTxt)).toContain("/documents");
    expect(studioPathsIn(stringsIn(agentJson).join("\n"))).toContain("/api-keys");
  });

  for (const [name, text] of sources) {
    it(`${name} links only to pages under app/ or files under public/`, () => {
      for (const path of studioPathsIn(text)) {
        expect(isStudioPath(path), `${name} names ${path}, which the studio does not serve`).toBe(
          true,
        );
      }
    });

    it(`${name} names only real document types in editor routes`, () => {
      for (const path of studioPathsIn(text)) {
        const type = /^\/editor\/([^/]+)\//.exec(path)?.[1];
        if (!type || type.startsWith("[")) continue;

        expect(
          parseDocumentRouteSegment(type),
          `${name} names /editor/${type}/, which is not a document type`,
        ).not.toBeNull();
      }
    });
  }
});

describe("llms.txt lists the templates the registries ship", () => {
  const lines = llmsTxt.split("\n");
  const resumeStart = lines.findIndex((line) => line.includes("**Resume Editor**"));
  const coverStart = lines.findIndex((line) => line.includes("**Cover Letter Editor**"));
  const resumeBlock = lines.slice(resumeStart, coverStart).join("\n");
  const coverBlock = lines[coverStart] ?? "";

  const templateIds = (block: string) =>
    [...block.matchAll(/`([a-z0-9]+(?:-[a-z0-9]+)*)`/g)].map((match) => match[1]!).sort();

  it("finds both template lists", () => {
    expect(resumeStart).toBeGreaterThan(-1);
    expect(coverStart).toBeGreaterThan(resumeStart);
  });

  it("names every resume template by its id, and no other", () => {
    expect(templateIds(resumeBlock)).toEqual([...resumeTemplateRegistry.ids].sort());
    expect(resumeBlock).toContain(`Supports ${resumeTemplateRegistry.ids.length} templates`);
  });

  it("names every cover letter template by its id, and no other", () => {
    expect(templateIds(coverBlock)).toEqual([...coverLetterTemplateRegistry.ids].sort());
    expect(coverBlock).toContain(`supporting ${coverLetterTemplateRegistry.ids.length} templates`);
  });
});

describe("llms.txt and agent.json claim only what the studio does", () => {
  for (const [name, text] of sources) {
    it(`${name} does not claim encryption`, () => {
      // The studio does not encrypt documents; the same word is banned from UI copy.
      expect(text).not.toMatch(/encrypt/i);
    });

    it(`${name} does not advertise link-in-bio pages`, () => {
      // LINK_IN_BIO is a Prisma enum value only; no such product exists.
      expect(text).not.toMatch(/link[- ]?in[- ]?bio/i);
    });

    it(`${name} points pricing at the marketing site`, () => {
      const pricingUrls = [...text.matchAll(/https?:\/\/[^\s`)"']*pricing[^\s`)"']*/g)].map(
        (match) => match[0],
      );

      expect(pricingUrls.length).toBeGreaterThan(0);

      for (const url of pricingUrls) {
        expect(url, `${name} links pricing to ${url}`).toBe(`${siteConfig.links.main}/pricing.md`);
      }
    });
  }

  it("the pricing file they point at exists on the site", () => {
    expect(existsSync(join(studioDir, "..", "site", "public", "pricing.md"))).toBe(true);
  });

  it("agent.json names the studio's own origin and llms.txt", () => {
    expect(agentJson.site_url).toBe(appOrigin);
    expect(agentJson.llms_txt).toBe(`${appOrigin}/llms.txt`);
  });
});

describe("agent-facing and login claims match the product (O6 LOW, S-248, S-264)", () => {
  it("llms.txt claims no tag filtering and sends agents to no session-only endpoint as if keys worked", () => {
    expect(llmsTxt).not.toMatch(/tag filtering/i);
    expect(llmsTxt).not.toMatch(/Check credit balances \(`\/api\/v1\/billing\/credits`\)/);
  });

  it("agent.json advertises no duplicate endpoint and no closed programs", () => {
    expect(agentJsonText).not.toMatch(/duplicate/i);
    expect(agentJsonText).not.toMatch(/affiliate|ambassador/i);
  });

  it("the login showcase does not say publishing needs a paid plan", () => {
    const showcase = readFileSync(join(studioDir, "app/login/component/ShowcaseCards.tsx"), "utf8");

    expect(showcase).not.toMatch(/needs a paid plan/);
  });
});
