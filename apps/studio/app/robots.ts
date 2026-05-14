import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/share/"],
        disallow: [
          "/admin/",
          "/",
          "/editor",
          "/login",
          "/profile",
          "/settings",
          "/api/",
          "/test",
          "/og-generator",
        ],
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
        allow: ["/share/"],
      },
    ],

    sitemap: [
      `${siteConfig.url}/sitemap.xml`,
      "https://blogs.veriworkly.com/sitemap.xml",
      "https://docs.veriworkly.com/sitemap.xml",
    ],
  };
}
