import type { InferPageType } from "fumadocs-core/source";

import { loader } from "fumadocs-core/source";
import { toFumadocsSource } from "fumadocs-mdx/runtime/server";

import { blogPosts } from "collections/server";

export const blog = loader({
  baseUrl: "/",
  source: toFumadocsSource(blogPosts, []),
});

/** A loaded post: its URL and slugs, with the validated frontmatter, `body` and `toc` under `data`. */
export type BlogPost = InferPageType<typeof blog>;

export type BlogPostPage = BlogPost["data"];
