"use client";

import { motion } from "framer-motion";
import { Briefcase, FileCode2, Globe, Server, Shield, Zap } from "lucide-react";

const marqueeItems = [
  { text: "Local-First Privacy", icon: Shield },
  { text: "Open-Core Architecture", icon: Server },
  { text: "Lightning Fast Export", icon: Zap },
  { text: "ATS-Optimized Formats", icon: Briefcase },
  { text: "Developer Portfolios", icon: FileCode2 },
  { text: "Custom Subdomains", icon: Globe },
];

// Duplicate items to ensure smooth infinite looping
const duplicatedItems = [...marqueeItems, ...marqueeItems, ...marqueeItems, ...marqueeItems];

export default function TrustMarquee() {
  return (
    <section className="relative w-full overflow-hidden border-y border-zinc-200 bg-zinc-50 py-12 dark:border-zinc-800 dark:bg-zinc-900/50">
      {/* Edge gradient masks for smooth fade in/out */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-zinc-50 to-transparent dark:from-zinc-950" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-zinc-50 to-transparent dark:from-zinc-950" />

      <div className="flex w-full items-center">
        <motion.div
          className="flex flex-nowrap gap-16 pr-16"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            duration: 40,
            ease: "linear",
            repeat: Infinity,
          }}
        >
          {duplicatedItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="flex items-center gap-4 whitespace-nowrap text-zinc-400 dark:text-zinc-500"
              >
                <Icon className="h-6 w-6 stroke-[1.5]" />
                <span className="text-xl font-medium uppercase tracking-widest">
                  {item.text}
                </span>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
