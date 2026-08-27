import { z } from "zod";
import { Router } from "express";

import { sendContactEmail } from "#services/mail/index";
import { logger } from "#lib/logger";
import { createSuccessResponse, createErrorResponse } from "#lib/errors";

const router = Router();

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().trim().email("Invalid email address").max(254, "Email is too long"),
  subject: z.string().trim().min(1, "Subject is required").max(200, "Subject is too long"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(5000, "Message is too long"),
  // Honeypot: a hidden field real users never see or fill. Bots filling it will be caught in the route logic.
  website: z.string().optional().or(z.literal("")),
  // Optional client-side timestamp in milliseconds when form was loaded.
  _ts: z.number().optional(),
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

    const { name, email, subject, message, website, _ts } = parsed.data;

    // 1. Honeypot check: If the hidden 'website' field was filled, it's a bot.
    if (website) {
      logger.warn("[Contact] Bot blocked via honeypot trap", {
        ip: req.ip,
        name,
        email,
        honeypotValue: website,
      });
      // Pretend success so the bot does not adapt, but skip sending any email.
      res.json(
        createSuccessResponse(
          { name, email, subject, timestamp: new Date().toISOString() },
          "Message sent successfully",
        ),
      );
      return;
    }

    // 2. Timing check: If submitted impossibly fast (< 1200ms from form mount), it's automated.
    if (typeof _ts === "number" && _ts > 0) {
      const elapsedMs = Date.now() - _ts;
      if (elapsedMs < 1200 && elapsedMs >= 0) {
        logger.warn("[Contact] Bot blocked via fast-submission timing check", {
          ip: req.ip,
          elapsedMs,
          email,
        });
        res.json(
          createSuccessResponse(
            { name, email, subject, timestamp: new Date().toISOString() },
            "Message sent successfully",
          ),
        );
        return;
      }
    }

    logger.info("[Contact] Received legitimate contact submission", {
      name,
      email,
      subject,
      ip: req.ip,
    });

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
    logger.error("[Contact] Failed to process contact submission:", error);
    res
      .status(500)
      .json(createErrorResponse(500, "Internal server error. Failed to send message."));
  }
});

export default router;

