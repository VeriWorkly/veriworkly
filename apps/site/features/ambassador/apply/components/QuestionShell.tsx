import React, { type ReactNode } from "react";
import { APPLY_REACTIONS } from "@/features/ambassador/apply-reactions";
import { ReactionMedia } from "@/features/ambassador/ReactionMedia";

export interface QuestionShellProps {
  reactionKey: keyof typeof APPLY_REACTIONS;
  title: string;
  subtitle: string;
  fieldId: string;
  children: ReactNode;
}

export function QuestionShell({
  reactionKey,
  title,
  subtitle,
  fieldId,
  children,
}: QuestionShellProps) {
  return (
    <div>
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h2
            id={`${fieldId}-label`}
            className="text-xl font-extrabold tracking-tight text-zinc-950 sm:text-2xl dark:text-white"
          >
            {title}
          </h2>
          <p id={`${fieldId}-hint`} className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </p>
        </div>
        <ReactionMedia
          reaction={APPLY_REACTIONS[reactionKey]}
          className="hidden shrink-0 sm:flex"
        />
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export default QuestionShell;
