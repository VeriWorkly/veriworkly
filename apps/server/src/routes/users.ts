import { Router } from "express";

import { flexibleAuth } from "#middleware/flexibleAuth";
import { denyApiKeyAuth, requireApiKeyScopes } from "#middleware/apiKeyScope";

import { UserController } from "#controllers/userController";

const router = Router();

router.use(flexibleAuth);

router.get("/:username/availability", UserController.checkUsernameAvailability);

router.get("/me", requireApiKeyScopes("user:read"), UserController.getCurrentUser);
router.put("/me/name", requireApiKeyScopes("user:write"), UserController.updateUserName);
router.put("/me/username", requireApiKeyScopes("user:write"), UserController.updateUsername);
router.put("/me/sync", requireApiKeyScopes("user:write"), UserController.updateAutoSync);
// Session-only, deliberately. See denyApiKeyAuth: `user:write` is the same scope that
// renames an account, and an integration token must not be able to destroy one.
router.delete("/me", denyApiKeyAuth, UserController.deleteCurrentUser);

export default router;
