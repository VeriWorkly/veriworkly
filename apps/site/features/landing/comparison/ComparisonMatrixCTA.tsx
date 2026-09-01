import { siteConfig } from "@/config/site";

import LandingButton from "@/components/marketing/LandingButton";

const ComparisonMatrixCTA = () => {
  return (
    <div className="mt-10 flex flex-col items-center gap-3.5 sm:mt-12 sm:gap-4">
      <LandingButton href={siteConfig.links.app} variant="primary" size="hero" showArrow>
        Start Building Free
      </LandingButton>

      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        No credit card. No account. No catch.
      </p>
    </div>
  );
};

export default ComparisonMatrixCTA;
