import { motion } from "framer-motion";
import { Briefcase, FileText, Globe, Sparkles } from "lucide-react";

export const HeroFloatingTags = () => {
  return (
    <>
      <motion.div
        aria-hidden="true"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute top-[10%] left-[5%] hidden items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-2 text-sm text-blue-600 backdrop-blur-md lg:flex dark:text-blue-400"
      >
        <FileText className="h-4 w-4" aria-hidden="true" />
        <span>Resume AI</span>
      </motion.div>

      <motion.div
        aria-hidden="true"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="pointer-events-none absolute top-[15%] right-[5%] hidden items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-2 text-sm text-blue-600 backdrop-blur-md lg:flex dark:text-blue-400"
      >
        <Briefcase className="h-4 w-4" aria-hidden="true" />
        <span>Cover Letter</span>
      </motion.div>

      <motion.div
        aria-hidden="true"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="pointer-events-none absolute top-[45%] left-[12%] hidden items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-2 text-sm text-blue-600 backdrop-blur-md lg:flex dark:text-blue-400"
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        <span>Portfolio Builder</span>
      </motion.div>

      <motion.div
        aria-hidden="true"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="pointer-events-none absolute top-[48%] right-[10%] hidden items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-2 text-sm text-blue-600 backdrop-blur-md lg:flex dark:text-blue-400"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        <span>AI CV</span>
      </motion.div>
    </>
  );
};

export default HeroFloatingTags;
