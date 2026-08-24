import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Moon, Sun, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

import { NAVIGATION_ITEMS } from "./constants";

export const MOBILE_MENU_ID = "site-mobile-menu";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  mounted: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}

export const MobileMenu = ({
  isOpen,
  onClose,
  mounted,
  isDark,
  onToggleTheme,
  menuRef,
}: MobileMenuProps) => {
  const pathname = usePathname();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            onClick={onClose}
            aria-hidden="true"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key="mobile-menu-backdrop"
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] md:hidden dark:bg-black/50"
          />

          <motion.div
            ref={menuRef}
            role="dialog"
            tabIndex={-1}
            aria-modal="true"
            id={MOBILE_MENU_ID}
            key="mobile-menu-panel"
            aria-label="Site navigation"
            transition={{ duration: 0.2 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed inset-x-4 top-24 z-40 flex flex-col gap-4 rounded-3xl border border-black/5 bg-white/95 p-4 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] backdrop-blur-xl md:hidden dark:border-white/5 dark:bg-[#111]/95"
          >
            <nav className="flex flex-col gap-1">
              {NAVIGATION_ITEMS.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    className={cn(
                      "rounded-2xl px-4 py-3 text-base font-medium transition-colors",
                      isActive
                        ? "bg-black/5 text-gray-900 dark:bg-white/10 dark:text-white"
                        : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {item.name}

                      {item.external && (
                        <>
                          <ArrowUpRight className="h-4 w-4 opacity-50" aria-hidden="true" />
                          <span className="sr-only">(opens in a new tab)</span>
                        </>
                      )}
                    </span>
                  </Link>
                );
              })}
            </nav>

            <div className="h-px w-full bg-gray-100 dark:bg-white/10" />

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-4">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Theme</span>

                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
                  aria-label={
                    mounted ? `Switch to ${isDark ? "light" : "dark"} theme` : "Toggle theme"
                  }
                >
                  {mounted ? (
                    isDark ? (
                      <Sun className="h-5 w-5" />
                    ) : (
                      <Moon className="h-5 w-5" />
                    )
                  ) : (
                    <div className="h-5 w-5" />
                  )}
                </button>
              </div>

              <div className="mb-2 flex items-center justify-between px-4">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">GitHub</span>

                <Link
                  target="_blank"
                  rel="noreferrer"
                  href={siteConfig.links.github}
                  aria-label="GitHub Repository"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
                >
                  <Image
                    width={20}
                    height={20}
                    alt="GitHub"
                    src="/icons/socials/github.svg"
                    className="h-5 w-5 opacity-80 transition-opacity hover:opacity-100 dark:invert"
                  />
                </Link>
              </div>

              <Link
                onClick={onClose}
                href={`${siteConfig.links.app}/login`}
                className="flex items-center justify-center rounded-2xl bg-gray-900 px-4 py-3 text-base font-medium text-white shadow-sm transition-transform active:scale-[0.98] dark:bg-white dark:text-gray-900"
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileMenu;
