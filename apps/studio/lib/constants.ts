import type { ResumeSectionId } from "@/types/resume";

export const WORKSPACE_SETTINGS_STORAGE_KEY = "veriworkly:workspace-settings";

export const MASTER_PROFILE_STORAGE_KEY = "veriworkly:master-profile";

const NEXT_PUBLIC_BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";

const INTERNAL_BACKEND_BASE_URL = process.env.BACKEND_INTERNAL_URL?.replace(/\/+$/, "") || "";

export const BACKEND_BASE_URL =
  typeof window === "undefined"
    ? INTERNAL_BACKEND_BASE_URL || NEXT_PUBLIC_BACKEND_BASE_URL
    : NEXT_PUBLIC_BACKEND_BASE_URL;

export function backendApiUrl(path: string) {
  const trimmedPath = path.trim();

  if (/^https?:\/\//i.test(trimmedPath)) {
    return trimmedPath;
  }

  const normalizedPath = trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`;

  if (!BACKEND_BASE_URL) {
    throw new Error(
      "Backend base URL is not configured. Set NEXT_PUBLIC_BACKEND_URL and optionally BACKEND_INTERNAL_URL for server-side runtime.",
    );
  }

  return `${BACKEND_BASE_URL}${normalizedPath}`;
}

export const SECTION_LABELS: Record<ResumeSectionId, string> = {
  basics: "Basics",
  links: "Links",
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  projects: "Projects",
  skills: "Skills",
  interests: "Interests",
  certifications: "Certifications",
  volunteer: "Volunteer",
  references: "References",
  achievements: "Achievements",
  awards: "Awards",
  publications: "Publications",
  languages: "Languages",
  custom: "Custom",
};
