import { Bot } from "lucide-react";

import GaplessBentoGrid from "@/features/landing/bento/GaplessBentoGrid";

export default function GaplessBento() {
  return (
    <section className="mx-auto w-full max-w-350 px-6 py-32 md:px-8 md:py-48">
      <div className="mb-20 flex flex-col justify-between gap-8 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <div className="mb-6 flex w-fit items-center gap-2 rounded-full border border-blue-500/10 bg-blue-500/5 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <Bot className="h-3.5 w-3.5" /> Workspace Features
          </div>
          <h2 className="font-sans text-4xl font-semibold tracking-tighter text-balance text-zinc-900 md:text-5xl lg:text-6xl dark:text-white">
            A complete career workspace
          </h2>
          <p className="mt-5 max-w-[50ch] text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
            Everything you need to apply, built on a privacy-first engine that runs entirely locally
            inside your browser.
          </p>
        </div>
      </div>

      <GaplessBentoGrid />
    </section>
  );
}
