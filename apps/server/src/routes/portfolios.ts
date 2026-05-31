import { Router } from "express";

import { authMiddleware } from "#middleware/auth";

import { PortfolioController } from "#controllers/portfolioController";

const router = Router();

router.get("/public", PortfolioController.listPublic);
router.get("/public/:subdomain", PortfolioController.getPublic);

router.post("/public/:subdomain/view", PortfolioController.recordView);

router.get("/me", authMiddleware, PortfolioController.getMe);
router.put("/draft", authMiddleware, PortfolioController.saveDraft);

router.get(
  "/subdomains/:slug/availability",
  authMiddleware,
  PortfolioController.subdomainAvailability,
);
router.get("/preview/:documentId", authMiddleware, PortfolioController.preview);

router.post("/publish", authMiddleware, PortfolioController.publish);
router.post("/unpublish", authMiddleware, PortfolioController.unpublish);

router.get("/analytics", authMiddleware, PortfolioController.analytics);

export default router;
