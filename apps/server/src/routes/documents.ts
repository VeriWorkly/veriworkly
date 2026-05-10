import { Router } from "express";

import { authMiddleware } from "#middleware/auth";

import { DocumentController } from "#controllers/documentController";

const router = Router();

router.use(authMiddleware);

router.route("/").get(DocumentController.list).post(DocumentController.create);

router
  .route("/:id")
  .get(DocumentController.get)
  .patch(DocumentController.update)
  .delete(DocumentController.delete);

export default router;
