"use client";

import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Watermark() {
  return (
    <div className="fixed right-4 bottom-4 z-9999">
      <Link
        href={siteConfig.links.main}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[11px] font-medium text-white/70 backdrop-blur-md transition hover:bg-black/80 hover:text-white"
      >
        <span>Built with</span>
        <span className="font-bold tracking-tight text-white">VeriWorkly</span>
      </Link>
    </div>
  );
}
