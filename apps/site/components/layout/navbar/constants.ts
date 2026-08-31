import {
  LayoutGrid,
  Newspaper,
  BookOpen,
  BadgeDollarSign,
  Globe,
  Gauge,
  Layers,
  Workflow,
  Scale,
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

/**
 * Half of this list used to point off-site (portfolio, blog, docs) while /features,
 * /how-it-works, /compare and /faq - the pages built to rank - had no header link
 * from anywhere. Internal links from the site-wide nav are the strongest signal we
 * control, so the on-site destinations come first and the subdomains follow.
 */
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
    name: "Features",
    href: "/features",
    description: "Every engine, and what each one does",
    icon: Layers,
  },
  {
    name: "How It Works",
    href: "/how-it-works",
    description: "Draft, tailor, check, export, publish",
    icon: Workflow,
  },
  {
    name: "Compare",
    href: "/compare",
    description: "Honestly, against the tools you know",
    icon: Scale,
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
