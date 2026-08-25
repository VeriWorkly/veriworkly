import {
  LayoutGrid,
  Newspaper,
  BookOpen,
  BadgeDollarSign,
  Globe,
  Gauge,
  type LucideIcon,
} from "lucide-react";

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
    description: "Live personal websites published free",
    external: true,
    icon: Globe,
  },
  {
    name: "Blog",
    href: siteConfig.links.blog,
    description: "Career guides, ATS insights & updates",
    external: true,
    icon: Newspaper,
  },
  {
    name: "Docs",
    href: siteConfig.links.docs,
    description: "Architecture, local vault & API guide",
    external: true,
    icon: BookOpen,
  },
];
