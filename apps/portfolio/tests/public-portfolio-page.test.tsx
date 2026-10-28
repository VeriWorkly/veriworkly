import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Owner rule (2026-10-28): every portfolio, free or paid, is served on its own
 * `<name>.veriworkly.com` subdomain; the plan only decides the templates, the badge and the
 * extra pages. A free site used to be redirected off its subdomain to the platform path.
 */

const host = vi.hoisted(() => ({ value: "jane.veriworkly.com" }));
const publication = vi.hoisted(() => ({ value: null as unknown }));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: host.value }),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
}));
vi.mock("@/lib/published-portfolio", () => ({
  getPublishedPortfolio: async () => publication.value,
}));
vi.mock("@/templates/runtime/registry", () => ({ renderTemplate: async () => null }));

import { redirect } from "next/navigation";

import Portfolio, { generateMetadata } from "@/app/portfolios/[username]/[[...slug]]/page";
import { createDefaultPortfolio } from "@/lib/portfolio";

function published(isPremium: boolean) {
  const snapshot = createDefaultPortfolio();
  return {
    subdomain: "jane",
    templateId: snapshot.templateId,
    updatedAt: new Date(0).toISOString(),
    isPremium,
    snapshot: {
      ...snapshot,
      pages: [{ id: "p1", slug: "talks", title: "Talks", sections: [] }],
    },
  };
}

const params = (slug?: string[]) => ({ params: Promise.resolve({ username: "jane", slug }) });

beforeEach(() => {
  vi.mocked(redirect).mockClear();
  host.value = "jane.veriworkly.com";
});

describe("the public portfolio page", () => {
  it("serves a free site on its own subdomain instead of redirecting it", async () => {
    publication.value = published(false);

    await expect(Portfolio(params())).resolves.toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("names the subdomain as the canonical address of a free site", async () => {
    publication.value = published(false);

    const metadata = await generateMetadata(params());

    expect(metadata.alternates?.canonical).toBe("https://jane.veriworkly.com");
  });

  it("names the subdomain as canonical when a free site is opened on the platform path", async () => {
    host.value = "portfolio.veriworkly.com";
    publication.value = published(false);

    const metadata = await generateMetadata(params());

    expect(metadata.alternates?.canonical).toBe("https://jane.veriworkly.com");
  });

  it("keeps extra pages a paid perk: a free site's sub-page is not found", async () => {
    publication.value = published(false);

    await expect(Portfolio(params(["talks"]))).rejects.toThrow("notFound");
  });

  it("serves a paid site's sub-page on its subdomain", async () => {
    publication.value = published(true);

    await expect(Portfolio(params(["talks"]))).resolves.toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });
});
