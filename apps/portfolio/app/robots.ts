import type { MetadataRoute } from "next";
import { portfolioSiteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/templates/*/preview"] }],
    sitemap: `${portfolioSiteConfig.url}/sitemap.xml`,
  };
}
