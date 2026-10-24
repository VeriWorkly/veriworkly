"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@veriworkly/ui";

import { NAVIGATION_ITEMS } from "./constants";

/**
 * The hover and active pills are a `before:` layer on each link, driven by `:hover` and
 * `aria-current`. They used to be framer `layoutId` elements, which pulled framer's layout
 * projection (43.5 KB gz) onto every marketing page for one sliding highlight (W-028).
 */
export const DesktopNav = () => {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="pointer-events-auto relative hidden items-center gap-1 rounded-full border border-black/8 bg-white/85 p-1.5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.1)] backdrop-blur-xl lg:flex dark:border-white/10 dark:bg-[#121212]/90 dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]"
    >
      {NAVIGATION_ITEMS.map((item) => {
        const isActive = pathname === item.href;

        const Icon = item.icon;
        const isExternal = item.external;

        const LinkComponent = isExternal ? "a" : Link;
        const linkProps = isExternal
          ? { href: item.href, target: "_blank", rel: "noopener noreferrer" }
          : { href: item.href };

        return (
          <LinkComponent
            key={item.href}
            {...linkProps}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium text-zinc-600 transition-colors duration-200 select-none hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white",
              "before:absolute before:inset-0 before:scale-95 before:rounded-full before:border before:border-zinc-200/90 before:bg-zinc-100/90 before:opacity-0 before:shadow-2xs before:transition-[opacity,transform] before:duration-200 dark:before:border-white/10 dark:before:bg-white/12",
              "hover:before:scale-100 hover:before:opacity-100",
              "aria-[current=page]:font-semibold aria-[current=page]:text-zinc-950 aria-[current=page]:before:scale-100 aria-[current=page]:before:opacity-100 dark:aria-[current=page]:text-white",
            )}
          >
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
