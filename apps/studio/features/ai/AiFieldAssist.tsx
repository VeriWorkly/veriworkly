"use client";

import { useEffect, useState } from "react";

import { Button, TextArea } from "@veriworkly/ui";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import {
  generateAiContent,
  getAiActions,
  type AiAction,
  type AiActionPolicy,
  type AiMode,
} from "@/features/ai/ai-api";

export function AiFieldAssist({
  action,
  text,
  context = "",
  documentId,
  onApply,
}: {
  action: AiAction;
  text: string;
  context?: string;
  documentId?: string;
  onApply: (content: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AiMode>("standard");
  const [instructions, setInstructions] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState<AiActionPolicy | null>(null);

  useEffect(() => {
    if (!open || actions) return;
    void getAiActions().then(setActions).catch(() => undefined);
  }, [actions, open]);

  const cost = actions?.[action]?.costs[mode];

  async function generate() {
    setLoading(true);
    try {
      const response = await generateAiContent({
        action,
        mode,
        input: { text, context, instructions },
        requestId: crypto.randomUUID(),
        documentId,
      });
      setResult(response.content);
      toast.success(`Draft generated. ${response.credits.spent} credits reserved and used.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI generation failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button className="mt-2 justify-self-start" onClick={() => setOpen(true)} size="sm" variant="ghost">
        <Sparkles className="h-3.5 w-3.5" /> Improve with AI
      </Button>
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
        {(["standard", "expert"] as const).map((option) => (
          <Button
            key={option}
            onClick={() => setMode(option)}
            size="sm"
            variant={mode === option ? "primary" : "secondary"}
          >
            {option === "standard" ? "Standard" : "Expert"}
            {actions ? ` · ${actions[action].costs[option]} cr` : ""}
          </Button>
        ))}
      </div>
      <input
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
        <Button disabled={loading || cost == null} loading={loading} onClick={() => void generate()} size="sm">
          Generate draft{cost == null ? "" : ` · ${cost} credits`}
        </Button>
      )}
      <p className="text-muted text-xs">
        Generation sends this field and relevant editor context to the configured AI provider. Your
        current text stays unchanged until you replace the field.
      </p>
    </div>
  );
}
