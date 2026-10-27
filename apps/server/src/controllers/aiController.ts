import type { NextFunction, Request, Response } from "express";

import { z } from "zod";

import { requireAuthUser } from "#middleware/auth";
import { withAiSlot } from "#middleware/rateLimit";

import { AiService } from "#services/aiService";
import { aiRequestSignal, aiRouteError } from "#services/ats/aiDeadline";

import { createSuccessResponse, handleValidationError } from "#lib/errors";

import { aiGenerateSchema } from "#validators/aiValidator";

export class AiController {
  static async actions(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json(createSuccessResponse(AiService.actions()));
    } catch (error) {
      next(error);
    }
  }

  static async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const input = aiGenerateSchema.parse(req.body);
      const user = requireAuthUser(req);
      // V-038: at most two provider calls in flight per user; V-034: the call ends with the
      // client or at the request deadline, and its reservation is released either way.
      const result = await withAiSlot(user.id, () =>
        AiService.generate(user.id, input, aiRequestSignal(res)),
      );

      res.json(createSuccessResponse(result));
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : aiRouteError(error));
    }
  }
}
