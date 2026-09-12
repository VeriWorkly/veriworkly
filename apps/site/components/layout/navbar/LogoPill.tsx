import Link from "next/link";
import Image from "next/image";

import { siteConfig } from "@/config/site";

export const LogoPill = () => {
  return (
    <Link
      href="/"
      aria-label={`${siteConfig.shortName} home`}
      className="group pointer-events-auto relative flex items-center gap-2.5 rounded-full border border-black/5 bg-white/75 px-4.5 py-2 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] dark:border-white/10 dark:bg-[#111]/80 dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)]"
    >
      <Image
        priority
        width={22}
        height={22}
        alt="VeriWorkly"
        src="/veriworkly-logo.png"
        className="h-5.5 w-auto transition-transform duration-200 group-hover:rotate-6"
      />
      <span className="hidden font-mono text-sm font-bold tracking-tight text-zinc-900 sm:block dark:text-white">
        {siteConfig.shortName || "VeriWorkly"}
      </span>
    </Link>
  );
};

export default LogoPill;
