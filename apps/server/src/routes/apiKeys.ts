import { Router } from "express";

import { authMiddleware } from "#middleware/auth";

import { ApiKeyController } from "#controllers/apiKeyController";

const router = Router();

router.use(authMiddleware);

router.route("/").get(ApiKeyController.listKeys).post(ApiKeyController.createKey);

router.route("/:id").get(ApiKeyController.getKey).delete(ApiKeyController.deleteKey);

router.post("/:id/rotate", ApiKeyController.rotateKey);
router.post("/:id/revoke", ApiKeyController.revokeKey);

export default router;
