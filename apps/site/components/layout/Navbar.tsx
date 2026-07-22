/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/config/site";
import { NAVIGATION_ITEMS } from "./navbar/constants";
import { cn } from "@veriworkly/ui";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Moon, Sun, ArrowUpRight } from "lucide-react";
import { useTheme } from "next-themes";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "pointer-events-none fixed top-2 right-2 left-2 z-50 transition-all duration-300 md:top-4 md:right-4 md:left-4",
          scrolled ? "py-2" : "py-4",
        )}
      >
        <div className="container mx-auto flex max-w-7xl items-center justify-between px-4">
          {/* Logo Pill */}
          <Link
            href={siteConfig.links.main || "/"}
            className="group pointer-events-auto relative flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-5 py-2.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] backdrop-blur-md transition-transform hover:scale-[1.02] dark:border-white/5 dark:bg-[#111]/70"
          >
            <img src="/veriworkly-logo.png" alt="VeriWorkly" className="h-6 w-auto" />
            <span className="hidden font-mono font-bold tracking-tight text-gray-900 sm:block dark:text-white">
              {siteConfig.shortName || "VeriWorkly"}
            </span>
          </Link>

          {/* Desktop Nav Pill */}
          <nav className="pointer-events-auto hidden items-center gap-1 rounded-full border border-black/5 bg-white/70 px-2 py-1.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] backdrop-blur-md md:flex dark:border-white/5 dark:bg-[#111]/70">
            {NAVIGATION_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className={cn(
                    "relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-full bg-black/5 dark:bg-white/10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1">
                    {item.name}
                    {item.external && <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Actions Pill */}
          <div className="pointer-events-auto hidden items-center gap-1 rounded-full border border-black/5 bg-white/70 p-1.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] backdrop-blur-md md:flex dark:border-white/5 dark:bg-[#111]/70">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Toggle theme"
            >
              {mounted ? (
                theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )
              ) : (
                <div className="h-4 w-4" />
              )}
            </button>

            {/* GitHub Link */}
            <Link
              href={siteConfig.links.github}
              target="_blank"
              rel="noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="GitHub Repository"
            >
              <img
                src="/icons/socials/github.svg"
                alt="GitHub"
                className="h-4 w-4 opacity-80 transition-opacity hover:opacity-100 dark:invert"
              />
            </Link>

            <Link
              href={`${siteConfig.links.app}/login`}
              className="ml-1 rounded-full bg-gray-900 px-5 py-1.5 text-sm font-medium text-white shadow-sm transition-[transform,box-shadow] duration-200 ease-out hover:scale-[1.02] active:scale-[0.97] dark:bg-white dark:text-gray-900"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="pointer-events-auto rounded-full border border-black/5 bg-white/70 p-2.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] backdrop-blur-md md:hidden dark:border-white/5 dark:bg-[#111]/70"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 top-24 z-40 flex flex-col gap-4 rounded-3xl border border-black/5 bg-white/95 p-4 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] backdrop-blur-xl md:hidden dark:border-white/5 dark:bg-[#111]/95"
          >
            <nav className="flex flex-col gap-1">
              {NAVIGATION_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "rounded-2xl px-4 py-3 text-base font-medium transition-colors",
                      isActive
                        ? "bg-black/5 text-gray-900 dark:bg-white/10 dark:text-white"
                        : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {item.name}
                      {item.external && <ArrowUpRight className="h-4 w-4 opacity-50" />}
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
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
                  aria-label="Toggle theme"
                >
                  {mounted ? (
                    theme === "dark" ? (
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
                  href={siteConfig.links.github}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
                  aria-label="GitHub Repository"
                >
                  <img
                    src="/icons/socials/github.svg"
                    alt="GitHub"
                    className="h-5 w-5 opacity-80 transition-opacity hover:opacity-100 dark:invert"
                  />
                </Link>
              </div>

              <Link
                href={`${siteConfig.links.app}/login`}
                className="flex items-center justify-center rounded-2xl bg-gray-900 px-4 py-3 text-base font-medium text-white shadow-sm transition-transform active:scale-[0.98] dark:bg-white dark:text-gray-900"
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default React.memo(Navbar);
