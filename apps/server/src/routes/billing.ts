import { Router } from "express";

import { authMiddleware } from "#middleware/auth";

import { BillingController } from "#controllers/billingController";

const router = Router();

router.get("/me", authMiddleware, BillingController.getMe);

router.post("/portal", authMiddleware, BillingController.portal);
router.post("/checkout", authMiddleware, BillingController.checkout);

export default router;
