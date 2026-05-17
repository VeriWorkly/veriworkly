import { LayoutGrid, Map, Terminal, Newspaper, BookOpen } from "lucide-react";

import { siteConfig } from "@/config/site";

export const NAVIGATION_ITEMS = [
  { name: "Templates", href: "/templates", icon: LayoutGrid },
  { name: "Roadmap", href: "/roadmap", icon: Map },
  { name: "Development", href: "/stats", icon: Terminal },
  { name: "Blog", href: siteConfig.links.blog, external: true, icon: Newspaper },
  { name: "Docs", href: siteConfig.links.docs, external: true, icon: BookOpen },
];
