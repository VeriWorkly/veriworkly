import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Owner rule (2026-10-28): every portfolio, free or paid, is served on its own
 * `<name>.veriworkly.com` subdomain; the plan only decides the templates, the badge and the
 * extra pages. The badge and the pages follow `isPaid` (the owner's portfolio access, GRACE
 * included) on any template, never the template itself (SV-04, P-012).
 */

const publication = vi.hoisted(() => ({ value: null as unknown }));

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
vi.mock("@/lib/backend", () => ({
  backendApiUrl: (path: string) => `https://api.test${path}`,
  firstPartyServerHeaders: () => ({}),
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/templates/runtime/registry", () => ({ renderTemplate: async () => null }));

import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";

import Portfolio, {
  generateMetadata,
  revalidate,
  generateStaticParams,
} from "@/app/(published)/portfolios/[username]/[[...slug]]/page";
import { Watermark } from "@/components/Watermark";
import PublishedNotFound from "@/app/(published)/not-found";
import { createDefaultPortfolio } from "@/lib/portfolio";
import type { PublishedPortfolio } from "@/lib/published-portfolio";

function published({
  isPaid,
  templateId = "signal",
  removeWatermark = false,
}: {
  isPaid: boolean;
  templateId?: string;
  removeWatermark?: boolean;
}) {
  const snapshot = createDefaultPortfolio();
  return {
    subdomain: "jane",
    templateId,
    updatedAt: "2026-10-01T00:00:00.000Z",
    isPaid,
    isPremiumTemplate: templateId === "nimbus" || templateId === "cipher",
    snapshot: {
      ...snapshot,
      templateId,
      removeWatermark,
      seo: { ...snapshot.seo, title: "" },
      identity: {
        ...snapshot.identity,
        name: "Jane Doe",
        headline: "Staff engineer",
        email: "jane@example.com",
        location: "Berlin",
        avatar: { id: "a1", url: "https://cdn.test/jane.png" },
      },
      pages: [{ id: "p1", slug: "talks", title: "Talks", sections: [] }],
    },
  } as PublishedPortfolio;
}

const params = (slug?: string[]) => ({ params: Promise.resolve({ username: "jane", slug }) });

function children(node: ReactNode): ReactElement[] {
  const element = node as ReactElement<{ children: ReactNode[] }>;
  return (element.props.children as ReactNode[]).filter(isValidElement) as ReactElement[];
}

async function render(slug?: string[]) {
  return children(await Portfolio(params(slug)));
}

const hasBadge = (nodes: ReactElement[]) => nodes.some((node) => node.type === Watermark);

function jsonLd(nodes: ReactElement[]) {
  const script = nodes.find((node) => (node.props as { data?: unknown }).data);
  return (script!.props as { data: Record<string, unknown> }).data;
}

beforeEach(() => {
  vi.mocked(redirect).mockClear();
});

describe("the public portfolio page", () => {
  it("serves a free site on its own subdomain instead of redirecting it", async () => {
    publication.value = published({ isPaid: false });

    await expect(Portfolio(params())).resolves.toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("names the subdomain as the canonical address of a free site", async () => {
    publication.value = published({ isPaid: false });

    const metadata = await generateMetadata(params());

    expect(metadata.alternates?.canonical).toBe("https://jane.veriworkly.com");
  });

  it("is cached per site: revalidate with an empty static params list", async () => {
    expect(revalidate).toBe(3600);
    await expect(generateStaticParams()).resolves.toEqual([]);
  });
});

describe("badge and extra pages follow isPaid on any template", () => {
  const matrix = [
    { label: "free x Signal", isPaid: false, templateId: "signal", remove: false, badge: true },
    // The snapshot cannot remove the badge without the plan, whatever it says.
    {
      label: "free x Signal asking to hide",
      isPaid: false,
      templateId: "signal",
      remove: true,
      badge: true,
    },
    {
      label: "paid x Signal, badge removed",
      isPaid: true,
      templateId: "signal",
      remove: true,
      badge: false,
    },
    {
      label: "paid x Signal, badge kept",
      isPaid: true,
      templateId: "signal",
      remove: false,
      badge: true,
    },
    {
      label: "paid x Nimbus, badge removed",
      isPaid: true,
      templateId: "nimbus",
      remove: true,
      badge: false,
    },
    // GRACE: the server still reports isPaid until the site moves to the free tier.
    { label: "GRACE x Cipher", isPaid: true, templateId: "cipher", remove: true, badge: false },
    // Lapsed: the server moved it to a free template and reports isPaid false.
    { label: "lapsed x Atelier", isPaid: false, templateId: "atelier", remove: true, badge: true },
  ];

  it.each(matrix)("$label", async ({ isPaid, templateId, remove, badge }) => {
    publication.value = published({ isPaid, templateId, removeWatermark: remove });

    expect(hasBadge(await render())).toBe(badge);

    if (isPaid) {
      const page = await render(["talks"]);
      expect(hasBadge(page)).toBe(badge);
      expect(jsonLd(page).url).toBe("https://jane.veriworkly.com/talks");

      const metadata = await generateMetadata(params(["talks"]));
      expect(metadata.title).toEqual({ absolute: "Talks | Jane Doe" });
      expect(metadata.alternates?.canonical).toBe("https://jane.veriworkly.com/talks");
    } else {
      await expect(render(["talks"])).rejects.toThrow("notFound");

      const metadata = await generateMetadata(params(["talks"]));
      expect(metadata.robots).toEqual({ index: false, follow: false });
    }
  });

  it("404s a page that does not exist on a paid site", async () => {
    publication.value = published({ isPaid: true });

    await expect(render(["nope"])).rejects.toThrow("notFound");
  });
});

describe("the owner's metadata and JSON-LD", () => {
  it("uses an absolute title and the owner as the site name", async () => {
    publication.value = published({ isPaid: false });

    const metadata = await generateMetadata(params());

    expect(metadata.title).toEqual({ absolute: "Jane Doe | Portfolio" });
    expect(metadata.openGraph?.siteName).toBe("Jane Doe");
    expect(JSON.stringify(metadata)).not.toMatch(/VeriWorkly Team|Gautam Raj/);
  });

  it("describes the person without publishing their email", async () => {
    publication.value = published({ isPaid: false });

    const data = jsonLd(await render());
    const person = data.mainEntity as Record<string, unknown>;

    expect(data.url).toBe("https://jane.veriworkly.com");
    expect(data.dateModified).toBe("2026-10-01T00:00:00.000Z");
    expect(person).toMatchObject({
      url: "https://jane.veriworkly.com",
      image: "https://cdn.test/jane.png",
      jobTitle: "Staff engineer",
      address: { "@type": "PostalAddress", addressLocality: "Berlin" },
    });
    expect(JSON.stringify(data)).not.toContain("jane@example.com");
  });

  it("uses a long headline as the description, not the job title", async () => {
    const site = published({ isPaid: false });
    site.snapshot.identity.headline =
      "I build calm, fast developer tools and write about the craft of shipping them well";
    publication.value = site;

    const person = jsonLd(await render()).mainEntity as Record<string, unknown>;

    expect(person.jobTitle).toBeUndefined();
    expect(person.description).toBe(site.snapshot.identity.headline);
  });
});

describe("a subdomain with no portfolio (P-060)", () => {
  it("links only to absolute platform addresses and offers to claim the name", () => {
    const html = renderToStaticMarkup(<PublishedNotFound />);
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(href).toMatch(/^https:\/\/portfolio\.veriworkly\.com/);
    expect(html).toContain("This name may be available.");
    expect(html).toContain("Claim it");
  });
});

describe("reading a published site (P-007)", () => {
  const fetchMock = vi.fn();
  let getPublishedPortfolio: (subdomain: string) => Promise<PublishedPortfolio | null>;

  beforeEach(async () => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    ({ getPublishedPortfolio } = await vi.importActual<typeof import("@/lib/published-portfolio")>(
      "@/lib/published-portfolio",
    ));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const reply = (status: number, body: unknown = {}) =>
    new Response(JSON.stringify(body), { status });

  it("returns null only for a 404 or an empty answer", async () => {
    fetchMock.mockResolvedValueOnce(reply(404));
    await expect(getPublishedPortfolio("ghost")).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce(reply(200, { data: {} }));
    await expect(getPublishedPortfolio("ghost")).resolves.toBeNull();
  });

  it.each([500, 502, 429])("throws on %i so ISR keeps the last good render", async (status) => {
    fetchMock.mockResolvedValueOnce(reply(status));

    await expect(getPublishedPortfolio("jane")).rejects.toThrow(String(status));
  });

  it("throws on a timeout or network failure", async () => {
    fetchMock.mockRejectedValueOnce(new DOMException("timed out", "TimeoutError"));

    await expect(getPublishedPortfolio("jane")).rejects.toThrow("timed out");
  });

  it("reads isPaid and isPremiumTemplate from the API", async () => {
    const site = published({ isPaid: true, templateId: "nimbus", removeWatermark: true });
    fetchMock.mockResolvedValueOnce(
      reply(200, { data: { ...site, isPremium: true, isPaid: true, isPremiumTemplate: true } }),
    );

    const read = await getPublishedPortfolio("jane");

    expect(read).toMatchObject({ isPaid: true, isPremiumTemplate: true, subdomain: "jane" });
    expect(read!.snapshot.removeWatermark).toBe(true);
    expect(read!.snapshot.pages).toHaveLength(1);
  });
});

describe("the revalidate hook", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("expires a site's tag immediately with the Next 16 signature", async () => {
    vi.stubEnv("PORTFOLIO_REVALIDATE_SECRET", "s3cret");
    const { POST } = await import("@/app/api/revalidate/route");

    const response = await POST(
      new Request("https://portfolio.test/api/revalidate", {
        method: "POST",
        body: JSON.stringify({ secret: "s3cret", tags: ["portfolio-jane"], paths: [] }),
      }),
    );

    expect(response.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("portfolio-jane", { expire: 0 });
  });
});
