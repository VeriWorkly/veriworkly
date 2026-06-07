import { Router } from "express";

import { flexibleAuth } from "#middleware/flexibleAuth";
import { requireApiKeyScopes } from "#middleware/apiKeyScope";

import { ShareController } from "#controllers/shareController";

const router = Router();

router.get(
  "/public/:username/:slug",
  flexibleAuth({ skipSession: true }),
  ShareController.getPublicReadable,
);
router.post(
  "/public/:username/:slug/verify",
  flexibleAuth({ skipSession: true }),
  ShareController.verifyPublicReadable,
);

router.use(flexibleAuth);

router.post("/", requireApiKeyScopes("resume:write"), ShareController.create);
router.get(
  "/documents/shared-ids",
  requireApiKeyScopes("resume:read"),
  ShareController.listSharedDocumentIds,
);
router.get("/documents/:documentId", requireApiKeyScopes("resume:read"), ShareController.list);
router.delete(
  "/documents/:documentId/links/:shareLinkId",
  requireApiKeyScopes("resume:write"),
  ShareController.revoke,
);

export default router;
