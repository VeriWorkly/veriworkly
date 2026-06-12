import { Router } from "express";

import { authMiddleware } from "#middleware/auth";

import { PortfolioAssetController } from "#controllers/portfolioAssetController";

const router = Router();

router.use(authMiddleware);

router.post("/complete", PortfolioAssetController.complete);
router.post("/upload-url", PortfolioAssetController.uploadUrl);

router.delete("/:id", PortfolioAssetController.delete);

export default router;
