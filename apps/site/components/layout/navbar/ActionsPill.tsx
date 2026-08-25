import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

import { siteConfig } from "@/config/site";

interface ActionsPillProps {
  mounted: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const ActionsPill = ({ mounted, isDark, onToggleTheme }: ActionsPillProps) => {
  return (
    <div className="pointer-events-auto hidden items-center gap-1 rounded-full border border-black/5 bg-white/75 p-1.5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:flex dark:border-white/10 dark:bg-[#111]/80 dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)]">
      <button
        type="button"
        onClick={onToggleTheme}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label={mounted ? `Switch to ${isDark ? "light" : "dark"} theme` : "Toggle theme"}
      >
        {mounted ? (
          <motion.div
            key={isDark ? "dark" : "light"}
            initial={{ rotate: -45, scale: 0.8, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-500" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-500" />
            )}
          </motion.div>
        ) : (
          <div className="h-4 w-4" />
        )}
      </button>

      <Link
        target="_blank"
        rel="noreferrer"
        href={siteConfig.links.github}
        className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label="GitHub Repository"
      >
        <Image
          width={16}
          height={16}
          alt="GitHub"
          src="/icons/socials/github.svg"
          className="h-4 w-4 opacity-75 transition-opacity hover:opacity-100 dark:invert"
        />
      </Link>

      <a
        href={`${siteConfig.links.app}/login`}
        className="ml-1 hidden rounded-full bg-zinc-950 px-4.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all duration-200 ease-out hover:bg-blue-600 hover:shadow-sm active:scale-[0.97] xl:block dark:bg-white dark:text-zinc-950 dark:hover:bg-blue-500 dark:hover:text-white"
      >
        Get Started
      </a>
    </div>
  );
};

export default ActionsPill;
