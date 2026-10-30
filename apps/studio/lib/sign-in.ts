import { toast } from "sonner";

import { siteConfig } from "@/config/site";
import { ApiRequestError, fetchApiData } from "@/utils/fetchApiData";

const REFERRAL_STORAGE_KEY = "veriworkly:referral";

/** Matches the server's attribution window: a code is refused on accounts older than 30 days. */
const REFERRAL_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Kept from the click on `/login?ref=…` until the first sign-in, however far away that is: the
 * visitor may continue as a guest and sign in days later from a bare `/login`.
 */
export function rememberReferralCode(code: string, now = new Date()) {
  try {
    localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify({ code, savedAt: now.getTime() }));
  } catch (error) {
    // Storage blocked (private mode, quota): this visit can still sign in, just unattributed.
    console.warn("Could not remember the referral code.", error);
  }
}

export function readReferralCode(now = new Date()): string | null {
  const raw = localStorage.getItem(REFERRAL_STORAGE_KEY);
  if (!raw) return null;

  try {
    const { code, savedAt } = JSON.parse(raw) as { code?: unknown; savedAt?: unknown };

    if (
      typeof code === "string" &&
      typeof savedAt === "number" &&
      now.getTime() - savedAt <= REFERRAL_TTL_MS
    ) {
      return code;
    }
  } catch {
    // Unreadable entry: dropped below like an expired one.
  }

  localStorage.removeItem(REFERRAL_STORAGE_KEY);
  return null;
}

const SOCIAL_SIGN_IN_KEY = "veriworkly:social-sign-in";

/** Long enough for a slow provider consent screen; a callback opened later is not that sign-in. */
const SOCIAL_SIGN_IN_TTL_MS = 30 * 60 * 1000;

/**
 * Noted when a social sign-in button is pressed. The provider sends the browser back to
 * `/login/callback` in the same tab, so the note is there for that sign-in alone: an account
 * already signed in that merely opens a callback link (`?ref=CODE`) never gets one (S-373).
 */
export function markSocialSignInStarted(now = new Date()) {
  try {
    sessionStorage.setItem(SOCIAL_SIGN_IN_KEY, String(now.getTime()));
  } catch {
    // Storage blocked: the sign-in still works, it only finishes without a referral.
  }
}

/**
 * Drops the note: the social sign-in did not start, or another sign-in finished first (an email
 * code), so a callback link opened later is not that sign-in.
 */
export function clearSocialSignInStarted() {
  try {
    sessionStorage.removeItem(SOCIAL_SIGN_IN_KEY);
  } catch {
    // Storage blocked: there is no note to drop.
  }
}

/** Whether this tab started the sign-in now finishing; the note is spent either way. */
export function takeSocialSignInStarted(now = new Date()) {
  try {
    const startedAt = Number(sessionStorage.getItem(SOCIAL_SIGN_IN_KEY));
    sessionStorage.removeItem(SOCIAL_SIGN_IN_KEY);
    const age = now.getTime() - startedAt;

    return startedAt > 0 && age >= 0 && age <= SOCIAL_SIGN_IN_TTL_MS;
  } catch {
    return false;
  }
}

/**
 * The work every sign-in path (email code, social callback) does once the session exists.
 *
 * It deliberately leaves sync alone: `/users/me.autoSyncEnabled` is the user's choice (on by
 * default for a new account) and `AuthInitializer` applies it on the next render. Forcing it on
 * here overrode every saved opt-out and uploaded the device's documents.
 *
 * A remembered referral is applied once. The server's refusal (too old, already purchased) is
 * returned for the caller to show and the code is dropped; a network or server failure keeps it
 * for the next sign-in.
 *
 * Any social sign-in note left in the tab is dropped: this sign-in is the one that finished.
 */
export async function finishSignIn(now = new Date()): Promise<{ referralError?: string }> {
  clearSocialSignInStarted();
  const code = readReferralCode(now);
  if (!code) return {};

  try {
    await fetchApiData("/affiliates/referral", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  } catch (error) {
    if (error instanceof ApiRequestError && error.status < 500) {
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
    }

    return {
      referralError: error instanceof Error ? error.message : "The referral could not be applied.",
    };
  }

  localStorage.removeItem(REFERRAL_STORAGE_KEY);
  return {};
}

/** The sign-in page, set to come back to this page afterwards. */
export function signInHref() {
  const here = `${window.location.pathname}${window.location.search}`;

  return `/login?callbackURL=${encodeURIComponent(here)}`;
}

/** For an action a guest cannot take: says why and offers the way in, back to this page. */
export function toastSignInRequired(message: string) {
  toast.error(message, {
    action: { label: "Sign in", onClick: () => window.location.assign(signInHref()) },
  });
}

const SIGN_IN_ERRORS: Record<string, string> = {
  account_not_linked:
    "This email already has a VeriWorkly account. Sign in with your email code first; you can link GitHub afterwards from Import profile.",
  unable_to_link_account: "That account could not be linked. Sign in with your email code instead.",
  // Sent only by a server that still requires one email on both accounts.
  "email_doesn't_match": "This server still requires the same email on both accounts.",
  // Your account keeps the one GitHub account it linked (owner decision).
  github_already_linked:
    "Your account is already linked to a different GitHub account. It can't be changed.",
  different_github_account:
    "Your account is already linked to a different GitHub account. It can't be changed.",
  // The server's codes (`auth/githubLinking.ts`) are upper case; codes are matched lower-cased.
  github_unlink_forbidden: "A linked GitHub account can't be removed.",
  unlink_not_allowed: "A linked GitHub account can't be removed.",
  unlinking_not_allowed: "A linked GitHub account can't be removed.",
  account_already_linked_to_different_user:
    "That account is already linked to another VeriWorkly user.",
  email_not_found: "The provider did not share an email address, so we could not sign you in.",
  signup_disabled: "New accounts cannot be created right now.",
  state_mismatch: "The sign-in took too long or was opened in another tab. Please try again.",
  please_restart_the_process:
    "The sign-in took too long or was opened in another tab. Please try again.",
};

/**
 * What a failed redirect sign-in says, from its `error` code only. The free-text
 * `error_description` is never shown: anyone can put it in a link to the real login page.
 */
export function describeSignInError(code: string): { tone: "info" | "error"; message: string } {
  if (code === "access_denied" || code === "cancelled") {
    return { tone: "info", message: "Sign in was cancelled." };
  }

  return {
    tone: "error",
    message: SIGN_IN_ERRORS[code.toLowerCase()] ?? "Sign in failed. Please try again.",
  };
}

/** The failed sign-in a redirect reports in its query, read from the `error` code alone. */
export function signInFailureFromQuery(params: Pick<URLSearchParams, "get">) {
  const code = params.get("error");

  return code ? describeSignInError(code) : null;
}

/**
 * Links a GitHub login to the signed-in account, for the free GitHub import of one's own
 * profile. GitHub sends the browser back here; a refused link lands on the profile page, which
 * says why.
 */
export async function linkGithubAccount() {
  // Loaded on click: the auth client is not needed by the many pages that import this module.
  const { authClient } = await import("@/lib/auth-client");
  const { error } = await authClient.linkSocial({
    provider: "github",
    callbackURL: `${siteConfig.links.app}${window.location.pathname}${window.location.search}`,
    errorCallbackURL: `${siteConfig.links.app}/profile`,
  });

  if (error) {
    const code = typeof error.code === "string" ? error.code.toLowerCase() : "";

    throw new Error(
      SIGN_IN_ERRORS[code] ??
        (error.message || "Linking GitHub could not start. Please try again."),
    );
  }
}
