import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { siteConfig } from "@/config/site";
import Footer from "@/components/layout/Footer";
import { OG_PAGES } from "@/features/og/cards";
import { faqs } from "@/features/faq/data/faqItems";
import { comparisonRows } from "@/features/pricing/data/pricingData";
import { CREDIT_PACK_VALID_DAYS } from "@/features/pricing/data/offers";
import { DISCLOSURE_STEPS } from "@/features/security/data/disclosureSteps";
import { DATA_RETENTION_MATRIX } from "@/features/security/data/dataRetentionMatrix";
import {
  LegalHeroMeta,
  privacyLastUpdated,
  privacySections,
  termsLastUpdated,
  termsSections,
} from "@/features/legal";
import { generateMetadata as affiliateMetadata } from "@/app/affiliate/page";
import { generateMetadata as ambassadorMetadata } from "@/app/ambassador/page";

// @veriworkly/ui loads next/font at import, which only works inside a Next build.
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "" }),
  Geist_Mono: () => ({ variable: "" }),
}));

/** Copy the audit found contradicting the code (W-097, W-119..W-133, SV-03), each tied to what makes it true. */

const siteRoot = join(__dirname, "..", "..");
const repoRoot = join(siteRoot, "..", "..");
const read = (path: string) => readFileSync(join(siteRoot, path), "utf8");

const llmsTxt = read("public/llms.txt");
const pricingMd = read("public/pricing.md");

const sectionText = (sections: typeof termsSections) => JSON.stringify(sections);

afterEach(() => vi.unstubAllEnvs());

describe("legal pages", () => {
  it("say credit packs last their 90 days whatever happens to a subscription (SV-03)", () => {
    const terms = sectionText(termsSections);

    expect(terms).not.toMatch(/cancellation of an associated subscription/i);
    expect(terms).toContain(`expire ${CREDIT_PACK_VALID_DAYS} days after purchase, whether or not`);
  });

  it("render the Last updated date the text promises (W-120)", () => {
    for (const iso of [termsLastUpdated, privacyLastUpdated]) {
      const html = renderToStaticMarkup(
        createElement(LegalHeroMeta, {
          effectiveDate: "July 23, 2026",
          lastUpdated: iso,
          links: [],
        }),
      );
      const shown = new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });

      expect(html).toContain("Last updated");
      expect(html).toContain(`dateTime="${iso}"`);
      expect(html).toContain(shown);
    }

    for (const page of ["app/(marketing)/terms/page.tsx", "app/(marketing)/privacy/page.tsx"])
      expect(read(page), page).toMatch(/lastUpdated=\{(terms|privacy)LastUpdated\}/);
  });

  it("name every email provider the server can send through as a subprocessor (W-119)", () => {
    const transporter = readFileSync(
      join(repoRoot, "apps/server/src/services/mail/transporter.ts"),
      "utf8",
    );
    const providers = [...transporter.matchAll(/emailProvider === "(\w+)"/g)].map((m) => m[1]!);
    const names: Record<string, RegExp> = {
      resend: /Resend —/,
      smtp: /over SMTP through Hostinger/,
    };

    expect(providers.length).toBeGreaterThan(0);
    const privacy = sectionText(privacySections);
    for (const provider of new Set(providers)) {
      expect(names[provider], `no subprocessor wording for "${provider}"`).toBeDefined();
      expect(privacy).toMatch(names[provider]!);
    }
  });
});

describe("marketing copy", () => {
  it("does not promise instant publishing while publishing is off (W-123)", () => {
    expect(llmsTxt).toMatch(/Portfolio publishing is not yet enabled in production/);
    expect(read("features/marketing/cta/InteractiveCTA.tsx")).not.toMatch(/publish[^.]*instantly/i);
  });

  it("sends security reports to the inbox security.txt and SECURITY.md name (W-124)", () => {
    const securityTxt = read("public/.well-known/security.txt");
    const securityMd = readFileSync(join(repoRoot, "SECURITY.md"), "utf8");

    expect(securityTxt).toContain(`Contact: mailto:${siteConfig.securityEmail}`);
    expect(securityMd).toContain(siteConfig.securityEmail);
    expect(DISCLOSURE_STEPS[0]!.detail).toContain(siteConfig.securityEmail);

    for (const file of [
      "features/security/components/hero/SecurityHero.tsx",
      "features/security/components/disclosure/ResponsibleDisclosureSection.tsx",
    ]) {
      expect(read(file), file).toContain("mailto:${siteConfig.securityEmail}");
      expect(read(file), file).not.toContain("siteConfig.email}");
    }
  });

  it("describe the brand kit the affiliate page links to (W-125)", () => {
    const source = read("features/affiliate/AffiliateResources.tsx");
    const zip = readFileSync(join(siteRoot, "public/brand/veriworkly-brand-kit.zip")).toString(
      "latin1",
    );
    const images = [...zip.matchAll(/logo\/[\w-]+\.(png|svg|eps|ai|pdf|jpe?g|webp)/gi)].map((m) =>
      m[1]!.toLowerCase(),
    );

    expect(source).toContain('href="/brand/veriworkly-brand-kit.zip"');
    expect(images.length).toBeGreaterThan(0);
    expect(new Set(images)).toEqual(new Set(["png"]));
    expect(source).not.toMatch(/\bSVG\b|\bEPS\b|vector|1024/i);
    expect(source).toMatch(/512 px/);
  });

  it("does not call every template free (W-127)", () => {
    expect(read("app/(marketing)/templates/page.tsx")).not.toMatch(/\} free templates/);
  });

  it("does not claim security reports are deleted by a job (W-128)", () => {
    const reports = DATA_RETENTION_MATRIX.find((row) => row.platformArea === "Security reports");

    expect(reports?.deletionMethod).not.toMatch(/automatic/i);
  });

  it("has no dead cookie button or hard-coded status in the program footers (W-129)", () => {
    expect(privacySections.some((section) => section.id === "cookies")).toBe(true);

    for (const file of [
      "features/affiliate/AffiliateFooter.tsx",
      "features/ambassador/AmbassadorFooter.tsx",
    ]) {
      const source = read(file);
      expect(source, file).not.toMatch(/operational/i);
      expect(source, file).not.toMatch(/<button[^>]*>\s*Cookie/);
      expect(source, file).toContain('href="/privacy#cookies"');
    }
  });

  it("does not promise instant payouts or real-time sync (W-130)", () => {
    expect(read("features/affiliate/AffiliateComparison.tsx")).not.toMatch(
      /instant|real-time|instantaneous/i,
    );
  });

  it("lists multi-page portfolios for Creator Pro and the bundle everywhere (W-131)", () => {
    expect(comparisonRows).toContainEqual(["Multi-page portfolios", false, true, false, true]);

    const creatorPro = /### 6\. Creator Pro[\s\S]*?(?=\n### )/.exec(pricingMd)?.[0] ?? "";
    const bundle =
      /### 4\. Job Hunter Bundle, monthly[\s\S]*?(?=\n### )/.exec(pricingMd)?.[0] ?? "";
    expect(creatorPro).toMatch(/multi-page portfolios/);
    expect(bundle).toMatch(/multi-page portfolios/);

    expect(llmsTxt).toMatch(/^- Creator Pro:.*multi-page portfolios/m);
    expect(llmsTxt).toMatch(/^- Job Hunter Bundle:.*multi-page portfolios/m);
  });

  it("describes the stats page as what it shows (W-132)", () => {
    const wrong = /AI feature logs|release metrics/i;

    expect(OG_PAGES.stats.description).not.toMatch(wrong);
    expect(read("app/(marketing)/stats/page.tsx")).not.toMatch(wrong);
  });

  it("takes the calculator's plan prices from offers.ts (W-133)", () => {
    const source = read("features/affiliate/AffiliateCalculator.tsx");

    expect(source).toContain("PLAN_PRICES");
    expect(source).not.toMatch(/\$\d+\.\d\d|\b\d+\.99\b/);
  });

  it("does not promise no renewal traps beside auto-renewing plans", () => {
    expect(read("features/compare/components/detail/ComparePricingSection.tsx")).not.toMatch(
      /renewal trap/i,
    );
  });
});

describe("closed programs are not presented as open (W-097)", () => {
  it("noindex each program page while its flag is off, and index it when on", () => {
    vi.stubEnv("AFFILIATE_PROGRAM_ENABLED", "false");
    vi.stubEnv("AMBASSADOR_PROGRAM_ENABLED", "false");

    expect(affiliateMetadata().robots).toMatchObject({ index: false });
    const closed = ambassadorMetadata();
    expect(closed.robots).toMatchObject({ index: false });
    expect(JSON.stringify(closed)).not.toMatch(/applications (are )?open\b(?! soon)/i);

    vi.stubEnv("AFFILIATE_PROGRAM_ENABLED", "true");
    vi.stubEnv("AMBASSADOR_PROGRAM_ENABLED", "true");

    expect(affiliateMetadata().robots).toBeUndefined();
    expect(affiliateMetadata().alternates?.canonical).toBe(`${siteConfig.url}/affiliate`);
    expect(ambassadorMetadata().robots).toBeUndefined();
  });

  it("hides the footer links while the programs are off", () => {
    vi.stubEnv("AFFILIATE_PROGRAM_ENABLED", "false");
    vi.stubEnv("AMBASSADOR_PROGRAM_ENABLED", "false");
    const closed = renderToStaticMarkup(createElement(Footer));

    expect(closed).not.toContain('href="/affiliate"');
    expect(closed).not.toContain('href="/ambassador"');

    vi.stubEnv("AFFILIATE_PROGRAM_ENABLED", "true");
    vi.stubEnv("AMBASSADOR_PROGRAM_ENABLED", "true");
    const open = renderToStaticMarkup(createElement(Footer));

    expect(open).toContain('href="/affiliate"');
    expect(open).toContain('href="/ambassador"');
  });

  it("only links Apply from the ambassador nav when the page knows the program is open", () => {
    expect(read("features/ambassador/AmbassadorNav.tsx")).toMatch(
      /programEnabled \? \(\s*<Link\s+href="\/ambassador\/apply"/,
    );
    expect(read("app/ambassador/page.tsx")).toContain(
      "<AmbassadorNav programEnabled={programEnabled} />",
    );
  });

  it("keeps static copy true while a program is closed", () => {
    const programs = faqs.find((faq) => faq.id === "affiliate-ambassador-programs")!;
    const staticCopy = [
      programs.answer,
      read("features/about/AboutPrograms.tsx"),
      llmsTxt,
      read("public/.well-known/agent.json"),
      OG_PAGES.ambassador.description,
      OG_PAGES.affiliate.description,
    ].join("\n");

    expect(programs.answer).not.toMatch(/^Yes\b/);
    expect(staticCopy).not.toMatch(
      /intake is open|applications (are )?open(?! soon)|become an affiliate|join the student program/i,
    );
    expect(llmsTxt).toMatch(/affiliate[^\n]*not open yet/i);
    expect(llmsTxt).toMatch(/ambassador[^\n]*not open yet/i);
  });
});
