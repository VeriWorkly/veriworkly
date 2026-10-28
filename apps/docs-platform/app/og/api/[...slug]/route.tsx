import { apiSource } from "@/lib/source";
import { renderOgCard } from "@/lib/og-card";

export const dynamic = "force-static";
export const dynamicParams = false;

type RouteContext = {
  params: Promise<{ slug: string[] }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const page = slug.at(-1) === "image.png" ? apiSource.getPage(slug.slice(0, -1)) : undefined;

  if (!page) return new Response("Not found", { status: 404 });

  return renderOgCard({
    title: page.data.title ?? "VeriWorkly API",
    description:
      page.data.description ||
      "Technical documentation and API reference for the VeriWorkly platform.",
    label: "VeriWorkly API",
    footer: "docs.veriworkly.com",
  });
}

export function generateStaticParams() {
  return apiSource.getPages().map((page) => ({
    slug: [...page.slugs, "image.png"],
  }));
}
