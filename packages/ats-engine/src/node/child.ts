/**
 * @veriworkly/ats-engine/node/child — an extraction process for a server to fork.
 *
 * Run it as a separate OS process, not a worker thread: worker threads share the parent's V8
 * process, and repeatedly spawning threads that load pdf.js segfaults Node (reproduced on
 * v24.18.0 within 2-5 spawns). A child process has its own heap, so both a crash and a forced
 * kill on timeout are contained, which is what makes a timeout on a pathological PDF mean
 * anything.
 *
 *   fork(createRequire(import.meta.url).resolve("@veriworkly/ats-engine/node/child"))
 *
 * Speaks the protocol in `./protocol.ts`. Compiled JavaScript, so the parent needs no
 * TypeScript loader to start it, in development or production.
 */

import { extractResume } from "./extract.js";
import type { AtsExtractRequest, AtsExtractResponse } from "./protocol.js";

process.on("message", (request: AtsExtractRequest) => {
  void (async () => {
    let response: AtsExtractResponse;
    try {
      const { text, layout } = await extractResume(
        Buffer.from(request.buffer, "base64"),
        request.format,
      );
      response = { id: request.id, ok: true, text, layout };
    } catch (error) {
      response = {
        id: request.id,
        ok: false,
        message: error instanceof Error ? error.message : "Resume extraction failed",
      };
    }
    process.send?.(response);
  })();
});

// Exit rather than linger if the parent goes away without killing us.
process.on("disconnect", () => process.exit(0));
