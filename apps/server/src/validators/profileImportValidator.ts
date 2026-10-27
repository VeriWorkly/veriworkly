import { z } from "zod";

export const importGithubSchema = z.object({
  usernameOrUrl: z.string().trim().min(1, "GitHub username or URL is required"),
  replaceMaster: z.boolean().default(false),
});

/** What the conversion reads; the engine cut anything longer, so it was paid for and dropped. */
export const LINKEDIN_PROFILE_TEXT_MAX = 50_000;

export const importLinkedinSchema = z.object({
  profileText: z
    .string()
    .trim()
    .min(10, "LinkedIn profile text must be at least 10 characters long")
    .max(LINKEDIN_PROFILE_TEXT_MAX, "LinkedIn profile text must be at most 50,000 characters long"),
  replaceMaster: z.boolean().default(false),
  /**
   * The client's id for this import (V-239), as on every other AI route: a retry with the same id
   * after a lost response is answered with the stored document instead of paying again.
   * Optional while older clients send none (the server then makes one up, unreplayable).
   */
  requestId: z.string().trim().min(8).max(128).optional(),
});
