import type { OAuthScopeItem } from "../types";

/**
 * Corrections against the code, because this table is read as a specification:
 *
 * - The GitHub row claimed "read:user, public_repo". No scopes are configured for the
 *   GitHub provider in `apps/server/src/auth/index.ts`, so Better Auth's defaults
 *   apply. `public_repo` is also a *write* scope, which contradicted the
 *   "zero write permissions" cell sitting beside it either way.
 * - The LinkedIn row claimed "Local Processing Only" and "zero remote credential
 *   transmission". Import POSTs the pasted text to /profiles/import/linkedin, which
 *   forwards it to a third-party model. The first half was the opposite of the truth;
 *   the second half was true but framed to imply the first.
 */
export const OAUTH_SCOPES: OAuthScopeItem[] = [
  {
    provider: "GitHub OAuth 2.0",
    scope: "Better Auth defaults (no elevated scopes requested)",
    accessType: "Sign-in & public data",
    purpose:
      "Signs you in, and imports public repository names, stars, descriptions, and primary languages for your profile projects. Only your own connected account is importable on the free tier.",
    restrictions:
      "We request no repository write scope, no commit access, no SSH key access, and no organization admin permissions. GitHub shows you the exact scopes on its own consent screen — that screen, not this table, is the authority.",
  },
  {
    provider: "LinkedIn Import",
    scope: "Text you paste or upload yourself",
    accessType: "Server-side, AI-parsed",
    purpose:
      "Turns exported LinkedIn text into structured career history, positions, education, and skills.",
    restrictions:
      "We never ask for your LinkedIn password, never scrape, and make no automated requests to LinkedIn on your behalf. Be aware that parsing happens on our servers: the text you paste is sent to a third-party AI model to be structured, then discarded. It is not stored and not used for training.",
  },
  {
    provider: "Better Auth Identity",
    scope: "Email OTP Verification",
    accessType: "Passwordless Token",
    purpose:
      "Authenticates account ownership via short-lived numeric one-time passcodes delivered to your email.",
    restrictions:
      "No stored passwords to breach, and session cookies carry HttpOnly, Secure, and SameSite attributes.",
  },
];
