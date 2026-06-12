import { fetchApiData } from "@/utils/fetchApiData";

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

export type AiGenerateInput = {
  action: AiAction;
  mode: AiMode;
  input: {
    text?: string;
    context?: string;
    jobDescription?: string;
    instructions?: string;
  };
  requestId: string;
  documentId?: string;
};

export type AiGenerateResult = {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
  credits: {
    spent: number;
    balance: number;
  };
};

let actionsPromise: Promise<AiActionPolicy> | null = null;

export function getAiActions() {
  actionsPromise ??= fetchApiData<AiActionPolicy>("/ai/actions").catch((error) => {
    actionsPromise = null;
    throw error;
  });
  return actionsPromise;
}

export function generateAiContent(input: AiGenerateInput) {
  return fetchApiData<AiGenerateResult>("/ai/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
