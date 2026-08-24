import Link from "next/link";
import Image from "next/image";

import { siteConfig } from "@/config/site";

export const LogoPill = () => {
  return (
    <Link
      href="/"
      aria-label={`${siteConfig.shortName} home`}
      className="group pointer-events-auto relative flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-5 py-2.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] backdrop-blur-md transition-transform hover:scale-[1.02] dark:border-white/5 dark:bg-[#111]/70"
    >
      <Image
        priority
        width={24}
        height={24}
        alt="VeriWorkly"
        className="h-6 w-auto"
        src="/veriworkly-logo.png"
      />
      <span className="hidden font-mono font-bold tracking-tight text-gray-900 sm:block dark:text-white">
        {siteConfig.shortName || "VeriWorkly"}
      </span>
    </Link>
  );
};

export default LogoPill;
