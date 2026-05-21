import { loader } from "fumadocs-core/source";
import type { PageData } from "fumadocs-core/source";
import { toFumadocsSource } from "fumadocs-mdx/runtime/server";

import { blogPosts } from "../.source/server";

type BlogPostPage = (typeof blogPosts)[number] & PageData;

export const blog = loader({
  baseUrl: "/",
  source: toFumadocsSource<BlogPostPage, never>(blogPosts as BlogPostPage[], []),
});
