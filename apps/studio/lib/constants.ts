export const WORKSPACE_SETTINGS_STORAGE_KEY = "veriworkly:workspace-settings";

export const MASTER_PROFILE_STORAGE_KEY = "veriworkly:master-profile";

const NEXT_PUBLIC_BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";

const INTERNAL_BACKEND_BASE_URL = process.env.BACKEND_INTERNAL_URL?.replace(/\/+$/, "") || "";

const BACKEND_BASE_URL =
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

/**
 * The name an email-code sign-up is created with: better-auth needs one, and the person has not
 * given theirs yet. The server's welcome mail treats it as "no name" too (authMail.ts).
 */
export const OTP_SIGN_UP_PLACEHOLDER_NAME = "Veriworkly User";

/** The account's own name, or undefined while it is blank or still the sign-up placeholder. */
export function accountName(name: string | null | undefined) {
  const trimmed = name?.trim();
  return trimmed && trimmed !== OTP_SIGN_UP_PLACEHOLDER_NAME ? trimmed : undefined;
}
