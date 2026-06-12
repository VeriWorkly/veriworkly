import { Router } from "express";

import { AdminMonetizationController } from "#controllers/adminMonetizationController";
import { adminAuthMiddleware } from "#middleware/adminAuth";

const router = Router();
router.use(adminAuthMiddleware);
router.get("/", AdminMonetizationController.overview);
router.post("/credits", AdminMonetizationController.grantCredits);
router.post("/entitlements", AdminMonetizationController.grantEntitlement);
router.post("/commissions", AdminMonetizationController.createCommission);
router.patch("/withdrawals/:id", AdminMonetizationController.updateWithdrawal);
router.patch("/affiliates/:id", AdminMonetizationController.updateAffiliate);
router.patch("/commissions/:id", AdminMonetizationController.updateCommission);
export default router;
