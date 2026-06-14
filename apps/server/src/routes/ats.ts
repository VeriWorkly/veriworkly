import { Router } from "express";
import multer from "multer";

import { AtsController } from "#controllers/atsController";
import { requireApiKeyScopes } from "#middleware/apiKeyScope";
import { flexibleAuth } from "#middleware/flexibleAuth";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

router.get("/quota", flexibleAuth, AtsController.quota);
router.post("/extract", flexibleAuth, upload.single("resume"), AtsController.extract);
router.post("/check", flexibleAuth, AtsController.check);
router.post("/analyze", flexibleAuth, requireApiKeyScopes("ai:write"), AtsController.analyze);
router.post(
  "/convert-resume",
  flexibleAuth,
  requireApiKeyScopes("ai:write"),
  AtsController.convertResume,
);

export default router;
