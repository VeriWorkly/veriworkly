"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function AffiliateNav() {
  return (
    <header className="sticky top-4 z-50 mx-auto w-full max-w-7xl px-4">
      <div className="flex w-full items-center justify-between rounded-full border border-zinc-200/50 bg-white/70 px-6 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.04)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md transition-all duration-300 dark:border-zinc-800/50 dark:bg-zinc-950/70 dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
        <Link
          href="/"
          className="group flex items-center gap-2.5 transition-transform duration-200 active:scale-[0.98]"
        >
          <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-zinc-200/10 shadow-sm transition-transform group-hover:scale-105">
            <Image
              src="/veriworkly-logo.png"
              alt="VeriWorkly Logo"
              width={26}
              height={26}
              className="object-contain"
            />
          </div>
          <span className="text-foreground font-mono text-base font-semibold tracking-tight">
            VeriWorkly
          </span>
          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-blue-600 uppercase dark:text-blue-400">
            Partner
          </span>
        </Link>

        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 active:scale-[0.98]"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span>Back to Home</span>
        </Link>
      </div>
    </header>
  );
}
