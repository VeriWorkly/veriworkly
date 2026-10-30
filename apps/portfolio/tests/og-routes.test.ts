import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const published = vi.hoisted(() => ({ lookups: [] as string[], value: null as unknown }));

vi.mock("@/lib/published-portfolio", () => ({
  getPublishedPortfolio: async (subdomain: string) => {
    published.lookups.push(subdomain);
    return published.value;
  },
}));

import { ogCard } from "@/lib/og-text";
import { GET as owner } from "@/app/api/og/route";
import { GET as atelier } from "@/app/api/template/atelier/og/route";
import { GET as cipher } from "@/app/api/template/cipher/og/route";
import { GET as nimbus } from "@/app/api/template/nimbus/og/route";
import { GET as signal } from "@/app/api/template/signal/og/route";

const routes = { atelier, cipher, nimbus, signal };
const sample = { bio: "b", availability: "a", location: "l" };

beforeEach(() => {
  published.lookups = [];
  published.value = null;
});

describe("template social cards", () => {
  it.each(Object.entries(routes))("%s is cacheable", async (id, GET) => {
    const response = await GET(new Request(`https://portfolio.test/api/template/${id}/og`));

    expect(response.headers.get("cache-control")).toMatch(/public, max-age=86400/);
  });

  it.each(Object.keys(routes))("%s has no founder defaults", (id) => {
    const source = readFileSync(
      new URL(`../app/api/template/${id}/og/route.tsx`, import.meta.url),
      "utf8",
    );

    expect(source).not.toMatch(/Gautam|"gautam"/);
  });

  // S3: a branded card cached for a week must not say whatever the URL says.
  it("ignores text in the query and draws the template's sample card", async () => {
    const card = await ogCard(
      new Request("https://portfolio.test/og?name=Pay%20here&headline=Account%20locked"),
      "nimbus",
      sample,
    );

    expect(card).toMatchObject({ name: "Nimbus template", subdomain: "yourname" });
    expect(JSON.stringify(card)).not.toMatch(/Pay here|Account locked/);
  });

  it("draws a named site from its published values only", async () => {
    published.value = {
      subdomain: "jane",
      snapshot: {
        identity: {
          name: "Jane Doe",
          headline: "Staff engineer",
          bio: "Builds things",
          availability: "Open to work",
          location: "Berlin",
        },
      },
    };

    const card = await ogCard(
      new Request("https://portfolio.test/og?subdomain=jane&name=Someone%20else"),
      "signal",
      sample,
    );

    expect(published.lookups).toEqual(["jane"]);
    expect(card).toEqual({
      name: "Jane Doe",
      headline: "Staff engineer",
      bio: "Builds things",
      availability: "Open to work",
      location: "Berlin",
      subdomain: "jane",
    });
  });

  it.each(Object.entries(routes))(
    "%s answers 404 for a site that is not published",
    async (id, GET) => {
      const response = await GET(
        new Request(`https://portfolio.test/api/template/${id}/og?subdomain=ghost`),
      );

      expect(response.status).toBe(404);
    },
  );
});

describe("the owner's card generator", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not serve in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await owner(new Request("https://portfolio.test/api/og?title=Anything"));

    expect(response.status).toBe(404);
  });
});
