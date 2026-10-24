import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Every crawler, AI ones included, may read the whole site. A separate group that also
      // said `allow: /` for six AI bots changed nothing and is gone (W-063); a content-usage
      // statement (e.g. Content-Signal through `other`) is a policy decision left to the owner.
      {
        userAgent: "*",
        allow: "/",
      },
    ],

    sitemap: [
      `${siteConfig.url}/sitemap.xml`,
      `${siteConfig.links.app}/sitemap.xml`,
      `${siteConfig.links.blog}/sitemap.xml`,
      `${siteConfig.links.docs}/sitemap.xml`,
      `${siteConfig.links.portfolio}/sitemap.xml`,
    ],
  };
}
