import { LayoutGrid, Newspaper, BookOpen, BadgeDollarSign, Globe } from "lucide-react";

import { siteConfig } from "@/config/site";

export const NAVIGATION_ITEMS = [
  { name: "Templates", href: "/templates", icon: LayoutGrid },
  { name: "Pricing", href: "/pricing", icon: BadgeDollarSign },
  { name: "Portfolio", href: siteConfig.links.portfolio, external: true, icon: Globe },
  { name: "Blog", href: siteConfig.links.blog, external: true, icon: Newspaper },
  { name: "Docs", href: siteConfig.links.docs, external: true, icon: BookOpen },
];
