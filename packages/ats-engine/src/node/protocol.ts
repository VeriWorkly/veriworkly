import type { AtsLayoutSignals } from "../types.js";
import type { AtsResumeFormat } from "./extract.js";

/**
 * The message protocol of `@veriworkly/ats-engine/node/child`.
 *
 * One `{ id, format, buffer }` request in, one `{ id, ok, … }` response out over the IPC
 * channel of `child_process.fork`. The `id` lets the parent discard a late reply from a job it
 * already timed out. The buffer travels base64-encoded because IPC messages are JSON.
 */
export type AtsExtractRequest = { id: number; format: AtsResumeFormat; buffer: string };

export type AtsExtractResponse =
  | { id: number; ok: true; text: string; layout?: AtsLayoutSignals }
  | { id: number; ok: false; message: string };
