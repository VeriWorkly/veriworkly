import { z } from "zod";
import { pageSchema } from "fumadocs-core/source/schema";
import { defineDocs, defineConfig } from "fumadocs-mdx/config";
import lastModified from "fumadocs-mdx/plugins/last-modified";

// `metaTitle` replaces `title` in `<title>` where two pages would otherwise share one.
const schema = pageSchema.extend({ metaTitle: z.string().optional() });

// Every page is kept as Markdown for /llms-full.txt and /ats-engine/llms-full.txt.
export const docs = defineDocs({
  dir: "content/docs",
  docs: { schema, postprocess: { includeProcessedMarkdown: true } },
});

export const api = defineDocs({
  dir: "content/api-reference",
  docs: { schema, postprocess: { includeProcessedMarkdown: true } },
});

export const engine = defineDocs({
  dir: "content/ats-engine",
  docs: { schema, postprocess: { includeProcessedMarkdown: true } },
});

// Git commit dates, for the sitemap.
export default defineConfig({ plugins: [lastModified()] });
