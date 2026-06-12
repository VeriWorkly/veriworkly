import { Router } from "express";

import { authMiddleware } from "#middleware/auth";

import { BillingController } from "#controllers/billingController";

const router = Router();

router.get("/me", authMiddleware, BillingController.getMe);
router.get("/history", authMiddleware, BillingController.history);
router.get("/credits", authMiddleware, BillingController.credits);
router.get("/credits/history", authMiddleware, BillingController.creditHistory);

router.post("/portal", authMiddleware, BillingController.portal);
router.post("/checkout", authMiddleware, BillingController.checkout);
router.post("/credits/checkout", authMiddleware, BillingController.creditPackCheckout);

export default router;
