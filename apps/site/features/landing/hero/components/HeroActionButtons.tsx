import { siteConfig } from "@/config/site";
import { LandingButton } from "@/components/marketing/LandingButton";

export const HeroActionButtons = () => {
  return (
    <div
      style={{ animationDelay: "400ms" }}
      className="hero-rise pointer-events-auto mt-8 flex w-full max-w-xs flex-col items-stretch gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-4"
    >
      <LandingButton
        size="hero"
        variant="primary"
        href={siteConfig.links.app}
        className="w-full sm:w-auto"
      >
        Start Building Free
      </LandingButton>

      <LandingButton size="hero" variant="glass" href="/how-it-works" className="w-full sm:w-auto">
        See how it works
      </LandingButton>
    </div>
  );
};

export default HeroActionButtons;
