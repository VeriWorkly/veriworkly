import fs from "node:fs";
import path from "node:path";

import type { Metadata } from "next";
import { describe, expect, it, vi } from "vitest";

import { appRoot, diskLoader, walk, type TreeName } from "./helpers/content";

// The same rule as config/site.ts, so the test agrees with whatever SITE_URL the run uses.
const SITE = process.env.SITE_URL || "https://docs.veriworkly.com";

// The pages read the compiled MDX collections through `@/lib/source`; the disk loaders stand in
// for them. Rendering pieces are stubbed: only `generateMetadata` and `generateStaticParams` run.
vi.mock("@/lib/source", async () => {
  const { diskLoader: load } = await import("./helpers/content");
  return {
    source: load("docs"),
    apiSource: load("api"),
    engineSource: load("engine"),
    ogImagePath: (tree: string, slugs: string[]) =>
      `/og/${tree}/${[...slugs, "image.png"].join("/")}`,
  };
});
vi.mock("fumadocs-ui/layouts/notebook/page", () => ({}));
vi.mock("fumadocs-ui/mdx", () => ({ createRelativeLink: () => null }));
vi.mock("@/components/json-ld", () => ({}));
vi.mock("@/components/mdx", () => ({}));
vi.mock("@/components/api-page", () => ({}));
vi.mock("@/components/engine-size", () => ({}));
vi.mock("@/lib/openapi", () => ({}));

type PageModule = {
  generateMetadata: (props: { params: Promise<{ slug?: string[] }> }) => Promise<Metadata>;
  generateStaticParams: () => Promise<{ slug?: string[] }[]> | { slug?: string[] }[];
};

const TREES: { tree: TreeName; route: string; template: string; layout: string }[] = [
  { tree: "docs", route: "docs", template: "%s | VeriWorkly Docs", layout: "app/layout.tsx" },
  {
    tree: "api",
    route: "api-reference",
    template: "%s | VeriWorkly API",
    layout: "app/api-reference/layout.tsx",
  },
  {
    tree: "engine",
    route: "ats-engine",
    template: "%s | VeriWorkly ATS Engine",
    layout: "app/ats-engine/layout.tsx",
  },
];

const read = (file: string) => fs.readFileSync(path.join(appRoot, file), "utf8");

describe.each(TREES)("$route pages", ({ tree, route, template, layout }) => {
  const load = () => import(`../app/${route}/[[...slug]]/page.tsx`) as Promise<PageModule>;
  const pages = diskLoader(tree).getPages();

  it("the section template is the one the layout declares", async () => {
    const { siteConfig } = await import("@/config/site");
    const declared = /template: (?:"([^"]+)"|`([^`]+)`)/.exec(read(layout));
    expect(declared, `${layout} declares no title template`).toBeTruthy();
    const value = (declared![1] ?? declared![2]!).replace(
      "${siteConfig.shortName}",
      siteConfig.shortName,
    );
    expect(value).toBe(template);
  });

  it("prerenders exactly the loader's pages", async () => {
    const { generateStaticParams } = await load();
    const params = await generateStaticParams();
    const urls = params.map(({ slug }) => `/${route}${slug?.length ? `/${slug.join("/")}` : ""}`);
    expect(new Set(urls)).toEqual(new Set(pages.map((page) => page.url)));
  });

  it("every page's canonical is its own URL, with short title and description and no noindex", async () => {
    const { generateMetadata } = await load();
    const problems: string[] = [];

    for (const page of pages) {
      const metadata = await generateMetadata({ params: Promise.resolve({ slug: page.slugs }) });
      const raw = metadata.title as string | { absolute: string };
      const title = typeof raw === "string" ? template.replace("%s", raw) : raw.absolute;
      const description = String(metadata.description ?? "");

      if (metadata.alternates?.canonical !== `${SITE}${page.url}`)
        problems.push(`${page.url}: canonical ${String(metadata.alternates?.canonical)}`);
      if (title.length > 60) problems.push(`${page.url}: title is ${title.length} chars: ${title}`);
      if (!description) problems.push(`${page.url}: no description`);
      if (description.length > 155)
        problems.push(`${page.url}: description is ${description.length} chars`);
      if (metadata.robots) problems.push(`${page.url}: sets robots`);
      if (metadata.openGraph?.url !== `${SITE}${page.url}`)
        problems.push(`${page.url}: og:url ${String(metadata.openGraph?.url)}`);
    }

    expect(problems).toEqual([]);
  });
});

describe("metaDescription", () => {
  it("keeps short text, flattened to plain text", async () => {
    const { metaDescription } = await import("@/lib/metadata");
    expect(metaDescription("Creates a **key**.\n\nSee [docs](/x).")).toBe(
      "Creates a key. See docs.",
    );
  });

  it("keeps whole sentences, or cuts a long one at a word", async () => {
    const { metaDescription } = await import("@/lib/metadata");
    const sentence = `${"word ".repeat(12).trim()}.`;
    expect(metaDescription(`${sentence} ${sentence} ${sentence}`)).toBe(`${sentence} ${sentence}`);
    const cut = metaDescription("word ".repeat(60));
    expect(cut.length).toBeLessThanOrEqual(155);
    expect(cut.endsWith("word…")).toBe(true);
  });
});

describe("site-wide metadata", () => {
  it("no page, layout or config sets noindex", () => {
    const files = [
      ...walk(path.join(appRoot, "app"), /\.tsx?$/),
      ...walk(path.join(appRoot, "lib"), /\.tsx?$/),
      ...walk(path.join(appRoot, "content"), /\.mdx?$/),
    ];
    expect(
      files.filter((file) => /noindex|index:\s*false/i.test(fs.readFileSync(file, "utf8"))),
    ).toEqual([]);
  });

  it("the home page's canonical is the site root", () => {
    expect(read("app/page.tsx")).toMatch(/alternates: \{ canonical: siteConfig\.url \}/);
  });

  it("the sitemap lists the home page and every page of the three loaders, each with lastModified", async () => {
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = sitemap();
    const expected = [
      SITE,
      ...(["docs", "engine", "api"] as const).flatMap((tree) =>
        diskLoader(tree)
          .getPages()
          .map((page) => `${SITE}${page.url}`),
      ),
    ];

    expect(entries.map((entry) => entry.url).sort()).toEqual(expected.sort());
    expect(entries.filter((entry) => !entry.lastModified).map((entry) => entry.url)).toEqual([]);
  });

  it("the sitemap's dates come from git, through the last-modified plugin", () => {
    expect(read("source.config.ts")).toMatch(/plugins: \[lastModified\(\)\]/);
    expect(read("app/sitemap.ts")).toMatch(/lastModified: page\.data\.lastModified/);
  });
});
