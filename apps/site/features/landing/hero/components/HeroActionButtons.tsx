import { motion } from "framer-motion";

import { siteConfig } from "@/config/site";
import { LandingButton } from "@/components/marketing/LandingButton";

export const HeroActionButtons = () => {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.5, delay: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="pointer-events-auto mt-8 flex w-full max-w-xs flex-col items-stretch gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-4"
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
    </motion.div>
  );
};

export default HeroActionButtons;
