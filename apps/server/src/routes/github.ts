import { Router } from "express";

import { flexibleAuth } from "#middleware/flexibleAuth";
import { adminAuthMiddleware } from "#middleware/adminAuth";
import { requireApiKeyScopes } from "#middleware/apiKeyScope";

import { GithubController } from "#controllers/githubController";

const router = Router();

router.get(
  "/stats",
  flexibleAuth({ skipSession: true }),
  requireApiKeyScopes("github:read"),
  GithubController.getStats,
);
router.get(
  "/issues",
  flexibleAuth({ skipSession: true }),
  requireApiKeyScopes("github:read"),
  GithubController.getIssues,
);

router.post("/admin/sync", adminAuthMiddleware, GithubController.syncStats);

export default router;
