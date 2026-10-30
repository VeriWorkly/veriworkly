import { getPublishedPortfolio } from "@/lib/published-portfolio";
import { templates, type TemplateId } from "@/templates/catalog/templates";

// Every free-text value is clamped before it reaches an ImageResponse: an unbounded string is a
// rendering-cost and timeout risk on a public, unauthenticated route.
export function clampOgText(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max).trimEnd()}…` : value;
}

// A given URL always renders the same image (the published page adds the site's `updatedAt` as
// `v`), so browsers and the CDN can keep it instead of re-rendering on every unfurl.
export const OG_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
};

export interface OgCard {
  name: string;
  headline: string;
  bio: string;
  availability: string;
  location: string;
  subdomain: string;
}

/**
 * The text on a template's social card: a published site's own values (`?subdomain=`), or the
 * template's sample card when no site is named. Never text from the URL: a branded card that says
 * whatever someone types, cached for a week, is a free phishing banner (S3). Null when the named
 * site is not published.
 */
export async function ogCard(
  request: Request,
  templateId: TemplateId,
  sample: Pick<OgCard, "bio" | "availability" | "location">,
): Promise<OgCard | null> {
  const subdomain = new URL(request.url).searchParams.get("subdomain");
  const template = templates.find((entry) => entry.id === templateId);
  let card: OgCard = {
    ...sample,
    name: `${template?.name ?? "Portfolio"} template`,
    headline: template?.note ?? "",
    subdomain: "yourname",
  };

  if (subdomain) {
    const publication = await getPublishedPortfolio(subdomain);
    if (!publication) return null;
    const { name, headline, bio, availability, location } = publication.snapshot.identity;
    card = { name, headline, bio, availability, location, subdomain: publication.subdomain };
  }

  return {
    name: clampOgText(card.name, 60),
    headline: clampOgText(card.headline, 100),
    bio: clampOgText(card.bio, 180),
    availability: clampOgText(card.availability, 60),
    location: clampOgText(card.location, 60),
    subdomain: clampOgText(card.subdomain, 63),
  };
}

export const ogNotFound = () => new Response("Not found", { status: 404 });
