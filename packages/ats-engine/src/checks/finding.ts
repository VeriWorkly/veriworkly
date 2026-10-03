/**
 * The result of a check that reads the resume itself rather than a single count: how much it
 * found, and a short sample of it, so a rule's evidence can quote the text in question.
 */
export type Finding = { value: number; sample: string };

export const NO_FINDING: Finding = { value: 0, sample: "" };

/** A sample fit for a rule's evidence: one line, at most 80 characters. */
export const quote = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, 80);
