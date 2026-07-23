import { Router } from "express";

import { config } from "#config";
import { AmbassadorController } from "#controllers/ambassadorController";
import { authMiddleware } from "#middleware/auth";
import { requireFeatureEnabled } from "#middleware/featureFlag";

const router = Router();

router.use(requireFeatureEnabled(config.growth.ambassadorProgramEnabled, "The ambassador program"));

router.get("/me", authMiddleware, AmbassadorController.status);
router.post("/apply", authMiddleware, AmbassadorController.apply);

export default router;
