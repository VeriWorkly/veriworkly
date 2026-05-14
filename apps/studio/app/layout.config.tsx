/**
 * Shared navigation config for the main VeriWorkly app.
 * Note: This file is kept for reference only. The docs/blog platforms
 * have their own layout.config.tsx in their respective app/ directories.
 */

import { siteConfig } from "@/config/site";

export const baseNavLinks = [
  { text: "Dashboard", url: "/" },
  { text: "Templates", url: "/templates" },
  { text: "Roadmap", url: "/roadmap" },
  { text: "Development", url: "/stats" },
] as const;

export const githubUrl = siteConfig.links.github;
