import { vi } from "vitest";

/**
 * A fake Chat Completions endpoint, stubbed in as the global `fetch`.
 *
 * The ATS AI services call the provider through `@veriworkly/ats-engine/ai/openai-compatible`,
 * which posts with `fetch`. Stubbing at that boundary exercises the real adapter — the request
 * body a test inspects is exactly the one production would send.
 */

type Usage = { prompt_tokens: number; completion_tokens: number; total_tokens?: number };

export function chatResponse(
  content: unknown,
  { id = "cmpl-1", usage, finish = "stop" }: { id?: string; usage?: Usage; finish?: string } = {},
) {
  const body = {
    id,
    choices: [
      {
        finish_reason: finish,
        message: { content: typeof content === "string" ? content : JSON.stringify(content) },
      },
    ],
    usage,
  };
  return { ok: true, status: 200, text: async () => JSON.stringify(body) };
}

export function httpError(status: number, message = "error") {
  return { ok: false, status, text: async () => JSON.stringify({ error: { message } }) };
}

export function stubChatApi() {
  const fetch =
    vi.fn<
      (url: string, init: { body: string; headers: Record<string, string> }) => Promise<unknown>
    >();
  vi.stubGlobal("fetch", fetch);
  return {
    fetch,
    /** The JSON body of the n-th request (default: the last). */
    body(index = fetch.mock.calls.length - 1) {
      const call = fetch.mock.calls[index];
      if (!call) throw new Error(`No request #${index}`);
      return JSON.parse(call[1].body) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    },
  };
}
