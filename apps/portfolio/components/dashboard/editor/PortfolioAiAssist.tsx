"use client";

import { useEffect, useState } from "react";

import { Sparkles, X } from "lucide-react";

import {
  generateAiContent,
  getAiActions,
  type AiActionPolicy,
  type AiMode,
} from "@/lib/ai-client";

import { actionClass, inputClass } from "./constants";

export function PortfolioAiAssist({
  text,
  context,
  documentId,
  onApply,
}: {
  text: string;
  context: string;
  documentId?: string;
  onApply: (content: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AiMode>("standard");
  const [instructions, setInstructions] = useState("");
  const [result, setResult] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState<AiActionPolicy | null>(null);

  useEffect(() => {
    if (!open || actions) return;
    void getAiActions().then(setActions).catch((error) => setMessage(error.message));
  }, [actions, open]);

  if (!open) {
    return (
      <button
        className={`${actionClass} text-accent mt-1 px-0`}
        onClick={() => setOpen(true)}
        type="button"
      >
        <Sparkles size={13} /> Improve with AI
      </button>
    );
  }

  const cost = actions?.generate_portfolio_copy.costs[mode];

  return (
    <div className="border-line bg-paper mt-2 space-y-2.5 rounded-xl border p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold">AI writing assistant</p>
        <button aria-label="Close AI assistant" onClick={() => setOpen(false)} type="button">
          <X className="text-muted" size={14} />
        </button>
      </div>
      <div className="flex gap-2">
        {(["standard", "expert"] as const).map((option) => (
          <button
            className={`${actionClass} ${mode === option ? "bg-accent text-white" : "border-line bg-panel border"}`}
            key={option}
            onClick={() => setMode(option)}
            type="button"
          >
            {option === "standard" ? "Standard" : "Expert"}
            {actions ? ` · ${actions.generate_portfolio_copy.costs[option]} cr` : ""}
          </button>
        ))}
      </div>
      <input
        className={inputClass}
        maxLength={500}
        onChange={(event) => setInstructions(event.target.value)}
        placeholder="Optional direction or tone"
        value={instructions}
      />
      {result ? (
        <>
          <textarea
            aria-label="Generated portfolio draft"
            className={inputClass}
            onChange={(event) => setResult(event.target.value)}
            rows={5}
            value={result}
          />
          <div className="flex gap-2">
            <button
              className={`${actionClass} bg-accent text-white`}
              onClick={() => {
                onApply(result);
                setOpen(false);
                setResult("");
              }}
              type="button"
            >
              Replace field
            </button>
            <button
              className={`${actionClass} border-line bg-panel border`}
              onClick={() => setResult("")}
              type="button"
            >
              Discard draft
            </button>
          </div>
        </>
      ) : (
        <button
          className={`${actionClass} bg-accent text-white`}
          disabled={loading || cost == null}
          onClick={async () => {
            setLoading(true);
            setMessage("");
            try {
              const response = await generateAiContent({
                action: "generate_portfolio_copy",
                mode,
                input: { text, context, instructions },
                requestId: crypto.randomUUID(),
                documentId,
              });
              setResult(response.content);
              setMessage(`${response.credits.spent} credits used. Balance ${response.credits.balance}.`);
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "AI generation failed.");
            } finally {
              setLoading(false);
            }
          }}
          type="button"
        >
          {loading ? "Generating..." : `Generate draft${cost == null ? "" : ` · ${cost} credits`}`}
        </button>
      )}
      <p className="text-muted text-[11px] leading-4">
        {message ||
          "Generation sends this field and relevant portfolio context to the configured AI provider. Your current text stays unchanged until you replace the field."}
      </p>
    </div>
  );
}
