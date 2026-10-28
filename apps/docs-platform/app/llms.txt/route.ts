import { siteConfig } from "@/config/site";
import { buildLlmsIndex, readOpenApiSpec, sectionsInSidebarOrder, type LlmsPage } from "@/lib/llms";
import { source, apiSource, engineSource } from "@/lib/source";

export const dynamic = "force-static";

type Tree = Parameters<typeof sectionsInSidebarOrder>[0];

/** An llmstxt.org index of all three trees, built from the loaders and the bundled spec at build time. */
export function GET() {
  const apiPages = apiSource.getPages() as LlmsPage[];

  const body = buildLlmsIndex({
    siteUrl: siteConfig.url,
    spec: readOpenApiSpec(),
    docs: sectionsInSidebarOrder(source.getPageTree() as Tree, source.getPages()),
    engine: sectionsInSidebarOrder(engineSource.getPageTree() as Tree, engineSource.getPages()),
    api: sectionsInSidebarOrder(apiSource.getPageTree() as Tree, apiPages),
    apiPages,
  });

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
