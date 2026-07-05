import { z } from "zod";
import { Router } from "express";

import { sendContactEmail } from "#services/mail";

import { logger } from "#utils/logger";
import { createSuccessResponse, createErrorResponse } from "#utils/errors";

const router = Router();

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

router.post("/", async (req, res) => {
  try {
    const parsed = contactSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json(
        createErrorResponse(
          400,
          "Validation failed",
          parsed.error.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
        ),
      );

      return;
    }

    const { name, email, subject, message } = parsed.data;

    await sendContactEmail({ name, email, subject, message });

    res.json(
      createSuccessResponse(
        {
          name,
          email,
          subject,
          timestamp: new Date().toISOString(),
        },
        "Message sent successfully",
      ),
    );
  } catch (error) {
    logger.error("Failed to process contact submission:", error);
    res
      .status(500)
      .json(createErrorResponse(500, "Internal server error. Failed to send message."));
  }
});

export default router;
