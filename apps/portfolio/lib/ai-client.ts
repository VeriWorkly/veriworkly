"use client";

import { authenticatedFetch } from "@/lib/authenticated-fetch";

export type AiAction =
  | "rewrite_short_text"
  | "rewrite_section"
  | "generate_section"
  | "generate_portfolio_copy"
  | "generate_cover_letter"
  | "tailor_resume_to_job"
  | "generate_document";
export type AiMode = "standard" | "expert";
export type AiActionPolicy = Record<
  AiAction,
  {
    costs: Record<AiMode, number>;
  }
>;
export type AiGenerateResult = {
  content: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
  credits: { spent: number; balance: number };
};

type ApiResponse<T> = { data?: T; message?: string };
let actionsPromise: Promise<AiActionPolicy> | null = null;

async function readResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<T>;
  if (!response.ok || !payload.data) throw new Error(payload.message || "AI request failed.");
  return payload.data;
}

export function getAiActions() {
  actionsPromise ??= authenticatedFetch("/ai/actions")
    .then((response) => readResponse<AiActionPolicy>(response))
    .catch((error) => {
      actionsPromise = null;
      throw error;
    });
  return actionsPromise;
}

export async function generateAiContent(input: {
  action: AiAction;
  mode: AiMode;
  input: { text?: string; context?: string; instructions?: string };
  requestId: string;
  documentId?: string;
}) {
  return readResponse<AiGenerateResult>(
    await authenticatedFetch("/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}
