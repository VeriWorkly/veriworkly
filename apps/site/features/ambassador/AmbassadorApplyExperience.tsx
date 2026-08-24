"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CornerDownLeft } from "lucide-react";

import { submitAmbassadorApplication } from "@/features/ambassador/ambassador-api";
import type { AmbassadorApplicationPayload, ApplyViewer } from "@/features/ambassador/types";

import {
  type FormState,
  QUESTION_STEPS,
  STEP_ORDER,
  REVIEW_INDEX,
  VIBES,
  YEAR_CHIPS,
  CURRENT_YEAR,
  FORM_ERROR_ID,
  FIELD_LIMITS,
  readDraft,
  writeDraft,
  clearDraft,
  validateStep,
  findFirstInvalidStep,
  stepVariants,
  formFromViewer,
} from "./apply/apply-constants";

import { AutofillHint, BigInput, BigTextarea, Chip } from "./apply/components/ApplyInputControls";
import { QuestionShell } from "./apply/components/QuestionShell";
import { ApplyStepIntro } from "./apply/components/ApplyStepIntro";
import { ApplyStepReview } from "./apply/components/ApplyStepReview";
import { ApplySubmittedView } from "./apply/components/ApplySubmittedView";

export const AmbassadorApplyExperience = ({
  viewer,
  loginUrl,
}: {
  viewer: ApplyViewer;
  loginUrl: string;
}) => {
  const prefilled = formFromViewer(viewer);

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState<FormState>(prefilled);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const step = STEP_ORDER[stepIndex];
  const questionNumber = QUESTION_STEPS.indexOf(step as (typeof QUESTION_STEPS)[number]) + 1;
  const progress =
    questionNumber > 0 ? Math.round((questionNumber / QUESTION_STEPS.length) * 100) : 0;

  const autofilledSchool = Boolean(prefilled.collegeName || prefilled.graduationYear);

  const submitApplication = useCallback(async (payload: FormState) => {
    setSubmitting(true);
    setError("");

    try {
      const body: AmbassadorApplicationPayload = {
        collegeName: payload.collegeName.trim(),
        graduationYear: payload.graduationYear.trim(),
        whyJoin: payload.whyJoin.trim(),
        superpower: payload.superpower.trim(),
        funFact: payload.funFact.trim(),
        vibeCheck: payload.vibeCheck || undefined,
        socialHandle: payload.socialHandle.trim() || undefined,
      };

      await submitAmbassadorApplication(body);
      clearDraft();
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something glitched. Mind giving it another shot?",
      );
    } finally {
      setSubmitting(false);
    }
  }, []);

  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    const draft = readDraft();
    if (!draft) return;

    const merged: FormState = {
      ...draft.form,
      collegeName: draft.form.collegeName || prefilled.collegeName,
      graduationYear: draft.form.graduationYear || prefilled.graduationYear,
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(merged);

    if (draft.pendingSubmit && viewer.isAuthenticated) {
      const invalid = findFirstInvalidStep(merged);

      if (invalid) {
        setStepIndex(STEP_ORDER.indexOf(invalid.step));
        setError(invalid.message);
        return;
      }

      setStepIndex(REVIEW_INDEX);
      void submitApplication(merged);
      return;
    }

    setStepIndex(draft.stepIndex);
  }, [prefilled.collegeName, prefilled.graduationYear, viewer.isAuthenticated, submitApplication]);

  useEffect(() => {
    if (submitted || !restored.current) return;
    writeDraft({ form, stepIndex, pendingSubmit: false });
  }, [form, stepIndex, submitted]);

  const updateField = useCallback((patch: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    setError("");
  }, []);

  const goNext = () => {
    const validationError = validateStep(step, form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setDirection(1);
    setStepIndex((i) => Math.min(i + 1, STEP_ORDER.length - 1));
  };

  const goBack = () => {
    setError("");
    setDirection(-1);
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const handleReviewSubmit = () => {
    const invalid = findFirstInvalidStep(form);
    if (invalid) {
      setDirection(-1);
      setStepIndex(STEP_ORDER.indexOf(invalid.step));
      setError(invalid.message);
      return;
    }

    if (!viewer.isAuthenticated) {
      writeDraft({ form, stepIndex, pendingSubmit: true });
      window.location.href = loginUrl;
      return;
    }

    void submitApplication(form);
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    if (step === "review") handleReviewSubmit();
    else goNext();
  };

  useEffect(() => {
    if (submitted) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [submitted]);

  if (submitted) {
    return <ApplySubmittedView />;
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {questionNumber > 0 && (
        <div className="mb-8 flex items-center gap-3">
          <div
            role="progressbar"
            aria-label="Application progress"
            aria-valuemin={0}
            aria-valuemax={QUESTION_STEPS.length}
            aria-valuenow={questionNumber}
            aria-valuetext={`Question ${questionNumber} of ${QUESTION_STEPS.length}`}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200/70 dark:bg-white/10"
          >
            <motion.div
              className="h-full rounded-full bg-indigo-500"
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 30 }}
            />
          </div>
          <span aria-hidden="true" className="font-mono text-[11px] font-bold text-zinc-500">
            {questionNumber}/{QUESTION_STEPS.length}
          </span>
        </div>
      )}

      <form
        noValidate
        onSubmit={handleFormSubmit}
        aria-label="Student ambassador application"
        className="glass-card relative min-h-100 overflow-hidden rounded-3xl border border-zinc-200/60 p-8 shadow-2xl sm:p-12 dark:border-white/10"
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            {step === "intro" && <ApplyStepIntro viewer={viewer} onStart={goNext} />}

            {step === "college" && (
              <QuestionShell
                fieldId="collegeName"
                reactionKey="college"
                title="Where do you go to school?"
                subtitle="College, university, bootcamp — whatever your campus looks like."
              >
                <BigInput
                  autoFocus
                  id="collegeName"
                  value={form.collegeName}
                  placeholder="e.g. University of Michigan"
                  maxLength={FIELD_LIMITS.collegeName}
                  autoComplete="organization"
                  invalid={Boolean(error)}
                  onChange={(v) => updateField({ collegeName: v })}
                />
                {autofilledSchool && <AutofillHint />}
              </QuestionShell>
            )}

            {step === "year" && (
              <QuestionShell
                fieldId="graduationYear"
                reactionKey="year"
                title="When do they finally let you leave?"
                subtitle="Pick a year or type your own."
              >
                <BigInput
                  autoFocus
                  id="graduationYear"
                  value={form.graduationYear}
                  placeholder={`e.g. ${CURRENT_YEAR + 1}`}
                  inputMode="numeric"
                  maxLength={FIELD_LIMITS.graduationYear}
                  invalid={Boolean(error)}
                  onChange={(v) =>
                    updateField({ graduationYear: v.replace(/\D/g, "").slice(0, 4) })
                  }
                />
                <div
                  role="group"
                  aria-label="Suggested graduation years"
                  className="mt-4 flex flex-wrap gap-2"
                >
                  {YEAR_CHIPS.map((year) => (
                    <Chip
                      key={year}
                      label={String(year)}
                      active={form.graduationYear === String(year)}
                      onClick={() => updateField({ graduationYear: String(year) })}
                    />
                  ))}
                </div>
                {autofilledSchool && <AutofillHint />}
              </QuestionShell>
            )}

            {step === "why" && (
              <QuestionShell
                fieldId="whyJoin"
                reactionKey="why"
                title="Why do you want to rep VeriWorkly on campus?"
                subtitle="Real talk, no corporate speak. At least 20 characters."
              >
                <BigTextarea
                  autoFocus
                  id="whyJoin"
                  value={form.whyJoin}
                  placeholder="I'm the friend who unofficially fixes everyone's resume anyway..."
                  maxLength={FIELD_LIMITS.whyJoin}
                  invalid={Boolean(error)}
                  onChange={(v) => updateField({ whyJoin: v })}
                />
              </QuestionShell>
            )}

            {step === "superpower" && (
              <QuestionShell
                fieldId="superpower"
                reactionKey="superpower"
                title="What's your unfair advantage?"
                subtitle="Convincing your entire group chat to try a new app absolutely counts."
              >
                <BigInput
                  autoFocus
                  id="superpower"
                  value={form.superpower}
                  placeholder="e.g. Turning DMs into instant conversions"
                  maxLength={FIELD_LIMITS.superpower}
                  invalid={Boolean(error)}
                  onChange={(v) => updateField({ superpower: v })}
                />
              </QuestionShell>
            )}

            {step === "funfact" && (
              <QuestionShell
                fieldId="funFact"
                reactionKey="funfact"
                title="Give us a fun fact about you"
                subtitle="Weird talent, wild trivia, deeply embarrassing hobby — we want it."
              >
                <BigInput
                  autoFocus
                  id="funFact"
                  value={form.funFact}
                  placeholder="e.g. I can solve a Rubik's cube in under a minute"
                  maxLength={FIELD_LIMITS.funFact}
                  invalid={Boolean(error)}
                  onChange={(v) => updateField({ funFact: v })}
                />
              </QuestionShell>
            )}

            {step === "vibe" && (
              <QuestionShell
                fieldId="vibeCheck"
                reactionKey="vibe"
                title="Pick your campus vibe"
                subtitle="Optional — but this is the one we'll all argue about internally."
              >
                <div
                  role="group"
                  aria-labelledby="vibeCheck-label"
                  aria-describedby="vibeCheck-hint"
                  className="flex flex-wrap gap-2"
                >
                  {VIBES.map((vibe) => (
                    <Chip
                      key={vibe.value}
                      label={`${vibe.emoji} ${vibe.value}`}
                      active={form.vibeCheck === vibe.value}
                      onClick={() =>
                        updateField({ vibeCheck: form.vibeCheck === vibe.value ? "" : vibe.value })
                      }
                    />
                  ))}
                </div>
              </QuestionShell>
            )}

            {step === "social" && (
              <QuestionShell
                fieldId="socialHandle"
                reactionKey="social"
                title="Drop a social handle"
                subtitle="Instagram, LinkedIn, X, TikTok — optional, so we can hype you up."
              >
                <BigInput
                  autoFocus
                  id="socialHandle"
                  value={form.socialHandle}
                  placeholder="@yourhandle"
                  maxLength={FIELD_LIMITS.socialHandle}
                  invalid={Boolean(error)}
                  onChange={(v) => updateField({ socialHandle: v })}
                />
              </QuestionShell>
            )}

            {step === "review" && (
              <ApplyStepReview form={form} viewer={viewer} submitting={submitting} />
            )}
          </motion.div>
        </AnimatePresence>

        <div id={FORM_ERROR_ID} role="alert" aria-live="assertive">
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-600 dark:text-red-400"
            >
              {error}
            </motion.p>
          )}
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {submitting ? "Submitting your application" : ""}
        </p>

        {step !== "intro" && (
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-zinc-500 uppercase transition-colors hover:text-zinc-900 dark:hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back
            </button>

            {step !== "review" && (
              <div className="flex items-center gap-3">
                {(step === "vibe" || step === "social") && (
                  <button
                    type="button"
                    onClick={goNext}
                    className="text-xs font-bold tracking-wider text-zinc-400 uppercase transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    Skip
                  </button>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-5 py-2.5 text-xs font-black tracking-wider text-white uppercase shadow-md transition-all hover:bg-indigo-500 active:scale-[0.97]"
                >
                  Continue
                  <CornerDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default AmbassadorApplyExperience;
