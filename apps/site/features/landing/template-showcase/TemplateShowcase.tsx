import { Sparkles, ArrowRight } from "lucide-react";

import { siteConfig } from "@/config/site";
import TemplateShowcaseTracks from "@/features/landing/template-showcase/TemplateShowcaseTracks";

export default function TemplateShowcase() {
  return (
    <section className="relative w-full overflow-hidden bg-white py-32 md:py-48 dark:bg-[#000000]">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute top-1/2 left-1/4 h-100 w-100 -translate-y-1/2 rounded-full bg-blue-500/5 blur-[100px] dark:bg-blue-500/10" />
      <div className="pointer-events-none absolute top-1/2 right-1/4 h-100 w-100 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-[100px] dark:bg-cyan-500/10" />

      <div className="mx-auto max-w-350 px-6 md:px-8">
        <div className="mb-20 text-center">
          <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-blue-500/10 bg-blue-500/5 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <Sparkles className="h-3.5 w-3.5" /> High-End Templates
          </div>
          <h2 className="mx-auto max-w-3xl font-sans text-4xl font-semibold tracking-tighter text-balance text-zinc-900 md:text-5xl lg:text-6xl dark:text-white">
            Visual layouts built for recruiter compliance
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
            Designed to parse flawlessly on applicant tracking systems while retaining an editorial,
            high-end visual aesthetic.
          </p>
        </div>
      </div>

      <TemplateShowcaseTracks />

      <div className="mt-16 flex justify-center">
        <a
          href={`${siteConfig.links.app}/templates`}
          className="group flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Explore all templates
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </a>
      </div>
    </section>
  );
}
