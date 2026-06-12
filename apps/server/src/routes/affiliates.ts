import { Router } from "express";

import { AffiliateController } from "#controllers/affiliateController";
import { authMiddleware } from "#middleware/auth";

const router = Router();

router.post("/click", AffiliateController.click);
router.get("/leaderboard", AffiliateController.leaderboard);
router.get("/me", authMiddleware, AffiliateController.dashboard);
router.post("/enroll", authMiddleware, AffiliateController.enroll);
router.post("/referral", authMiddleware, AffiliateController.applyReferral);
router.post("/withdrawals", authMiddleware, AffiliateController.withdraw);

export default router;
