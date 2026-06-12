export const AI_ACTION_KEYS = [
  "rewrite_short_text",
  "rewrite_section",
  "generate_section",
  "generate_portfolio_copy",
  "generate_cover_letter",
  "tailor_resume_to_job",
  "generate_document",
] as const;

export type AiActionKey = (typeof AI_ACTION_KEYS)[number];
export type AiMode = "standard" | "expert";
