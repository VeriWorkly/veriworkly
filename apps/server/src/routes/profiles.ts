import { Router } from "express";

import { flexibleAuth } from "#middleware/flexibleAuth";
import { requireApiKeyScopes } from "#middleware/apiKeyScope";

import { ProfileController } from "#controllers/profileController";

const router = Router();

router.use(flexibleAuth);

router
  .route("/master")
  .get(requireApiKeyScopes("resume:read"), ProfileController.getMasterProfile)
  .put(requireApiKeyScopes("resume:write"), ProfileController.updateMasterProfile);

export default router;
