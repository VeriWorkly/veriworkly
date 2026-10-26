import type { ResumeData } from "@/types/resume";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import { AI_JOB_DESCRIPTION_MAX_CHARS } from "@/features/ai/ai-api";

/*
 * What the editors send the AI provider as context. Only what the text is about: never a
 * name, email, phone, address or link, and never layout settings. A smaller context also
 * stays under the server's private size cap, whose 400 the user could do nothing about.
 */

/** The part of a resume that says what the person does, less its summary. */
export function resumeAiContext(resume: ResumeData) {
  return {
    role: resume.basics.role,
    headline: resume.basics.headline,
    experience: resume.experience.map(({ role, company, summary, highlights }) => ({
      role,
      company,
      summary,
      highlights,
    })),
    skills: resume.skills.map(({ name, keywords }) => ({ name, keywords })),
  };
}

/**
 * Context for writing a letter's body. The body itself goes as the request's text. The job
 * post goes as the job description and here too: the server's prompt template is private
 * and may only read the context.
 */
export function coverLetterAiContext(content: CoverLetterContent, resume: ResumeData | null) {
  return JSON.stringify({
    targetRole: content.jobTitle,
    company: content.companyName,
    subject: content.subject,
    opening: content.opening,
    proofPoints: content.highlights,
    jobPost: (content.jobPost ?? "").trim().slice(0, AI_JOB_DESCRIPTION_MAX_CHARS),
    ...(resume ? { resume: { ...resumeAiContext(resume), summary: resume.summary } } : {}),
  });
}
