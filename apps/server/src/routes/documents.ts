import { Router } from "express";

import { flexibleAuth } from "#middleware/flexibleAuth";
import { requireApiKeyScopes } from "#middleware/apiKeyScope";

import { DocumentController } from "#controllers/documentController";

const router = Router();

router.use(flexibleAuth);

router
  .route("/")
  .get(requireApiKeyScopes("resume:read"), DocumentController.list)
  .post(requireApiKeyScopes("resume:write"), DocumentController.create);

router
  .route("/:id")
  .get(requireApiKeyScopes("resume:read"), DocumentController.get)
  .patch(requireApiKeyScopes("resume:write"), DocumentController.update)
  .delete(requireApiKeyScopes("resume:write"), DocumentController.delete);

export default router;
