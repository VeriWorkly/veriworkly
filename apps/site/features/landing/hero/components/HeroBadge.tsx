import { Check } from "lucide-react";
import { motion } from "framer-motion";

export const HeroBadge = () => {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      initial={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="pointer-events-auto mb-10 flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-4 py-2 text-sm font-medium text-gray-800 shadow-sm backdrop-blur-md transition-transform hover:scale-[1.02] dark:border-white/10 dark:bg-black/50 dark:text-gray-200 dark:hover:bg-black"
    >
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20">
        <Check
          className="h-3 w-3 text-blue-600 dark:text-blue-400"
          strokeWidth={3}
          aria-hidden="true"
        />
      </div>
      Privacy-First Document & Portfolio Workspace
    </motion.div>
  );
};

export default HeroBadge;
