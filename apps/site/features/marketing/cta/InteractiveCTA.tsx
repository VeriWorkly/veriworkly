import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { siteConfig } from "@/config/site";
import InteractiveCTAGlowCard from "@/features/marketing/cta/InteractiveCTAGlowCard";

export default function InteractiveCTA() {
  return (
    <section className="relative mx-auto w-full max-w-350 px-6 py-32 md:py-48">
      <InteractiveCTAGlowCard>
        <div className="flex flex-col justify-center lg:col-span-7">
          <div className="mb-6 flex w-fit items-center gap-2 rounded-full border border-blue-500/10 bg-blue-500/5 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <Sparkles className="h-3.5 w-3.5" /> Ready when you are
          </div>

          <h2 className="mb-6 font-sans text-4xl font-semibold tracking-tighter text-balance text-zinc-900 md:text-5xl lg:text-6xl dark:text-white">
            Create ATS-proof resumes & portfolios free
          </h2>

          <p className="mb-10 max-w-[48ch] text-lg text-zinc-500 dark:text-zinc-400">
            No account creation required to start. Export recruiter-approved ATS PDFs and publish your live web portfolio instantly.
          </p>

          <div>
            <Link
              href={siteConfig.links.app}
              className="group relative inline-flex h-14 items-center justify-center gap-3 rounded-full bg-zinc-950 px-8 text-base font-bold text-white shadow-md transition-all duration-300 hover:bg-blue-600 active:scale-[0.97] dark:bg-white dark:text-zinc-950 dark:hover:bg-blue-500 dark:hover:text-white"
            >
              Start Building Free
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </InteractiveCTAGlowCard>
    </section>
  );
}
