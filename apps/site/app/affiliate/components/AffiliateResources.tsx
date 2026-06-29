"use client";

import { motion } from "framer-motion";
import { FolderOpen, ArrowRight, FileType, Check } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export function AffiliateResources() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => setDownloading(false), 2000);
  };

  return (
    <section className="mx-auto max-w-7xl border-t border-zinc-200/50 px-6 py-24 md:py-32 dark:border-zinc-800/30">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.8fr]">
        <div className="space-y-6">
          <span className="w-fit rounded-full bg-blue-500/10 px-3 py-1 font-mono text-[10px] font-bold tracking-widest text-blue-600 uppercase dark:bg-blue-500/20 dark:text-blue-400">
            Assets & Media
          </span>
          <h2 className="text-foreground text-4xl leading-tight font-bold tracking-tight md:text-5xl">
            Brand Assets <br />
            <span className="font-serif font-normal text-blue-600 italic dark:text-blue-400">
              Media Kit.
            </span>
          </h2>
          <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
            Access our official high-resolution vector logos, custom logomarks, typography tokens,
            and branding assets to style your promotional materials.
          </p>
          <div className="text-muted-foreground flex flex-col gap-3 pt-2 font-mono text-[10px]">
            <div className="flex items-center gap-2">
              <FileType className="h-4 w-4 text-blue-500" />
              <span>Includes SVG, PNG, and EPS source files</span>
            </div>
            <div className="flex items-center gap-2">
              <FileType className="h-4 w-4 text-blue-500" />
              <span>Light, dark, and monochromatic variants</span>
            </div>
          </div>
        </div>

        <div className="relative flex flex-col items-center justify-between gap-8 overflow-hidden rounded-3xl border border-zinc-200/60 bg-white/40 p-8 shadow-sm backdrop-blur-md md:p-10 lg:flex-row dark:border-zinc-800 dark:bg-zinc-900/30">
          <div className="pointer-events-none absolute inset-px rounded-[23px] border border-white/40 dark:border-zinc-800/30" />
          <div className="pointer-events-none absolute top-0 right-0 h-40 w-40 rounded-full bg-gradient-to-bl from-blue-500/5 to-transparent blur-3xl" />

          <div className="relative z-10 w-full flex-1 space-y-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200/30 bg-zinc-100 text-blue-600 dark:border-zinc-700/30 dark:bg-zinc-800/50 dark:text-blue-400">
                <FolderOpen className="h-5 w-5" />
              </span>
              <h4 className="text-foreground text-lg font-bold">Official Media Kit</h4>
            </div>

            <p className="text-muted-foreground max-w-md text-xs leading-relaxed">
              Download the complete ZIP archive including scalable vector locks, standalone brand
              icons, dark/light visual locks, and clearance spacing parameters.
            </p>

            <div className="pt-2">
              <motion.a
                whileTap={{ scale: 0.97 }}
                href="/veriworkly-logo.png"
                download
                onClick={handleDownload}
                className="group inline-flex w-full items-center justify-center rounded-xl bg-zinc-950 px-6 py-3 text-xs font-bold text-zinc-100 shadow-sm transition-colors duration-200 hover:bg-zinc-900 sm:w-auto dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                {downloading ? (
                  <>
                    <Check className="mr-2 h-4 w-4 animate-pulse text-emerald-500" />
                    Preparing ZIP...
                  </>
                ) : (
                  <>
                    Download Assets (ZIP)
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </motion.a>
            </div>
          </div>

          <div className="relative flex h-48 w-full shrink-0 flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-md select-none lg:w-48 dark:bg-black">
            <div className="pointer-events-none absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-[0.03]">
              {Array.from({ length: 36 }).map((_, i) => (
                <div key={i} className="border border-white" />
              ))}
            </div>

            <div className="relative flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-dashed border-zinc-800" />
              <div className="animate-spin-slow absolute inset-2 rounded-full border border-dashed border-zinc-800" />
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-950 px-1 font-mono text-[7px] text-zinc-600 select-none">
                R:24px
              </div>
              <Image
                src="/veriworkly-logo.png"
                alt="VeriWorkly Logomark"
                width={40}
                height={40}
                className="relative z-10 rounded-xl border border-zinc-800 shadow-lg"
              />
            </div>

            <div className="z-10 flex flex-col items-center gap-0.5">
              <span className="font-mono text-[8px] font-bold tracking-widest text-zinc-500 uppercase">
                Vector Lockups
              </span>
              <span className="font-mono text-[7px] text-zinc-600">1024 × 1024 px</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
