import { Router } from "express";

import { authMiddleware } from "#middleware/auth";

import { ProfileController } from "#controllers/profileController";

const router = Router();

router.use(authMiddleware);

router
  .route("/master")
  .get(ProfileController.getMasterProfile)
  .put(ProfileController.updateMasterProfile);

export default router;
