import { siteConfig } from "@/config/site";
import { withEngineSizes } from "@/components/engine-size";
import { getEnginePagesInOrder } from "@/lib/source";

export const revalidate = false;

/** Every ATS Engine docs page as Markdown, in sidebar order, for language models to read whole. */
export async function GET() {
  const sections = await Promise.all(
    getEnginePagesInOrder().map(async (page) => {
      const { data } = page;
      // The size tags as their numbers: a model reads the Markdown, not the rendered page.
      const text = withEngineSizes(await data.getText("processed"));

      return `# ${data.title}\n\nSource: ${siteConfig.url}${page.url}\n\n${data.description ? `${data.description}\n\n` : ""}${text}`;
    }),
  );

  return new Response(sections.join("\n\n---\n\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
