import { blog } from "@/lib/source";
import { siteConfig } from "@/config/site";
import { renderOgCard } from "@/lib/og-card";

export const dynamic = "force-static";
export const dynamicParams = false;

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const page = blog.getPage([slug]);

  if (!page) return new Response("Not found", { status: 404 });

  return renderOgCard({
    title: page.data.title,
    description: page.data.description || siteConfig.description,
    label: "VeriWorkly Blog",
    footer: "blog.veriworkly.com",
  });
}

export function generateStaticParams() {
  return blog.getPages().map((page) => ({ slug: page.slugs[0] }));
}
