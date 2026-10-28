import { siteConfig } from "@/config/site";
import { withEngineSizes } from "@/components/engine-size";
import { findOperation, readOpenApiSpec } from "@/lib/llms";
import { source, apiSource, engineSource, getPagesInOrder } from "@/lib/source";

export const dynamic = "force-static";

type Page = {
  url: string;
  data: {
    title: string;
    description?: string;
    _openapi?: unknown;
    getText: (type: "processed") => Promise<string>;
  };
};

/** Every page of the three trees as Markdown, in sidebar order, for language models to read whole. */
export async function GET() {
  const spec = readOpenApiSpec();

  const render = async (page: Page, transform: (text: string) => string = (text) => text) => {
    const { data } = page;
    const header = `# ${data.title}\n\nSource: ${siteConfig.url}${page.url}\n\n`;
    const description = data.description ? `${data.description.trim()}\n\n` : "";

    // An operation page's body is only the playground component; the spec holds the operation.
    if (data._openapi) {
      const operation = findOperation(spec, page.url.split("/").at(-1)!);
      const line = operation ? `\`${operation.method} ${operation.route}\`\n\n` : "";
      return `${header}${line}${description}`.trimEnd();
    }

    return `${header}${description}${transform(await data.getText("processed"))}`.trimEnd();
  };

  const sections = await Promise.all([
    ...getPagesInOrder(source).map((page) => render(page)),
    ...getPagesInOrder(engineSource).map((page) => render(page, withEngineSizes)),
    ...getPagesInOrder(apiSource).map((page) => render(page)),
  ]);

  return new Response(sections.join("\n\n---\n\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
