import { defineCollections, defineConfig } from "fumadocs-mdx/config";

import { blogFrontmatterSchema } from "./lib/blog-frontmatter";

export const blogPosts = defineCollections({
  type: "doc",
  dir: "content/blog",
  schema: blogFrontmatterSchema,
});

export default defineConfig();
