import fs from "fs";
import path from "path";

export interface BlogPostFeedItem {
  title: string;
  description: string;
  href: string;
  date: string;
  readTime: string;
}

export function getLatestBlogPosts(): BlogPostFeedItem[] {
  try {
    const blogDir = path.join(process.cwd(), "..", "blog-platform", "content", "blog");

    if (!fs.existsSync(blogDir)) {
      console.warn("Blog directory does not exist at:", blogDir);
      return [];
    }

    const files = fs.readdirSync(blogDir);
    const posts: BlogPostFeedItem[] = [];

    for (const filename of files) {
      if (!filename.endsWith(".mdx")) continue;

      const fullPath = path.join(blogDir, filename);
      const content = fs.readFileSync(fullPath, "utf-8");

      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!match) continue;

      const frontmatterText = match[1];
      const metadata: Record<string, string> = {};

      frontmatterText.split("\n").forEach((line) => {
        const separatorIndex = line.indexOf(":");

        if (separatorIndex !== -1) {
          const key = line.slice(0, separatorIndex).trim();
          const value = line
            .slice(separatorIndex + 1)
            .trim()
            .replace(/^['"]|['"]$/g, "");
          metadata[key] = value;
        }
      });

      const bodyContent = content.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");
      const words = bodyContent.trim().split(/\s+/).length;
      const minutes = Math.ceil(words / 200);

      const slug = filename.replace(/\.mdx$/, "");
      const rawDate = metadata.date || "";

      const formattedDate = rawDate
        ? new Date(rawDate).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : "";

      posts.push({
        title: metadata.title || "Untitled Post",
        description: metadata.description || "",
        href: `https://blog.veriworkly.com/${slug}`,
        date: formattedDate,
        readTime: `${minutes} min read`,
      });
    }

    return posts
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  } catch (error) {
    console.error("Failed to read latest blog posts dynamically:", error);
    return [];
  }
}
