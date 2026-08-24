import Link from "next/link";
import { motion } from "framer-motion";

import { siteConfig } from "@/config/site";

export const HeroActionButtons = () => {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.5, delay: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="pointer-events-auto mt-10 flex flex-col items-center gap-4 sm:flex-row"
    >
      <a
        href={siteConfig.links.app}
        className="group relative flex h-14 items-center justify-center rounded-full border border-blue-500/40 bg-[#0A0A0A] px-10 text-base font-medium text-white shadow-[0_0_30px_rgba(59,130,246,0.2)] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:border-blue-400 hover:shadow-[0_0_40px_rgba(59,130,246,0.4)] active:scale-[0.97]"
      >
        Start Building Free
      </a>

      <Link
        href="/how-it-works"
        className="flex h-14 items-center justify-center rounded-full border border-black/10 bg-white/70 px-10 text-base font-medium text-gray-800 backdrop-blur-md transition-colors duration-200 ease-out hover:border-blue-500/30 hover:text-blue-600 active:scale-[0.97] dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:text-blue-400"
      >
        See how it works
      </Link>
    </motion.div>
  );
};

export default HeroActionButtons;
