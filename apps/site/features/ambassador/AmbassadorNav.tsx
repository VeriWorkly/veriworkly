"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { siteConfig } from "@/config/site";

const AmbassadorNav = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const navItems = [
    { label: "Home", target: "hero" },
    { label: "Earnings", target: "calculator-widget" },
    { label: "FAQ", target: "faq-section" },
  ];

  return (
    <header className="sticky top-6 z-50 mx-auto w-full max-w-5xl px-6">
      <div className="flex w-full items-center justify-between gap-4 md:gap-0">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="flex items-center rounded-full border border-zinc-200/50 bg-white/60 px-4 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-300 hover:border-indigo-500/20 dark:border-white/5 dark:bg-zinc-950/60 dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
        >
          <Link href="/" className="group flex items-center gap-3 active:scale-[0.98]">
            <div className="bg-zinc-150 relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-xl shadow-inner dark:bg-white/5">
              <Image
                src="/veriworkly-logo.png"
                alt="VeriWorkly Logo"
                width={20}
                height={20}
                className="object-contain transition-transform duration-500 group-hover:rotate-12"
              />
            </div>
            <span className="font-mono text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">
              VeriWorkly
            </span>
            <span className="text-indigo-650 rounded-full border border-indigo-500/10 bg-indigo-500/10 px-2 py-0.5 font-sans text-[8px] font-black tracking-widest uppercase dark:text-indigo-400">
              Campus
            </span>
          </Link>
        </motion.div>

        <nav className="relative hidden items-center gap-2 rounded-full border border-zinc-200/50 bg-white/60 px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl md:flex dark:border-white/5 dark:bg-zinc-950/60 dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          {navItems.map((item) => (
            <button
              key={item.label}
              onMouseEnter={() => setHoveredLink(item.label)}
              onMouseLeave={() => setHoveredLink(null)}
              onClick={() => {
                if (item.target === "hero") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  document.getElementById(item.target)?.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="relative cursor-pointer px-4 py-2 text-[11px] font-black tracking-widest text-zinc-600 uppercase transition-colors duration-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              <span className="relative z-10">{item.label}</span>
              {hoveredLink === item.label && (
                <motion.span
                  layoutId="nav-hover-pill"
                  className="bg-zinc-150/85 absolute inset-0 z-0 rounded-full dark:bg-white/5"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3 rounded-full border border-zinc-200/50 bg-white/60 px-4 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/5 dark:bg-zinc-950/60 dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 border-r border-zinc-200/50 pr-2 text-[10px] font-bold tracking-wider text-zinc-600 uppercase transition-colors duration-300 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-3 w-3 text-zinc-600 transition-transform duration-300 group-hover:-translate-x-0.5 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-white" />
            <span className="hidden sm:inline">Back</span>
          </Link>

          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="cursor-pointer border-r border-zinc-200/50 p-1 pr-2.5 text-zinc-600 transition-all hover:text-zinc-900 active:scale-95 dark:border-white/10 dark:text-zinc-400 dark:hover:text-white"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait">
                {theme === "dark" ? (
                  <motion.div
                    key="sun"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 90 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Sun className="h-3.5 w-3.5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ scale: 0, rotate: 90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: -90 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Moon className="h-3.5 w-3.5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          )}

          <Link
            href={`${siteConfig.links.app}/ambassador`}
            className="py-1.8 relative inline-flex items-center justify-center rounded-full bg-zinc-950 px-4 text-[10px] font-black tracking-wider text-white uppercase transition-all duration-300 hover:bg-zinc-900 active:scale-[0.97] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
          >
            Apply Program
          </Link>
        </div>
      </div>
    </header>
  );
};

export default AmbassadorNav;
