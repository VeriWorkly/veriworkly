import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PartyPopper } from "lucide-react";
import { APPLY_REACTIONS } from "@/features/ambassador/apply-reactions";
import { ReactionMedia } from "@/features/ambassador/ReactionMedia";
import { ConfettiBurst } from "./ConfettiBurst";

export const ApplySubmittedView = () => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="glass-card relative mx-auto flex max-w-xl flex-col items-center overflow-hidden rounded-3xl border border-zinc-200/60 px-8 py-16 text-center shadow-2xl dark:border-white/10"
    >
      <ConfettiBurst />
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
      >
        <PartyPopper className="h-8 w-8" />
      </motion.div>
      <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl dark:text-white">
        You&apos;re officially in the running!
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        We just read your application and we&apos;re already vibing with it. Give us a few days to
        review — your status lives in your dashboard, and we&apos;ll email you the moment it
        changes.
      </p>
      <ReactionMedia reaction={APPLY_REACTIONS.success} className="mt-8" />
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-full border border-zinc-950/10 bg-zinc-950 px-8 py-3.5 text-xs font-black tracking-wider text-white uppercase shadow-lg transition-all hover:bg-zinc-900 active:scale-[0.98] dark:border-white/20 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
      >
        Back to VeriWorkly
      </Link>
    </div>
  );
};

export default ApplySubmittedView;
