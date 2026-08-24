import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@veriworkly/ui";

import { NAVIGATION_ITEMS } from "./constants";

export const DesktopNav = () => {
  const pathname = usePathname();

  return (
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
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="absolute inset-0 rounded-full bg-black/5 dark:bg-white/10"
              />
            )}
            <span className="relative z-10 flex items-center gap-1">
              {item.name}

              {item.external && (
                <>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

export default DesktopNav;
