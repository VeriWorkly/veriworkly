import { engineSource } from "@/lib/source";
import { renderOgCard } from "@/lib/og-card";

export const dynamic = "force-static";
export const dynamicParams = false;

type RouteContext = {
  params: Promise<{ slug: string[] }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const page = slug.at(-1) === "image.png" ? engineSource.getPage(slug.slice(0, -1)) : undefined;

  if (!page) return new Response("Not found", { status: 404 });

  return renderOgCard({
    title: page.data.title,
    description:
      page.data.description ||
      "Open-source ATS resume parser and scorer for TypeScript and JavaScript.",
    label: "VeriWorkly ATS Engine",
    footer: "docs.veriworkly.com/ats-engine",
  });
}

export function generateStaticParams() {
  return engineSource.getPages().map((page) => ({
    slug: [...page.slugs, "image.png"],
  }));
}
