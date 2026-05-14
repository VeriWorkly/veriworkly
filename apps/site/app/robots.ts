import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "ClaudeBot",
          "PerplexityBot",
          "Google-Extended",
          "CCBot",
        ],
        allow: "/",
      },
    ],

    sitemap: [
      `${siteConfig.url}/sitemap.xml`,
      `${siteConfig.links.app}/sitemap.xml`,
      `${siteConfig.links.blog}/sitemap.xml`,
      `${siteConfig.links.docs}/sitemap.xml`,
    ],
  };
}
