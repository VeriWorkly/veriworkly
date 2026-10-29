import type { FormEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AmbassadorApplyExperience } from "@/features/ambassador/AmbassadorApplyExperience";
import { submitAmbassadorApplication } from "@/features/ambassador/ambassador-api";
import {
  DRAFT_KEY,
  EMPTY_FORM,
  REVIEW_INDEX,
  STEP_ORDER,
  readDraft,
  type FormState,
} from "@/features/ambassador/apply/apply-constants";
import { ApplySubmittedView } from "@/features/ambassador/apply/components/ApplySubmittedView";
import type { ApplyViewer } from "@/features/ambassador/types";
import { ApiRequestError } from "@/utils/fetchApiData";

import { byProp, mount, text } from "./hook-harness";

/** The apply flow end to end without a browser: draft restore, the sign-in round trip and the 401 loop guard. */

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const { hooks } = await import("./hook-harness");
  return { ...actual, ...hooks, default: { ...actual, ...hooks } };
});

vi.mock("@/features/ambassador/ambassador-api", () => ({
  submitAmbassadorApplication: vi.fn(),
}));

const submit = vi.mocked(submitAmbassadorApplication);
const LOGIN_URL = "https://app.veriworkly.com/login?redirect=%2Fambassador%2Fapply";

const COMPLETE: FormState = {
  collegeName: "  University of Michigan ",
  graduationYear: String(new Date().getFullYear() + 1),
  whyJoin: "I already fix every resume in my dorm, so this is official now.",
  superpower: "Group chats",
  funFact: "I juggle",
  vibeCheck: "",
  socialHandle: " ",
};

const signedIn: ApplyViewer = {
  isAuthenticated: true,
  viewerKey: "ada@example.com",
  name: "Ada",
  draft: null,
  reviewNote: null,
};
const guest: ApplyViewer = { ...signedIn, isAuthenticated: false, viewerKey: null, name: null };

let store: Map<string, string>;
let location: { href: string };

beforeEach(() => {
  store = new Map();
  location = { href: "https://veriworkly.com/ambassador/apply" };
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    location,
    scrollTo: () => {},
  });
  submit.mockReset();
});

afterEach(() => vi.unstubAllGlobals());

const saveDraft = (form: Partial<FormState>, stepIndex: number, pendingSubmit: boolean) =>
  store.set(DRAFT_KEY, JSON.stringify({ form, stepIndex, pendingSubmit }));

const render = (viewer: ApplyViewer) =>
  mount(AmbassadorApplyExperience, { viewer, loginUrl: LOGIN_URL });

const submitForm = (tree: unknown) => {
  const form = byProp(tree as never, "aria-label", "Student ambassador application");
  expect(form, "the apply form").toBeDefined();
  (form!.props.onSubmit as (e: FormEvent) => void)({ preventDefault() {} } as FormEvent);
};

describe("draft restore", () => {
  it("returns to the saved step with the saved answers", () => {
    saveDraft({ ...EMPTY_FORM, collegeName: "MIT", whyJoin: "Because resumes" }, 3, false);

    const view = render(guest);

    expect(STEP_ORDER[3]).toBe("why");
    expect(byProp(view.tree, "id", "whyJoin")?.props.value).toBe("Because resumes");
    expect(submit).not.toHaveBeenCalled();
  });

  it("fills blank school answers from the account, but keeps what the visitor typed", () => {
    saveDraft({ ...EMPTY_FORM, collegeName: "", graduationYear: "2027" }, 1, false);

    const view = render({
      ...signedIn,
      draft: { collegeName: "Stanford", graduationYear: "2028" },
    });

    expect(byProp(view.tree, "id", "collegeName")?.props.value).toBe("Stanford");
    expect(readDraft(signedIn.viewerKey)?.form).toMatchObject({
      collegeName: "Stanford",
      graduationYear: "2027",
    });
  });

  it("clamps a tampered step index and ignores a draft without answers", () => {
    store.set(DRAFT_KEY, JSON.stringify({ form: EMPTY_FORM, stepIndex: 99 }));
    expect(readDraft(null)?.stepIndex).toBe(STEP_ORDER.length - 1);

    store.set(DRAFT_KEY, JSON.stringify({ stepIndex: 2 }));
    expect(readDraft(null)).toBeNull();

    store.set(DRAFT_KEY, "{not json");
    expect(readDraft(null)).toBeNull();
  });
});

describe("sign-in resume", () => {
  it("sends a guest to sign in with the answers saved for submit", () => {
    saveDraft(COMPLETE, REVIEW_INDEX, false);
    const view = render(guest);

    submitForm(view.tree);

    expect(location.href).toBe(LOGIN_URL);
    expect(submit).not.toHaveBeenCalled();
    expect(readDraft(null)).toMatchObject({ pendingSubmit: true, stepIndex: REVIEW_INDEX });
  });

  it("submits the saved answers once on return, trimmed, and clears the draft", async () => {
    submit.mockResolvedValue(undefined);
    saveDraft(COMPLETE, REVIEW_INDEX, true);

    const view = render(signedIn);
    await view.settle();

    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith({
      collegeName: "University of Michigan",
      graduationYear: COMPLETE.graduationYear,
      whyJoin: COMPLETE.whyJoin,
      superpower: "Group chats",
      funFact: "I juggle",
      vibeCheck: undefined,
      socialHandle: undefined,
    });
    expect(store.has(DRAFT_KEY)).toBe(false);
    expect((view.tree as { type?: unknown }).type).toBe(ApplySubmittedView);
  });

  it("does not submit a pending draft for a visitor who is still signed out", () => {
    saveDraft(COMPLETE, REVIEW_INDEX, true);

    render(guest);

    expect(submit).not.toHaveBeenCalled();
    expect(location.href).not.toBe(LOGIN_URL);
  });

  it("stops at the first unanswered question instead of submitting an incomplete draft", () => {
    saveDraft({ ...COMPLETE, superpower: "" }, REVIEW_INDEX, true);

    const view = render(signedIn);

    expect(submit).not.toHaveBeenCalled();
    expect(byProp(view.tree, "id", "superpower")).toBeDefined();
    expect(text(view.tree)).toContain("Every ambassador needs a superpower.");
  });
});

describe("401 loop guard", () => {
  const expired = () => new ApiRequestError("Please sign in again.", 401);

  it("on a first 401 keeps the answers and sends the visitor to sign in", async () => {
    submit.mockRejectedValue(expired());
    saveDraft(COMPLETE, REVIEW_INDEX, false);
    const view = render(signedIn);

    submitForm(view.tree);
    await view.settle();

    expect(location.href).toBe(LOGIN_URL);
    expect(readDraft(signedIn.viewerKey)).toMatchObject({
      pendingSubmit: true,
      stepIndex: REVIEW_INDEX,
    });
  });

  it("on a 401 after returning from sign-in shows the error instead of redirecting again", async () => {
    submit.mockRejectedValue(expired());
    saveDraft(COMPLETE, REVIEW_INDEX, true);
    const view = render(signedIn);
    await view.settle();

    expect(submit).toHaveBeenCalledTimes(1);
    expect(location.href).not.toBe(LOGIN_URL);
    expect(text(view.tree)).toContain("Please sign in again.");
    // The draft is saved again without the pending flag, so a reload does not retry the submit.
    expect(readDraft(signedIn.viewerKey)?.pendingSubmit).toBe(false);
  });

  it("shows any other failure without leaving the page", async () => {
    submit.mockRejectedValue(new ApiRequestError("You already applied.", 409));
    saveDraft(COMPLETE, REVIEW_INDEX, false);
    const view = render(signedIn);

    submitForm(view.tree);
    await view.settle();

    expect(location.href).not.toBe(LOGIN_URL);
    expect(text(view.tree)).toContain("You already applied.");
  });
});

describe("draft belongs to the viewer who saved it", () => {
  const saveOwned = (owner: string | null, pendingSubmit: boolean) =>
    store.set(
      DRAFT_KEY,
      JSON.stringify({ owner, form: COMPLETE, stepIndex: REVIEW_INDEX, pendingSubmit }),
    );

  it("never submits or shows another account's pending draft, and drops it", async () => {
    submit.mockResolvedValue(undefined);
    saveOwned("someone-else@example.com", true);

    const view = render(signedIn);
    await view.settle();

    expect(submit).not.toHaveBeenCalled();
    expect(text(view.tree)).not.toContain("University of Michigan");
    expect(readDraft(signedIn.viewerKey)?.form).toEqual(EMPTY_FORM);
  });

  it("does not hand a signed-in viewer's draft to a signed-out visitor", () => {
    saveOwned(signedIn.viewerKey, false);

    const view = render(guest);

    expect(text(view.tree)).not.toContain("University of Michigan");
    expect(readDraft(null)?.form ?? EMPTY_FORM).toEqual(EMPTY_FORM);
  });

  it("saves the draft under the signed-in viewer", () => {
    const view = render(signedIn);
    expect(view.tree).toBeDefined();

    expect(JSON.parse(store.get(DRAFT_KEY)!).owner).toBe(signedIn.viewerKey);
  });
});
