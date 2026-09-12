import { Globe, Gauge, LayoutGrid, BadgeDollarSign, type LucideIcon } from "lucide-react";

import { siteConfig } from "@/config/site";

export interface NavigationItem {
  name: string;
  href: string;
  description: string;
  icon: LucideIcon;
  external?: boolean;
  badge?: string;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    name: "Templates",
    href: "/templates",
    description: "ATS-ready resume & portfolio layouts",
    icon: LayoutGrid,
  },

  {
    name: "ATS Checker",
    href: "/ats-checker",
    description: "Scan & score your resume for recruiters",
    icon: Gauge,
    badge: "Free",
  },

  {
    name: "Pricing",
    href: "/pricing",
    description: "Transparent pricing, zero hidden locks",
    icon: BadgeDollarSign,
  },

  {
    name: "Portfolio",
    href: siteConfig.links.portfolio,
    description: "Personal websites on your own subdomain",
    external: true,
    icon: Globe,
  },
];
