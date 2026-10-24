"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Moon, Sun, ArrowUpRight, ChevronRight, Sparkles, Compass } from "lucide-react";

import { cn } from "@veriworkly/ui";
import { siteConfig } from "@/config/site";
import { useFocusTrap } from "@/hooks/use-focus-trap";

import { MOBILE_MENU_ID, NAVIGATION_ITEMS } from "./constants";

interface MobileMenuProps {
  onClose: () => void;
  mounted: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
}

/**
 * Rendered only while open and loaded with next/dynamic on first open, so the menu is not in
 * the initial bundle. Entry is a CSS transition from @starting-style (the starting: variant);
 * there is no exit animation.
 */
export const MobileMenu = ({ onClose, mounted, isDark, onToggleTheme }: MobileMenuProps) => {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  useFocusTrap(true, menuRef, { onEscape: onClose });

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md transition-opacity duration-200 lg:hidden dark:bg-black/75 starting:opacity-0"
      />

      <div
        ref={menuRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        id={MOBILE_MENU_ID}
        aria-label="Site navigation"
        className="fixed inset-x-3 top-20 z-50 flex max-h-[calc(100dvh-6rem)] flex-col justify-between overflow-hidden rounded-3xl border border-zinc-200/90 bg-white/95 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] backdrop-blur-2xl transition-[opacity,transform] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)] sm:top-22 lg:hidden dark:border-white/12 dark:bg-[#121212]/95 dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] starting:-translate-y-3 starting:scale-[0.98] starting:opacity-0"
      >
        <div className="flex items-center justify-between border-b border-zinc-100/90 px-5 py-3.5 dark:border-white/8">
          <div className="flex items-center gap-2">
            <Compass className="h-3.5 w-3.5 text-blue-500" />

            <span className="font-mono text-[11px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
              Navigation
            </span>
          </div>

          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            v3.24
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5">
          <nav className="flex flex-col gap-1.5">
            {NAVIGATION_ITEMS.map((item) => {
              const isActive = pathname === item.href;

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
                <div key={item.href}>
                  <LinkComponent
                    {...linkProps}
                    onClick={onClose}
                    className={cn(
                      "group relative flex items-center justify-between rounded-2xl p-3 transition-all duration-150 active:scale-[0.98]",
                      isActive
                        ? "border border-blue-500/20 bg-blue-50/80 shadow-2xs dark:border-blue-500/30 dark:bg-blue-500/10"
                        : "border border-transparent hover:border-zinc-200/60 hover:bg-zinc-100/80 dark:hover:border-white/5 dark:hover:bg-white/5",
                    )}
                  >
                    <div className="flex items-center gap-3.5">
                      {Icon && (
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                            isActive
                              ? "bg-blue-600 text-white shadow-xs dark:bg-blue-500"
                              : "bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200 group-hover:text-zinc-900 dark:bg-white/8 dark:text-zinc-300 dark:group-hover:bg-white/12 dark:group-hover:text-white",
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                      )}

                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "text-sm font-semibold tracking-tight",
                              isActive
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-zinc-900 dark:text-white",
                            )}
                          >
                            {item.name}
                          </span>

                          {item.badge && (
                            <span className="py-0.2 rounded-full bg-emerald-500/10 px-1.5 font-mono text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                              {item.badge}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {item.description}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pr-1">
                      {isExternal ? (
                        <ArrowUpRight
                          aria-hidden="true"
                          className="h-4 w-4 text-zinc-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-500 dark:text-zinc-500"
                        />
                      ) : isActive ? (
                        <span className="h-2 w-2 rounded-full bg-blue-600 shadow-[0_0_8px_#2563eb] dark:bg-blue-400" />
                      ) : (
                        <ChevronRight
                          aria-hidden="true"
                          className="h-4 w-4 text-zinc-300 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-zinc-600"
                        />
                      )}
                    </div>
                  </LinkComponent>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-zinc-100 bg-zinc-50/80 p-4 dark:border-white/8 dark:bg-black/40">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onToggleTheme}
                className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200/90 bg-white p-2 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors active:scale-[0.98] dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-200"
                aria-label={
                  mounted ? `Switch to ${isDark ? "light" : "dark"} theme` : "Toggle theme"
                }
              >
                {mounted ? (
                  isDark ? (
                    <>
                      <Sun className="h-4 w-4 text-amber-500" />
                      <span>Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4 text-indigo-500" />
                      <span>Dark Mode</span>
                    </>
                  )
                ) : (
                  <span>Theme</span>
                )}
              </button>

              <Link
                target="_blank"
                rel="noreferrer"
                href={siteConfig.links.github}
                className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200/90 bg-white p-2 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors active:scale-[0.98] dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-200"
                aria-label="GitHub Repository"
              >
                <Image
                  width={16}
                  height={16}
                  alt="GitHub"
                  src="/icons/socials/github.svg"
                  className="h-4 w-4 opacity-80 dark:invert"
                />
                <span>GitHub</span>
                <ArrowUpRight className="h-3 w-3 opacity-50" />
              </Link>
            </div>

            <a
              onClick={onClose}
              href={siteConfig.links.app}
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-blue-600 active:scale-[0.98] dark:bg-white dark:text-zinc-950 dark:hover:bg-blue-500 dark:hover:text-white"
            >
              <Sparkles className="h-4 w-4 text-blue-400 transition-transform duration-200 group-hover:scale-110" />
              <span>Start Building Free</span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;
