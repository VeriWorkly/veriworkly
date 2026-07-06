import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  const commonDisallows = [
    "/",
    "/admin/",
    "/editor",
    "/profile",
    "/settings",
    "/api/",
    "/test",
    "/og-generator",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/share/", "/login"],
        disallow: commonDisallows,
      },
      {
        userAgent: ["GPTBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot", "Google-Extended"],
        allow: ["/share/", "/login"],
        disallow: commonDisallows,
      },
      {
        userAgent: ["CCBot"],
        allow: ["/share/"],
        disallow: commonDisallows,
      },
    ],

    sitemap: [
      `${siteConfig.url}/sitemap.xml`,
      "https://blog.veriworkly.com/sitemap.xml",
      "https://docs.veriworkly.com/sitemap.xml",
    ],
  };
}
