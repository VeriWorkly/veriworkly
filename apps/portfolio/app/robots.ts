import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/editor",
          "/analytics",
          "/settings",
          "/billing",
          "/templates/*/preview",
        ],
      },
    ],

    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
