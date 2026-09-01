import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Rocket } from "lucide-react";
import { APPLY_REACTIONS } from "@/features/ambassador/apply-reactions";
import { ReactionMedia } from "@/features/ambassador/ReactionMedia";
import type { ApplyViewer } from "@/features/ambassador/types";

interface ApplyStepIntroProps {
  viewer: ApplyViewer;
  onStart: () => void;
}

export const ApplyStepIntro = ({ viewer, onStart }: ApplyStepIntroProps) => {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <motion.div
        animate={{ rotate: [0, -8, 8, -8, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.5 }}
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
      >
        <Rocket className="h-8 w-8" />
      </motion.div>
      <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl dark:text-white">
        {viewer.name
          ? `${viewer.name.split(" ")[0]}, let's see that main-character energy 🎓`
          : "Let's see if you've got main-character energy 🎓"}
      </h1>
      <p className="mt-4 max-w-md text-sm leading-6 text-zinc-500 sm:text-base dark:text-zinc-400">
        Seven quick questions. No essays, no cover letters, no cap. Roughly two minutes - less if
        you type like you&apos;re in a group chat.
      </p>
      <ReactionMedia reaction={APPLY_REACTIONS.intro} className="mt-8" />
      {viewer.draft?.whyJoin && (
        <p className="mt-6 max-w-md rounded-xl border border-zinc-200/70 bg-zinc-50 px-4 py-3 text-xs leading-5 text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
          We kept your last answers - edit what you want and send it again.
        </p>
      )}
      {viewer.reviewNote && (
        <div className="mt-4 max-w-md rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-left">
          <p className="text-[10px] font-black tracking-widest text-amber-700 uppercase dark:text-amber-500">
            Feedback from last time
          </p>
          <p className="mt-1.5 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
            {viewer.reviewNote}
          </p>
        </div>
      )}
      {!viewer.isAuthenticated && (
        <p className="mt-6 flex items-center gap-1.5 rounded-full bg-zinc-100 px-4 py-2 text-[11px] font-semibold text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
          <Lock className="h-3 w-3" aria-hidden="true" />
          Answer first, sign in at the end. We&apos;ll keep your answers.
        </p>
      )}
      <button
        type="button"
        onClick={onStart}
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-full border border-zinc-950/10 bg-zinc-950 px-8 py-4 text-xs font-black tracking-wider text-white uppercase shadow-lg transition-all hover:bg-zinc-900 active:scale-[0.98] dark:border-white/20 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
      >
        Let&apos;s go
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
};

export default ApplyStepIntro;
