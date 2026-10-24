import { Check } from "lucide-react";
import { motion } from "framer-motion";

export const HeroBadge = () => {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      initial={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="pointer-events-auto mb-10 flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-3 py-2 text-xs font-medium text-gray-800 shadow-sm backdrop-blur-md transition-transform hover:scale-[1.02] lg:px-4 lg:text-sm dark:border-white/10 dark:bg-black/50 dark:text-gray-200 dark:hover:bg-black"
    >
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20">
        <Check
          strokeWidth={3}
          aria-hidden="true"
          className="h-2.5 w-2.5 text-blue-600 lg:h-3 lg:w-3 dark:text-blue-400"
        />
      </div>
      Zero Paywalls • Zero Forced Signups
    </motion.div>
  );
};

export default HeroBadge;
