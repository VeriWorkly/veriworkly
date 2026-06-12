import type { NextFunction, Request, Response } from "express";

import { z } from "zod";

import { requireAuthUser } from "#middleware/auth";

import { AiService } from "#services/aiService";

import { createSuccessResponse, handleValidationError } from "#utils/errors";

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
      const result = await AiService.generate(requireAuthUser(req).id, input);

      res.json(createSuccessResponse(result));
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : error);
    }
  }
}
