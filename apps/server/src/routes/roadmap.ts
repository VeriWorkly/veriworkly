import { Router } from "express";

import { flexibleAuth } from "#middleware/flexibleAuth";
import { adminAuthMiddleware } from "#middleware/adminAuth";
import { requireApiKeyScopes } from "#middleware/apiKeyScope";

import {
  createRoadmapFeatureController,
  updateRoadmapFeatureController,
  deleteRoadmapFeatureController,
} from "#controllers/admin/adminRoadmapController";
import { RoadmapController } from "#controllers/roadmapController";

const router = Router();

router.get("/", flexibleAuth, requireApiKeyScopes("roadmap:read"), RoadmapController.getFeatures);

router.get("/stats", flexibleAuth, requireApiKeyScopes("roadmap:read"), RoadmapController.getStats);

router.get(
  "/:id",
  flexibleAuth,
  requireApiKeyScopes("roadmap:read"),
  RoadmapController.getFeatureById,
);

router.post("/admin", adminAuthMiddleware, createRoadmapFeatureController);
router.put("/admin/:id", adminAuthMiddleware, updateRoadmapFeatureController);
router.delete("/admin/:id", adminAuthMiddleware, deleteRoadmapFeatureController);

export default router;
