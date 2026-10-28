import { z } from "zod";

/**
 * `POST /stats/events`: an event name of 1-64 characters and, for internal callers only, a
 * positive integer value up to 1000 (public callers always count as 1).
 */
export const usageMetricEventSchema = z.object({
  event: z.string().trim().min(1).max(64),
  value: z.number().int().positive().max(1000).optional(),
});
