import { ExternalLink, Globe, Layers, Sparkles } from "lucide-react";

import SkeletonLine from "./SkeletonLine";

const PortfolioPreview = () => {
  return (
    <div className="flex h-full flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div>
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-3.5 sm:pb-4 dark:border-zinc-900">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className="relative flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 via-indigo-500 to-cyan-400 text-sm font-bold text-white shadow-xs sm:h-10 sm:w-10">
              G
              <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 sm:h-3 sm:w-3 dark:border-zinc-950" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="truncate text-sm font-bold text-zinc-900 sm:text-base dark:text-white">
                  Gautam Raj
                </h3>

                <span className="hidden rounded-full bg-blue-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-blue-600 sm:inline-block dark:text-blue-400">
                  gautam.veriworkly.me
                </span>
              </div>

              <p className="truncate text-[11px] text-zinc-500 sm:text-xs dark:text-zinc-400">
                React Architect &middot; UI/UX &amp; Systems Lead
              </p>
            </div>
          </div>

          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-600 sm:px-3 sm:py-1.5 sm:text-xs dark:text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="xs:inline hidden">Live &amp; </span>Synced
          </span>
        </div>

        <div className="mt-3.5 sm:mt-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[9px] font-bold tracking-widest text-zinc-400 uppercase">
              Featured Work
            </p>

            <span className="text-[10px] font-medium text-blue-500 hover:underline">
              View all (6)
            </span>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5">
            <div className="group flex flex-col justify-between rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 transition-colors hover:border-zinc-200 sm:p-3.5 dark:border-zinc-900 dark:bg-zinc-900/40 dark:hover:border-zinc-800">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-blue-500" />

                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      VeriWorkly Studio
                    </span>
                  </div>

                  <ExternalLink className="h-3 w-3 text-zinc-400 opacity-60 group-hover:opacity-100" />
                </div>

                <div className="mt-2 space-y-1">
                  <SkeletonLine width="w-full" animated />
                  <SkeletonLine width="w-4/5" animated />
                </div>
              </div>

              <div className="mt-2.5 flex gap-1 sm:mt-3">
                {["Next.js", "Tailwind"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-zinc-200/60 px-1.5 py-0.5 font-mono text-[9px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="group flex flex-col justify-between rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 transition-colors hover:border-zinc-200 sm:p-3.5 dark:border-zinc-900 dark:bg-zinc-900/40 dark:hover:border-zinc-800">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-indigo-500" />

                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      Design Tokens
                    </span>
                  </div>

                  <ExternalLink className="h-3 w-3 text-zinc-400 opacity-60 group-hover:opacity-100" />
                </div>

                <div className="mt-2 space-y-1">
                  <SkeletonLine width="w-full" animated />
                  <SkeletonLine width="w-3/4" animated />
                </div>
              </div>

              <div className="mt-2.5 flex gap-1 sm:mt-3">
                {["TypeScript", "NPM"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-zinc-200/60 px-1.5 py-0.5 font-mono text-[9px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 rounded-lg border border-zinc-100 bg-zinc-50/40 px-3 py-2 text-[10px] text-zinc-500 sm:mt-3.5 dark:border-zinc-900 dark:bg-zinc-900/30 dark:text-zinc-400">
          <span className="flex items-center gap-1 font-medium">
            <Sparkles className="h-3 w-3 text-amber-500" />
            6+ Yrs Exp
          </span>

          <span>&middot;</span>
          <span className="font-medium">14+ Repos</span>
          <span>&middot;</span>

          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            Open for Roles
          </span>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between border-t border-zinc-100 pt-3.5 sm:mt-4 sm:pt-4 dark:border-zinc-900">
        <span className="font-mono text-[10px] text-zinc-400">
          Custom Subdomain &middot; Free SSL
        </span>

        <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-blue-600 hover:underline sm:text-xs dark:text-blue-400">
          Visit Live Site
          <ExternalLink className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
};

export default PortfolioPreview;
