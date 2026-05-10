import { Router } from "express";

import { adminAuthMiddleware } from "#middleware/adminAuth";

import { StatsController } from "#controllers/statsController";

const router = Router();

router.post("/events", StatsController.recordUsageMetric);

router.get("/admin/dashboard", adminAuthMiddleware, StatsController.getAdminDashboardStats);

export default router;
