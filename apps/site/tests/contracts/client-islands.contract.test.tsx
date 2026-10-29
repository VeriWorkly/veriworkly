import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import FAQList from "@/features/landing/faq/FAQList";
import MetricsProofBar from "@/features/landing/metrics-proof/MetricsProofBar";
import CompareHubPicker from "@/features/compare/components/hub/CompareHubPicker";
import { COMPETITORS } from "@/features/compare/data/competitors";
import { PRICES_CHECKED, PRICING_VERIFIED_AT } from "@/features/compare/data/featureMatrix";
import { buildChangelogHref } from "@/features/changelog/utils/changelog-utils";

/** Landing sections that need no browser state stay server components, and the copy beside them stays true (W-096, W-121, W-122, W-135..W-140). */

const root = join(__dirname, "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("sections that only need CSS ship no client JavaScript", () => {
  const SERVER_ONLY = [
    "features/landing/faq/FAQList.tsx",
    "features/landing/metrics-proof/MetricsProofBar.tsx",
    "features/landing/bento/GaplessBentoGrid.tsx",
    "features/landing/bento/BentoResumeCard.tsx",
    "features/landing/bento/BentoCoverLetterCard.tsx",
    "features/landing/bento/BentoPortfolioCard.tsx",
    "features/landing/bento/BentoPrivacyCard.tsx",
    "features/landing/template-showcase/TemplateShowcaseTracks.tsx",
  ];

  it.each(SERVER_ONLY)("%s is a server component without framer", (file) => {
    const source = read(file);

    expect(source).not.toMatch(/^"use client"/m);
    expect(source).not.toMatch(/from "framer-motion"/);
  });

  it("server pages import their islands directly: next/dynamic without ssr:false defers nothing", () => {
    for (const file of [
      "features/landing/template-showcase/TemplateShowcase.tsx",
      "features/landing/privacy/PrivacyWhyUs.tsx",
    ]) {
      expect(read(file), file).not.toMatch(/next\/dynamic/);
    }
  });

  it("the ATS gauge never re-renders per animation frame", () => {
    const source = read("features/landing/bento/AtsGauge.tsx");

    expect(source).not.toMatch(/useMotionValueEvent|useState/);
    expect(source).toMatch(/useTransform\(scoreMV, Math\.round\)/);
  });

  it("brand-kit downloads are plain links, so the router never prefetches the files", () => {
    for (const file of [
      "app/(marketing)/brand-kit/_components/BrandKitHeader.tsx",
      "app/(marketing)/brand-kit/_components/LogoSection.tsx",
    ]) {
      expect(read(file), file).not.toMatch(/<Link\b[^>]*\bdownload\b/);
      expect(read(file), file).toMatch(/<a\b[^>]*\bdownload\b/);
    }
  });

  it("the compare picker gets its rows as props instead of importing every competitor", () => {
    const source = read("features/compare/components/hub/CompareHubPicker.tsx");

    expect(source).not.toMatch(/COMPETITORS|from "\.\.\/\.\.\/data"/);
    expect(read("features/compare/components/shared/CompareScoreboard.tsx")).not.toMatch(
      /from "\.\.\/\.\.\/data"/,
    );
  });
});

describe("landing FAQ is one native exclusive accordion", () => {
  const html = renderToStaticMarkup(<FAQList />);

  it("every card shares one details name, so opening one closes the rest", () => {
    const details = html.match(/<details[^>]*>/g) ?? [];

    expect(details.length).toBeGreaterThan(3);
    for (const tag of details) expect(tag).toContain('name="landing-faq"');
  });

  it("starts with every answer closed", () => {
    const attributes = (html.match(/<details[^>]*>/g) ?? []).map((tag) =>
      tag.replace(/"[^"]*"/g, '""'),
    );

    for (const tag of attributes) expect(tag).not.toMatch(/\sopen\b/);
  });
});

describe("the metrics bar shows its real figures in the server HTML", () => {
  it("renders 0, 0, 6 and 4 with no count-up starting point", () => {
    const html = renderToStaticMarkup(<MetricsProofBar />);
    const figures = [...html.matchAll(/<span class="tabular-nums">(\d+)<\/span>/g)].map(
      (match) => match[1],
    );

    expect(figures).toEqual(["0", "0", "6", "4"]);
  });
});

describe("compare hub picker", () => {
  const entries = COMPETITORS.map(
    ({ id, name, initials, color, positioning, pricingModel, matrix }) => ({
      id,
      name,
      initials,
      color,
      positioning,
      pricingModel,
      matrix,
    }),
  );
  const html = renderToStaticMarkup(<CompareHubPicker competitors={entries} />);

  it("renders a tab per competitor and the first one's scoreboard", () => {
    expect((html.match(/role="tab"/g) ?? []).length).toBe(COMPETITORS.length);
    expect(html).toContain(`href="/compare/${COMPETITORS[0]!.id}"`);
    expect(html).toContain(COMPETITORS[0]!.pricingModel);
  });

  it("does not re-announce the whole scoreboard on every tab change", () => {
    expect(html).not.toContain("aria-live");
  });

  it("the verified date has one source", () => {
    expect(PRICING_VERIFIED_AT).toBe(`${PRICES_CHECKED.month} ${PRICES_CHECKED.year}`);
    expect(read("features/compare/data/competitors.ts")).not.toMatch(/PRICES_CHECKED =/);
  });
});

describe("changelog links", () => {
  it("drop empty filters and keep set ones", () => {
    expect(buildChangelogHref("/changelog", { q: "", tag: undefined })).toBe("/changelog");
    expect(buildChangelogHref("/changelog", { q: "pdf", tag: "" })).toBe("/changelog?q=pdf");
  });
});

describe("public assets", () => {
  it("the web manifest points at icons that exist", () => {
    const manifest = JSON.parse(read("app/manifest.json")) as { icons: Array<{ src: string }> };

    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons) {
      expect(existsSync(join(root, "public", icon.src)), icon.src).toBe(true);
    }
  });

  it("no stale README is served from public/", () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
      );

    expect(walk(join(root, "public")).filter((file) => /readme\.md$/i.test(file))).toEqual([]);
  });
});

describe("copy matches where the work really happens", () => {
  const FALSE_CLAIMS: Array<[RegExp, string]> = [
    [
      /(?:parsing|ai tailoring)[^.]{0,80}inside\s+your\s+(?:client\s+)?browser/i,
      "W-121: imports and AI run on the server",
    ],
    [/no auto-renewal/i, "W-122: monthly and annual plans renew"],
    [/zero monthly subscriptions/i, "W-122"],
  ];
  const SHIPPED = [
    "features/landing/privacy/PrivacyWhyUs.tsx",
    "features/landing/comparison/ComparisonTable.tsx",
    "features/compare/components/detail/ComparePricingSection.tsx",
  ];

  for (const [pattern, why] of FALSE_CLAIMS) {
    it(`${why}`, () => {
      expect(SHIPPED.filter((file) => pattern.test(read(file)))).toEqual([]);
    });
  }
});
