import { Router, type RequestHandler } from "express";
import { z } from "zod";

import { logger } from "#lib/logger";
import { createErrorResponse } from "#lib/errors";
import { flexibleAuth } from "#middleware/flexibleAuth";

/**
 * Crash reports from our own front ends (the marketing site's error boundaries), which run
 * mostly in browsers we otherwise never hear from. Same gate as `/stats/events`: an allowlisted
 * Origin, no session. Logged and nothing else, so a forged report can only add a log line.
 */
const router = Router();

const clientErrorSchema = z
  .object({
    app: z.enum(["site"]),
    message: z.string().trim().min(1).max(500),
    digest: z.string().trim().max(64).optional(),
    url: z.string().trim().max(500).optional(),
    stack: z.string().max(4_000).optional(),
    boundary: z.enum(["root", "marketing", "global"]).optional(),
  })
  .strict();

export const recordClientError: RequestHandler = (req, res) => {
  const parsed = clientErrorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(
      createErrorResponse(
        400,
        "Validation failed",
        parsed.error.issues.map((issue) => ({
          path: issue.path.map(String).join("."),
          message: issue.message,
        })),
      ),
    );
    return;
  }

  logger.warn("[client-error]", {
    ...parsed.data,
    userAgent: req.get("user-agent")?.slice(0, 200),
  });
  res.status(204).end();
};

router.post("/", flexibleAuth({ skipSession: true }), recordClientError);

export default router;
