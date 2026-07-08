import { z } from "zod";

export const importGithubSchema = z.object({
  usernameOrUrl: z.string().trim().min(1, "GitHub username or URL is required"),
  replaceMaster: z.boolean().default(false),
});

export const importLinkedinSchema = z.object({
  profileText: z.string().trim().min(10, "LinkedIn profile text must be at least 10 characters long"),
  replaceMaster: z.boolean().default(false),
});

export type ImportGithubInput = z.infer<typeof importGithubSchema>;
export type ImportLinkedinInput = z.infer<typeof importLinkedinSchema>;
