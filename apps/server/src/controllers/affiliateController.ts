import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { requireAuthUser } from "#middleware/auth";
import { AffiliateService } from "#services/affiliateService";
import { createSuccessResponse, handleValidationError } from "#utils/errors";
import { clickSchema, referralCodeSchema, withdrawalSchema } from "#validators/affiliateValidator";

export class AffiliateController {
  static async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(createSuccessResponse(await AffiliateService.getDashboard(requireAuthUser(req).id)));
    } catch (error) { next(error); }
  }
  static async enroll(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(createSuccessResponse(await AffiliateService.enroll(requireAuthUser(req).id)));
    } catch (error) { next(error); }
  }
  static async applyReferral(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = referralCodeSchema.parse(req.body);
      res.json(createSuccessResponse(await AffiliateService.applyReferral(requireAuthUser(req).id, code)));
    } catch (error) { next(error instanceof z.ZodError ? handleValidationError(error) : error); }
  }
  static async click(req: Request, res: Response, next: NextFunction) {
    try {
      const input = clickSchema.parse(req.body);
      res.json(createSuccessResponse(await AffiliateService.trackClick(input.code, input.referrerHost)));
    } catch (error) { next(error instanceof z.ZodError ? handleValidationError(error) : error); }
  }
  static async leaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const period = req.query.period === "all_time" ? "all_time" : "monthly";
      res.json(createSuccessResponse(await AffiliateService.leaderboard(period)));
    } catch (error) { next(error); }
  }
  static async withdraw(req: Request, res: Response, next: NextFunction) {
    try {
      const { amountCents } = withdrawalSchema.parse(req.body);
      res.json(createSuccessResponse(await AffiliateService.requestWithdrawal(requireAuthUser(req).id, amountCents)));
    } catch (error) { next(error instanceof z.ZodError ? handleValidationError(error) : error); }
  }
}
