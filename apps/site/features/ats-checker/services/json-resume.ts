import { MAX_JSON_RESUME_BYTES } from "./ats-checker-api";

export type JsonResumeResult =
  { ok: true; input: Record<string, unknown>; text: string } | { ok: false; error: string };

const NOT_A_DOCUMENT = "This JSON is not a JSON Resume or ats-resume document";

/**
 * A .json upload is a document, not text: the server's extractor would score its raw JSON as
 * prose, so it is parsed and checked by the engine here and sent to /ats/check as-is.
 */
export async function readJsonResume(file: Blob): Promise<JsonResumeResult> {
  if (file.size > MAX_JSON_RESUME_BYTES)
    return {
      ok: false,
      error:
        "That JSON file is over 200 KB. Remove embedded images or extra data, or paste the text instead.",
    };

  let input: unknown;
  try {
    input = JSON.parse(await file.text());
  } catch {
    return {
      ok: false,
      error: "This file is not valid JSON. Export it again, or paste the resume text instead.",
    };
  }

  if (typeof input !== "object" || input === null || Array.isArray(input))
    return { ok: false, error: `${NOT_A_DOCUMENT}.` };

  // Loaded only for a JSON upload: the engine is too large for the checker's first load.
  const { AtsInputError, prepareResume } = await import("@veriworkly/ats-engine");
  try {
    return { ok: true, input: input as Record<string, unknown>, text: prepareResume(input).text };
  } catch (error) {
    if (!(error instanceof AtsInputError)) throw error;
    const [first] = error.issues;
    return {
      ok: false,
      error: `${NOT_A_DOCUMENT}${first ? ` (${first.path || "root"}: ${first.message})` : ""}.`,
    };
  }
}
