import { Router } from "express";

import { flexibleAuth } from "#middleware/flexibleAuth";
import { requireApiKeyScopes } from "#middleware/apiKeyScope";

import { UserController } from "#controllers/userController";

const router = Router();

router.use(flexibleAuth);

router.get("/me", requireApiKeyScopes("user:read"), UserController.getCurrentUser);
router.put("/me/name", requireApiKeyScopes("user:write"), UserController.updateUserName);

export default router;
