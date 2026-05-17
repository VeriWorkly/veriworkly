"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { usePathname } from "next/navigation";

import type { MarketingNavItem } from "./types";

import { cn } from "../../../utils";

interface MarketingDesktopNavProps {
  items: MarketingNavItem[];
}

export const MarketingDesktopNav = ({ items }: MarketingDesktopNavProps) => {
  const pathname = usePathname();

  return (
    <div className="hidden items-center gap-1 lg:flex">
      {items.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          target={item.external ? "_blank" : undefined}
          rel={item.external ? "noopener noreferrer" : undefined}
          className={cn(
            "text-muted hover:text-foreground hover:bg-accent/5 relative flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
            pathname === item.href && "text-foreground bg-accent/10",
          )}
        >
          <span className="font-sans">{item.name}</span>

          {item.external && (
            <ArrowUpRight className="h-3.5 w-3.5 opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          )}
        </Link>
      ))}
    </div>
  );
};
