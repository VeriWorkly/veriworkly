import { Sparkles } from "lucide-react";

import { siteConfig } from "@/config/site";

import { LandingButton } from "@/components/marketing/LandingButton";
import InteractiveCTAGlowCard from "@/features/marketing/cta/InteractiveCTAGlowCard";

const InteractiveCTA = () => {
  return (
    <section className="relative mx-auto w-full max-w-350 px-6 pb-32 md:pb-48">
      <InteractiveCTAGlowCard>
        <div className="flex flex-col justify-center lg:col-span-7">
          <div className="mb-6 flex w-fit items-center gap-2 rounded-full border border-blue-500/10 bg-blue-500/5 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <Sparkles className="h-3.5 w-3.5" /> Ready when you are
          </div>

          <h2 className="mb-6 font-sans text-4xl font-semibold tracking-tighter text-balance text-zinc-900 md:text-5xl lg:text-6xl dark:text-white">
            Create ATS-proof resumes & portfolios free
          </h2>

          <p className="mb-10 max-w-[48ch] text-lg text-zinc-500 dark:text-zinc-400">
            No account creation required to start. Export recruiter-approved ATS PDFs and publish
            your live web portfolio instantly.
          </p>

          <div>
            <LandingButton href={siteConfig.links.app} variant="solid" size="hero" showArrow>
              Start Building Free
            </LandingButton>
          </div>
        </div>
      </InteractiveCTAGlowCard>
    </section>
  );
};

export default InteractiveCTA;
