import type { ApplyViewer } from "@/features/ambassador/types";

export type FormState = {
  collegeName: string;
  graduationYear: string;
  whyJoin: string;
  superpower: string;
  funFact: string;
  vibeCheck: string;
  socialHandle: string;
};

export const EMPTY_FORM: FormState = {
  collegeName: "",
  graduationYear: "",
  whyJoin: "",
  superpower: "",
  funFact: "",
  vibeCheck: "",
  socialHandle: "",
};

export const QUESTION_STEPS = [
  "college",
  "year",
  "why",
  "superpower",
  "funfact",
  "vibe",
  "social",
] as const;

export const STEP_ORDER = ["intro", ...QUESTION_STEPS, "review"] as const;
export type StepId = (typeof STEP_ORDER)[number];

export const REVIEW_INDEX = STEP_ORDER.indexOf("review");

export const VIBES = [
  { value: "Meme Lord", emoji: "😎" },
  { value: "Library Goblin", emoji: "📚" },
  { value: "Group Project MVP", emoji: "🧑‍💻" },
  { value: "LinkedIn Influencer", emoji: "💼" },
  { value: "Chaos Coordinator", emoji: "🌀" },
  { value: "Quiet Overachiever", emoji: "🤫" },
];

export const CURRENT_YEAR = new Date().getFullYear();
export const YEAR_CHIPS = [CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2, CURRENT_YEAR + 3];
export const MAX_GRADUATION_YEAR = CURRENT_YEAR + 8;
export const MIN_GRADUATION_YEAR = CURRENT_YEAR - 1;

export const FORM_ERROR_ID = "ambassador-apply-error";

export const FIELD_LIMITS = {
  collegeName: 120,
  graduationYear: 4,
  whyJoin: 1000,
  superpower: 160,
  funFact: 200,
  socialHandle: 100,
} as const;

export const DRAFT_KEY = "veriworkly:ambassador-apply-draft";

export type StoredDraft = {
  form: FormState;
  stepIndex: number;
  pendingSubmit: boolean;
};

export function readDraft(): StoredDraft | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredDraft>;
    if (!parsed || typeof parsed !== "object" || !parsed.form) return null;

    return {
      form: { ...EMPTY_FORM, ...parsed.form },
      stepIndex:
        typeof parsed.stepIndex === "number"
          ? Math.min(Math.max(parsed.stepIndex, 0), STEP_ORDER.length - 1)
          : 0,
      pendingSubmit: Boolean(parsed.pendingSubmit),
    };
  } catch {
    return null;
  }
}

export function writeDraft(draft: StoredDraft) {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage unavailable */
  }
}

export function clearDraft() {
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* nothing to do */
  }
}

export function validateStep(step: StepId, form: FormState): string | null {
  switch (step) {
    case "college":
      return form.collegeName.trim().length >= 2
        ? null
        : "We need a campus name - even if it's just 'the library, mostly'.";
    case "year": {
      const value = form.graduationYear.trim();
      if (!/^\d{4}$/.test(value)) return "Enter a real 4-digit graduation year.";

      const year = Number(value);
      if (year < MIN_GRADUATION_YEAR || year > MAX_GRADUATION_YEAR) {
        return `This one's for current students - pick a year between ${MIN_GRADUATION_YEAR} and ${MAX_GRADUATION_YEAR}.`;
      }

      return null;
    }
    case "why": {
      const remaining = 20 - form.whyJoin.trim().length;
      return remaining <= 0
        ? null
        : `${remaining} more character${remaining === 1 ? "" : "s"} - we want the real story.`;
    }
    case "superpower":
      return form.superpower.trim().length >= 2 ? null : "Every ambassador needs a superpower.";
    case "funfact":
      return form.funFact.trim().length >= 2 ? null : "Drop literally anything fun about you.";
    default:
      return null;
  }
}

export function findFirstInvalidStep(form: FormState): { step: StepId; message: string } | null {
  for (const step of QUESTION_STEPS) {
    const message = validateStep(step, form);
    if (message) return { step, message };
  }

  return null;
}

export const stepVariants = {
  enter: (direction: number) => ({ opacity: 0, y: direction > 0 ? 24 : -24 }),
  center: { opacity: 1, y: 0 },
  exit: (direction: number) => ({ opacity: 0, y: direction > 0 ? -24 : 24 }),
};

export function formFromViewer(viewer: ApplyViewer): FormState {
  const draft = viewer.draft;
  if (!draft) return EMPTY_FORM;

  return {
    collegeName: draft.collegeName ?? "",
    graduationYear: draft.graduationYear ?? "",
    whyJoin: draft.whyJoin ?? "",
    superpower: draft.superpower ?? "",
    funFact: draft.funFact ?? "",
    vibeCheck: draft.vibeCheck ?? "",
    socialHandle: draft.socialHandle ?? "",
  };
}
