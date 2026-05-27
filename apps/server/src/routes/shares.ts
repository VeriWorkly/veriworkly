import { Router } from "express";

import { authMiddleware } from "#middleware/auth";

import { ShareController } from "#controllers/shareController";

const router = Router();

router.get("/public/:username/:slug", ShareController.getPublicReadable);
router.post("/public/:username/:slug/verify", ShareController.verifyPublicReadable);

router.use(authMiddleware);

router.post("/", ShareController.create);
router.get("/documents/shared-ids", ShareController.listSharedDocumentIds);
router.get("/documents/:documentId", ShareController.list);
router.delete("/documents/:documentId/links/:shareLinkId", ShareController.revoke);

export default router;
