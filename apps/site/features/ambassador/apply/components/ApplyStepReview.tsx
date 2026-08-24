import React from "react";
import { ArrowRight, GraduationCap, Lock, Sparkles } from "lucide-react";
import type { FormState } from "../apply-constants";
import type { ApplyViewer } from "@/features/ambassador/types";

interface ApplyStepReviewProps {
  form: FormState;
  viewer: ApplyViewer;
  submitting: boolean;
}

export function ReviewRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof GraduationCap;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />}
      <div className="min-w-0">
        <p className="text-[10px] font-black tracking-widest text-zinc-400 uppercase dark:text-zinc-600">
          {label}
        </p>
        <p className="mt-1 text-sm leading-6 wrap-break-word text-zinc-800 dark:text-zinc-200">
          {value}
        </p>
      </div>
    </div>
  );
}

export const ApplyStepReview = ({ form, viewer, submitting }: ApplyStepReviewProps) => {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
            Last look before you send it
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Everything checks out?</p>
        </div>
      </div>

      <dl className="divide-y divide-zinc-200/70 rounded-2xl border border-zinc-200/70 dark:divide-white/10 dark:border-white/10">
        <ReviewRow
          icon={GraduationCap}
          label="School"
          value={`${form.collegeName} · Class of ${form.graduationYear}`}
        />
        <ReviewRow label="Why you" value={form.whyJoin} />
        <ReviewRow label="Superpower" value={form.superpower} />
        <ReviewRow label="Fun fact" value={form.funFact} />
        {form.vibeCheck && <ReviewRow label="Vibe" value={form.vibeCheck} />}
        {form.socialHandle && <ReviewRow label="Social" value={form.socialHandle} />}
      </dl>

      {!viewer.isAuthenticated && (
        <p className="mt-5 flex items-start gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-xs leading-5 font-semibold text-indigo-700 dark:text-indigo-300">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          One last step: sign in so we know who to send the good news to. Your answers are saved and
          sent automatically the second you&apos;re back.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-zinc-950 text-sm font-black tracking-wider text-white uppercase shadow-lg transition-all hover:bg-zinc-900 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
      >
        {submitting
          ? "Sending it..."
          : viewer.isAuthenticated
            ? "Submit application"
            : "Sign in & send it"}
        {!submitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
};

export default ApplyStepReview;
