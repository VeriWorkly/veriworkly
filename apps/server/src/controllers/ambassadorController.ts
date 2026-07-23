import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { requireAuthUser } from "#middleware/auth";
import { AmbassadorService } from "#services/ambassadorService";
import { createSuccessResponse, handleValidationError } from "#lib/errors";
import { ambassadorApplicationSchema } from "#validators/ambassadorValidator";

export class AmbassadorController {
  static async status(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(createSuccessResponse(await AmbassadorService.getStatus(requireAuthUser(req).id)));
    } catch (error) {
      next(error);
    }
  }

  static async apply(req: Request, res: Response, next: NextFunction) {
    try {
      const { collegeName, graduationYear } = ambassadorApplicationSchema.parse(req.body);
      res.json(
        createSuccessResponse(
          await AmbassadorService.apply(requireAuthUser(req).id, collegeName, graduationYear),
        ),
      );
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : error);
    }
  }
}
