import { LayoutGrid, Map, Terminal, Newspaper, BookOpen } from "lucide-react";
import { siteConfig } from "@/config/site";

export const NAVIGATION_ITEMS = [
  {
    name: "Templates",
    href: `${siteConfig.links.main}/templates`,
    external: true,
    icon: LayoutGrid,
  },
  { name: "Roadmap", href: `${siteConfig.links.main}/roadmap`, external: true, icon: Map },
  { name: "Development", href: `${siteConfig.links.main}/stats`, external: true, icon: Terminal },
  { name: "Blog", href: siteConfig.links.blog, external: true, icon: Newspaper },
  { name: "Docs", href: "/docs", external: false, icon: BookOpen },
];
