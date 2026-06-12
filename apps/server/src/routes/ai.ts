import { Router } from "express";

import { AiController } from "#controllers/aiController";

import { requireApiKeyScopes } from "#middleware/apiKeyScope";
import { flexibleAuth } from "#middleware/flexibleAuth";

const router = Router();

router.get("/actions", flexibleAuth, AiController.actions);
router.post("/generate", flexibleAuth, requireApiKeyScopes("ai:write"), AiController.generate);

export default router;
