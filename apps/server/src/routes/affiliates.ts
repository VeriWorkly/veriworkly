import { Router } from "express";

import { config } from "#config";
import { AffiliateController } from "#controllers/affiliateController";
import { authMiddleware } from "#middleware/auth";
import { requireFeatureEnabled } from "#middleware/featureFlag";

const router = Router();

router.use(requireFeatureEnabled(config.growth.affiliateProgramEnabled, "The affiliate program"));

router.post("/click", AffiliateController.click);
router.get("/leaderboard", AffiliateController.leaderboard);
router.get("/me", authMiddleware, AffiliateController.dashboard);
router.post("/enroll", authMiddleware, AffiliateController.enroll);
router.post("/referral", authMiddleware, AffiliateController.applyReferral);
router.post("/withdrawals", authMiddleware, AffiliateController.withdraw);

export default router;
