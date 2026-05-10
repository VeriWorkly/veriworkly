import { Router } from "express";

import { authMiddleware } from "#middleware/auth";

import { ShareController } from "#controllers/shareController";

const router = Router();

router.get("/:token", ShareController.getPublic);
router.post("/:token/verify", ShareController.verifyPublic);

router.use(authMiddleware);

router.post("/", ShareController.create);
router.get("/documents/:documentId", ShareController.list);
router.delete("/documents/:documentId/links/:shareLinkId", ShareController.revoke);

export default router;
