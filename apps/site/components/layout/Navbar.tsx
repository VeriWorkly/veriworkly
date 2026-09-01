"use client";

import { useTheme } from "next-themes";
import { Menu, X } from "lucide-react";
import React, { useState, useRef, useCallback } from "react";

import { cn } from "@veriworkly/ui";

import { useMounted } from "@/hooks/use-mounted";
import { useScrolled } from "@/hooks/use-scrolled";
import { useFocusTrap } from "@/hooks/use-focus-trap";

import { LogoPill } from "./navbar/LogoPill";
import { DesktopNav } from "./navbar/DesktopNav";
import { ActionsPill } from "./navbar/ActionsPill";
import { MobileMenu, MOBILE_MENU_ID } from "./navbar/MobileMenu";

const Navbar = () => {
  const mounted = useMounted();
  const scrolled = useScrolled(20);

  const { resolvedTheme, setTheme } = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const isDark = resolvedTheme === "dark";

  const toggleTheme = useCallback(() => {
    setTheme(isDark ? "light" : "dark");
  }, [isDark, setTheme]);

  useFocusTrap(mobileMenuOpen, mobileMenuRef, {
    onEscape: () => setMobileMenuOpen(false),
  });

  return (
    <>
      <header
        className={cn(
          "pointer-events-none fixed top-2 right-2 left-2 z-50 transition-all duration-300 md:top-4 md:right-4 md:left-4",
          scrolled ? "py-2" : "py-4",
        )}
      >
        <div className="container mx-auto flex max-w-7xl items-center justify-between px-4">
          <LogoPill />
          <DesktopNav />
          <ActionsPill mounted={mounted} isDark={isDark} onToggleTheme={toggleTheme} />

          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={mobileMenuOpen}
            aria-controls={MOBILE_MENU_ID}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            className="pointer-events-auto rounded-full border border-black/5 bg-white/70 p-2.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] backdrop-blur-md lg:hidden dark:border-white/5 dark:bg-[#111]/70"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      <MobileMenu
        isDark={isDark}
        mounted={mounted}
        isOpen={mobileMenuOpen}
        menuRef={mobileMenuRef}
        onToggleTheme={toggleTheme}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  );
};

export default React.memo(Navbar);
