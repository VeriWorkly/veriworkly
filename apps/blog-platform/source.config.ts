import { z } from "zod";
import { defineCollections, defineConfig } from "fumadocs-mdx/config";

export const blogPosts = defineCollections({
  type: "doc",
  dir: "content/blog",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string(),
    date: z.string().or(z.date()),
  }),
});

export default defineConfig();
