"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button, TextArea } from "@veriworkly/ui";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import {
  AI_JOB_DESCRIPTION_MAX_CHARS,
  requestIdFor,
  settleRequestId,
  type PendingAiRequest,
  generateAiContent,
  getAiActions,
  type AiAction,
  type AiActionPolicy,
  type AiMode,
} from "@/features/ai/ai-api";
import { describePaidActionError, type PaidActionError } from "@/features/credits/credit-errors";
import type { CreditWallet } from "@/features/credits/types";
import { useUserStore } from "@/store/useUserStore";
import { fetchApiData } from "@/utils/fetchApiData";

/**
 * One AI request. The wallet is read again once the server has answered, a success included:
 * the balance next to the price must show what the request spent (S-199).
 */
export async function requestAiDraft(
  request: Parameters<typeof generateAiContent>[0],
  signal: AbortSignal,
  reloadWallet: () => void,
) {
  try {
    return await generateAiContent(request, signal);
  } finally {
    if (!signal.aborted) reloadWallet();
  }
}

/**
 * Callers render this with `key` set to the entry it edits, so the open panel, the draft and
 * any in-flight request belong to that entry and are dropped when the user switches to
 * another one.
 */
export function AiFieldAssist({
  action,
  text,
  getContext,
  getJobDescription,
  documentId,
  onApply,
}: {
  action: AiAction;
  text: string;
  /**
   * Read only when a draft is generated. Context can be the whole document, and serialising
   * it on every keystroke elsewhere in the editor would cost far more than the request.
   */
  getContext?: () => string;
  /** A pasted job post. Sent on its own, so the server trims it instead of refusing it. */
  getJobDescription?: () => string;
  documentId?: string;
  onApply: (content: string) => void;
}) {
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AiMode>("standard");
  const [instructions, setInstructions] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState<AiActionPolicy | null>(null);
  const [actionsError, setActionsError] = useState("");
  // Shown next to the price. "error" keeps a failed read visible rather than looking like a
  // balance that is still loading.
  const [wallet, setWallet] = useState<CreditWallet | "error" | null>(null);
  const [failure, setFailure] = useState<PaidActionError | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // One idempotency key per distinct request. A retry reuses it only after a lost response
  // (see `canRetryWithSameRequestId`), so the server recognises it instead of charging again;
  // a success or any answered error starts a fresh one.
  const pendingRequestRef = useRef<PendingAiRequest["current"]>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const loadActions = useCallback(() => {
    setActionsError("");

    getAiActions()
      .then(setActions)
      .catch((error: unknown) => {
        setActionsError(error instanceof Error ? error.message : "AI pricing could not be loaded.");
      });
  }, []);

  const loadWallet = useCallback(() => {
    fetchApiData<CreditWallet>("/billing/credits")
      .then(setWallet)
      .catch(() => setWallet("error"));
  }, []);

  function openPanel() {
    setOpen(true);
    // AI runs on account credits. A guest's request would only come back 401, which signs out
    // and leaves for /login in the middle of an edit, so the panel asks them to sign in instead.
    if (!isLoggedIn) return;
    if (!actions) loadActions();
    loadWallet();
  }

  const costFor = (option: AiMode) => actions?.[action]?.costs[option];
  const cost = costFor(mode);

  async function generate() {
    const input = {
      text,
      context: getContext?.() ?? "",
      jobDescription: (getJobDescription?.() ?? "").slice(0, AI_JOB_DESCRIPTION_MAX_CHARS),
      instructions,
    };
    const fingerprint = JSON.stringify([action, mode, input]);

    const requestId = requestIdFor(pendingRequestRef, fingerprint);

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setFailure(null);

    try {
      const response = await requestAiDraft(
        { action, mode, input, requestId, documentId },
        controller.signal,
        loadWallet,
      );

      settleRequestId(pendingRequestRef);
      setResult(response.content);
      toast.success(
        response.replayed
          ? "Draft recovered from your last request. No extra credits used."
          : `Draft generated. ${response.credits.spent} credits used.`,
      );
    } catch (error) {
      settleRequestId(pendingRequestRef, error);
      if (controller.signal.aborted) return;
      const described = describePaidActionError(error, "AI generation failed.");
      // A 402 stays in the panel with the way to buy credits; anything else is a toast.
      if (described.buyCredits) setFailure(described);
      else toast.error(described.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button className="mt-2 justify-self-start" onClick={openPanel} size="sm" variant="ghost">
        <Sparkles className="h-3.5 w-3.5" /> {text.trim() ? "Improve with AI" : "Write with AI"}
      </Button>
    );
  }

  if (!isLoggedIn) {
    return (
      <div
        className="border-border bg-card mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
        role="status"
      >
        <p className="text-muted text-xs">
          AI writing uses account credits. Your edits stay in this browser while you sign in.
        </p>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href={`/login?callbackURL=${encodeURIComponent(pathname)}`}>
              Sign in to use AI
            </Link>
          </Button>
          <Button onClick={() => setOpen(false)} size="sm" variant="ghost">
            Not now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-border bg-card mt-2 space-y-3 rounded-xl border p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-foreground text-xs font-semibold">AI writing assistant</p>
        <button
          aria-label="Close AI writing assistant"
          className="text-muted hover:text-foreground"
          onClick={() => setOpen(false)}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex gap-2">
        {(["standard", "expert"] as const).map((option) => {
          const optionCost = costFor(option);

          return (
            <Button
              aria-pressed={mode === option}
              key={option}
              onClick={() => setMode(option)}
              size="sm"
              variant={mode === option ? "primary" : "secondary"}
            >
              {option === "standard" ? "Standard" : "Expert"}
              {optionCost == null ? "" : ` · ${optionCost} cr`}
            </Button>
          );
        })}
      </div>
      {actionsError ? (
        <div className="flex flex-wrap items-center gap-2" role="alert">
          <p className="text-xs text-red-500">AI is unavailable right now: {actionsError}</p>
          <Button onClick={loadActions} size="sm" variant="secondary">
            Retry
          </Button>
        </div>
      ) : actions && !actions[action] ? (
        <p className="text-xs text-red-500" role="alert">
          This AI action is not available on the server.
        </p>
      ) : null}
      {failure ? (
        <p className="text-xs text-red-500" role="alert">
          {failure.message}
          {failure.buyCredits ? (
            <>
              {" "}
              <Link className="font-bold underline" href="/billing">
                Get credits
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      <input
        aria-label="Instructions for the AI draft (optional)"
        className="border-border bg-background text-foreground focus:border-accent h-10 w-full rounded-lg border px-3 text-sm outline-none"
        maxLength={500}
        onChange={(event) => setInstructions(event.target.value)}
        placeholder="Optional direction, tone, or outcome"
        value={instructions}
      />
      {result ? (
        <>
          <TextArea
            aria-label="Generated AI draft"
            className="min-h-32 text-sm leading-6"
            onChange={(event) => setResult(event.target.value)}
            value={result}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                onApply(result);
                setOpen(false);
                setResult("");
                toast.success("AI draft applied.");
              }}
              size="sm"
            >
              Replace field
            </Button>
            <Button onClick={() => setResult("")} size="sm" variant="secondary">
              Discard draft
            </Button>
          </div>
        </>
      ) : (
        <Button
          disabled={loading || cost == null}
          loading={loading}
          onClick={() => void generate()}
          size="sm"
        >
          Generate draft{cost == null ? "" : ` · ${cost} credits`}
        </Button>
      )}
      <p className="text-muted text-xs">
        {wallet === "error"
          ? "Your credit balance could not be loaded."
          : wallet
            ? `You have ${wallet.available} credits available.`
            : "Loading your credit balance…"}
      </p>
      <p className="text-muted text-xs">
        Generation sends this field and relevant editor context to the configured AI provider. Your
        current text stays unchanged until you replace the field.
      </p>
    </div>
  );
}
