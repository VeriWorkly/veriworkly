"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@veriworkly/ui";

import { NAVIGATION_ITEMS } from "./constants";

export const DesktopNav = () => {
  const pathname = usePathname();
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  return (
    <nav
      onMouseLeave={() => setHoveredHref(null)}
      className="pointer-events-auto relative hidden items-center gap-1 rounded-full border border-black/8 bg-white/85 p-1.5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.1)] backdrop-blur-xl lg:flex dark:border-white/10 dark:bg-[#121212]/90 dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]"
    >
      {NAVIGATION_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        const isHovered = hoveredHref === item.href;

        const Icon = item.icon;
        const isExternal = item.external;

        const LinkComponent = isExternal ? "a" : Link;
        const linkProps = isExternal
          ? {
              href: item.href,
              target: "_blank",
              rel: "noopener noreferrer",
            }
          : {
              href: item.href,
            };

        return (
          <LinkComponent
            key={item.href}
            {...linkProps}
            onMouseEnter={() => setHoveredHref(item.href)}
            className={cn(
              "group relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200 select-none",
              isActive
                ? "font-semibold text-zinc-950 dark:text-white"
                : isHovered
                  ? "text-zinc-950 dark:text-white"
                  : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white",
            )}
          >
            {isHovered && (
              <motion.div
                layoutId="nav-hover-pill"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
                className="absolute inset-0 rounded-full border border-zinc-200/90 bg-zinc-100/90 shadow-2xs dark:border-white/10 dark:bg-white/12"
              />
            )}

            {isActive && !isHovered && (
              <motion.div
                layoutId="nav-active-pill"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="absolute inset-0 rounded-full border border-zinc-200/60 bg-zinc-100/70 shadow-2xs dark:border-white/10 dark:bg-white/10"
              />
            )}

            <span className="relative z-10 flex items-center gap-1.5">
              {Icon && (
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110",
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-zinc-500 group-hover:text-zinc-800 dark:text-zinc-400 dark:group-hover:text-zinc-200",
                  )}
                  aria-hidden="true"
                />
              )}

              <span>{item.name}</span>

              {item.badge && (
                <span className="py-0.2 rounded-full bg-emerald-500/10 px-1.5 font-mono text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                  {item.badge}
                </span>
              )}

              {item.external && (
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-3 w-3 opacity-40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-500 group-hover:opacity-100"
                />
              )}
            </span>
          </LinkComponent>
        );
      })}
    </nav>
  );
};

export default DesktopNav;
