import { Router } from "express";

import { flexibleAuth } from "#middleware/flexibleAuth";
import { adminAuthMiddleware } from "#middleware/adminAuth";

import { StatsController } from "#controllers/statsController";

const router = Router();

router.post("/events", flexibleAuth({ skipSession: true }), StatsController.recordUsageMetric);

router.get("/admin/dashboard", adminAuthMiddleware, StatsController.getAdminDashboardStats);

export default router;
