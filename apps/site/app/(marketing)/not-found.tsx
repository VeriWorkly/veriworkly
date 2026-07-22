import Link from "next/link";
import { ArrowRight, Compass, LayoutTemplate } from "lucide-react";

import { siteConfig } from "@/config/site";

export default function MarketingNotFound() {
  return (
    <section className="w-full bg-[#f3f4f6] p-2 md:p-3 lg:p-4 dark:bg-black">
      <div className="relative flex min-h-[70vh] w-full flex-col items-center justify-center overflow-hidden rounded-4xl border border-black/5 bg-white px-6 py-24 text-center dark:border-white/5 dark:bg-[#080808]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(120,119,198,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,119,198,0.05)_1px,transparent_1px)] mask-[radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] bg-size-[24px_24px]" />

        <p
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[16rem] leading-none font-black tracking-tighter text-transparent select-none sm:text-[22rem]"
          style={{ WebkitTextStroke: "1.5px rgba(37, 99, 235, 0.08)" }}
        >
          404
        </p>

        <div className="relative z-10 flex max-w-xl flex-col items-center">
          <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-blue-500/10 bg-blue-500/5 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            404
          </div>

          <h1 className="text-4xl font-semibold tracking-tighter text-balance text-zinc-900 sm:text-5xl dark:text-white">
            This page didn&apos;t make the cut
          </h1>

          <p className="mt-6 max-w-md text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
            It may have moved or never existed. Head back home, or browse the template directory
            instead.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/"
              className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-zinc-950 px-8 text-base font-semibold text-white shadow-md transition-all duration-300 hover:bg-blue-600 active:scale-[0.97] dark:bg-white dark:text-zinc-950 dark:hover:bg-blue-500 dark:hover:text-white"
            >
              Back to Home
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/templates"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 px-8 text-base font-medium text-zinc-800 backdrop-blur-md transition-colors hover:border-blue-500/30 hover:text-blue-600 dark:border-white/10 dark:bg-black/40 dark:text-zinc-200 dark:hover:text-blue-400"
            >
              <LayoutTemplate className="h-4 w-4" aria-hidden="true" />
              View Templates
            </Link>
          </div>

          <Link
            href={siteConfig.links.app}
            className="mt-8 text-sm font-medium text-zinc-400 underline-offset-4 hover:text-blue-600 hover:underline dark:text-zinc-600 dark:hover:text-blue-400"
          >
            Or open the Studio and start building
          </Link>
        </div>
      </div>
    </section>
  );
}
