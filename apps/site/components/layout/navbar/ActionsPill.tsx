import Link from "next/link";
import Image from "next/image";
import { Moon, Sun } from "lucide-react";

import { siteConfig } from "@/config/site";

interface ActionsPillProps {
  mounted: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const ActionsPill = ({ mounted, isDark, onToggleTheme }: ActionsPillProps) => {
  return (
    <div className="pointer-events-auto hidden items-center gap-1 rounded-full border border-black/5 bg-white/70 p-1.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] backdrop-blur-md md:flex dark:border-white/5 dark:bg-[#111]/70">
      <button
        type="button"
        onClick={onToggleTheme}
        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label={mounted ? `Switch to ${isDark ? "light" : "dark"} theme` : "Toggle theme"}
      >
        {mounted ? (
          isDark ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )
        ) : (
          <div className="h-4 w-4" />
        )}
      </button>

      <Link
        target="_blank"
        rel="noreferrer"
        href={siteConfig.links.github}
        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label="GitHub Repository"
      >
        <Image
          width={16}
          height={16}
          alt="GitHub"
          src="/icons/socials/github.svg"
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
  );
};

export default ActionsPill;
