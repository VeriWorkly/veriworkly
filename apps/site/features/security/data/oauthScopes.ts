import type { OAuthScopeItem } from "../types";

export const OAUTH_SCOPES: OAuthScopeItem[] = [
  {
    provider: "GitHub OAuth 2.0",
    scope: "read:user, public_repo",
    accessType: "Read-Only",
    purpose:
      "Imports public repository names, stars, descriptions, and primary programming languages for your profile projects.",
    restrictions:
      "Zero write permissions, zero commit permissions, zero SSH key access, and zero organization admin permissions.",
  },
  {
    provider: "LinkedIn Archive Parser",
    scope: "Client-Side File Ingest",
    accessType: "Local Processing Only",
    purpose:
      "Parses structured career history, positions, education, and skill endorsements from user-exported data files.",
    restrictions:
      "Zero scraping bots, zero password storage, zero automated LinkedIn network requests, and zero remote credential transmission.",
  },
  {
    provider: "Better Auth Identity",
    scope: "Email OTP Verification",
    accessType: "Passwordless Token",
    purpose:
      "Authenticates account ownership via short-lived numeric one-time passcodes delivered directly to your email.",
    restrictions:
      "Zero stored passwords to breach, cryptographically salted session cookies with HttpOnly, Secure, and SameSite attributes.",
  },
];
