import { Prisma } from "@prisma/client";
import { APIError, getOAuthState } from "better-auth/api";

import { config } from "#config";

import { prisma } from "#lib/prisma";

/**
 * GitHub linking rules (V-265, owner decision): one GitHub per VeriWorkly account, free or paid,
 * never removed or swapped once linked. Free users may import only from their linked GitHub
 * (`profileImportService`), so an unlink followed by a link to someone else's GitHub would get
 * round that rule.
 *
 * - Unlinking GitHub is refused: {@link GITHUB_UNLINK_FORBIDDEN}.
 * - Linking a GitHub account while a different one is linked is refused:
 *   {@link GITHUB_ALREADY_LINKED}. Re-linking the same GitHub account (to renew an expired
 *   token) is allowed; better-auth updates that row instead of creating one. Postgres backs
 *   this with a partial unique index, so two racing links cannot both win.
 * - One GitHub account on two VeriWorkly users is impossible already: `Account` is unique on
 *   `(providerId, accountId)`, and better-auth's link callback refuses an account owned by
 *   another user with `account_already_linked_to_different_user`.
 */
export const GITHUB_UNLINK_FORBIDDEN = "GITHUB_UNLINK_FORBIDDEN";
export const GITHUB_ALREADY_LINKED = "GITHUB_ALREADY_LINKED";

const GITHUB = "github";

/** `hooks.before`: refuses better-auth's `/unlink-account` for GitHub. */
export function assertGithubUnlinkAllowed(path: string, body: unknown): void {
  if (path !== "/unlink-account") return;
  if ((body as { providerId?: unknown } | undefined)?.providerId !== GITHUB) return;

  throw new APIError("FORBIDDEN", {
    message: "A linked GitHub account cannot be removed.",
    code: GITHUB_UNLINK_FORBIDDEN,
  });
}

/** The slice of better-auth's endpoint context this needs; null outside a request. */
type HookContext = {
  redirect: (url: string) => unknown;
  context: { options: { onAPIError?: { errorURL?: string } }; baseURL: string };
} | null;

/**
 * Where an OAuth callback would send the browser on error, resolved the way better-auth's
 * callback does (the link's `errorCallbackURL`, then `onAPIError.errorURL`); null outside one.
 */
async function oauthCallbackErrorUrl(ctx: HookContext): Promise<string | null> {
  let state: { errorURL?: unknown } | null;
  try {
    state = (await getOAuthState()) as { errorURL?: unknown } | null;
  } catch {
    return null;
  }
  if (!state) return null;

  if (typeof state.errorURL === "string" && state.errorURL) return state.errorURL;
  return ctx?.context.options.onAPIError?.errorURL || config.auth.studioLoginUrl;
}

/**
 * The refusal for a second GitHub. Inside an OAuth callback the browser is mid-redirect, so it is
 * sent back to the link's error URL with `error=GITHUB_ALREADY_LINKED` (better-auth's own link
 * errors arrive the same way); anywhere else the caller gets a 403 carrying the code.
 */
/**
 * OAuth callbacks (by their request-scoped state) in which a second GitHub was refused. A sign-in
 * that links by email swallows the refusal inside better-auth and redirects with its own
 * `unable_to_link_account`; {@link surfaceRefusedGithubSignIn} puts the real code back.
 */
const refusedInCallback = new WeakSet<object>();

async function currentOAuthState(): Promise<object | null> {
  try {
    const state = await getOAuthState();
    return state && typeof state === "object" ? state : null;
  } catch {
    return null;
  }
}

async function githubAlreadyLinked(ctx: HookContext): Promise<unknown> {
  const state = await currentOAuthState();
  if (state) refusedInCallback.add(state);

  const errorUrl = await oauthCallbackErrorUrl(ctx);
  if (errorUrl) {
    const separator = errorUrl.includes("?") ? "&" : "?";
    const location = `${errorUrl}${separator}error=${GITHUB_ALREADY_LINKED}`;
    // `ctx.redirect` is exactly this error with the endpoint's own headers.
    return ctx ? ctx.redirect(location) : new APIError("FOUND", undefined, { location });
  }

  return new APIError("FORBIDDEN", {
    message: "This account already has a different GitHub account linked.",
    code: GITHUB_ALREADY_LINKED,
  });
}

/**
 * `databaseHooks.account.create.before`: every new account row (an explicit link, or the implicit
 * link a sign-in makes by email) passes through here. A GitHub row for a user who already has a
 * GitHub row with another account id is refused. Two links racing past this check are settled by
 * the partial unique index and {@link githubAccountRaceGuard}.
 */
export async function refuseSecondGithubAccount(
  account: { userId?: unknown; providerId?: unknown; accountId?: unknown },
  ctx: HookContext,
): Promise<void> {
  if (account.providerId !== GITHUB) return;
  if (typeof account.userId !== "string" || account.accountId == null) return;

  const other = await prisma.account.findFirst({
    where: {
      userId: account.userId,
      providerId: GITHUB,
      accountId: { not: String(account.accountId) },
    },
    select: { id: true },
  });
  if (!other) return;

  throw await githubAlreadyLinked(ctx);
}

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === "P2002";
}

/**
 * Prisma extension on the client better-auth writes through. `Account_userId_github_key` (a
 * partial unique index on `userId` where `providerId = 'github'`, migration
 * `20261027120000_one_github_per_user`) makes the second of two racing GitHub links fail with
 * P2002; this turns that into the same GITHUB_ALREADY_LINKED outcome as the hook. A duplicate of
 * the same GitHub for the same user returns the existing row; a P2002 because the GitHub account
 * belongs to someone else (`(providerId, accountId)`) is left as it is.
 */
export const githubAccountRaceGuard = Prisma.defineExtension({
  name: "githubAccountRaceGuard",
  query: {
    account: {
      async create({ args, query }) {
        try {
          return await query(args);
        } catch (error) {
          const data = args.data as { userId?: unknown; providerId?: unknown; accountId?: unknown };
          if (!isUniqueViolation(error) || data.providerId !== GITHUB) throw error;

          const sameGithub = await prisma.account.findFirst({
            where: { providerId: GITHUB, accountId: String(data.accountId) },
          });
          // A double click linking the same GitHub to the same user: the first insert won and
          // the account is linked, so this one settles on that row instead of failing.
          if (sameGithub && sameGithub.userId === data.userId) return sameGithub;
          // The GitHub account belongs to another user: keep the original error.
          if (sameGithub) throw error;

          throw await githubAlreadyLinked(null);
        }
      },
    },
  },
});

const SWALLOWED_LINK_ERROR = "error=unable_to_link_account";

/**
 * `hooks.after`: when a GitHub sign-in's implicit link was refused here, better-auth answers with
 * a redirect carrying `error=unable_to_link_account`. This rewrites that redirect to
 * `error=GITHUB_ALREADY_LINKED`, so the studio sees the same code as on an explicit link. Other
 * link failures are left alone.
 */
export async function surfaceRefusedGithubSignIn(ctx: {
  path?: string;
  context: { returned?: unknown };
  redirect: (url: string) => unknown;
}): Promise<void> {
  if (!ctx.path?.startsWith("/callback/")) return;

  const state = await currentOAuthState();
  if (!state || !refusedInCallback.has(state)) return;

  const returned = ctx.context.returned as { status?: unknown; headers?: unknown } | undefined;
  if (returned?.status !== "FOUND" || !returned.headers) return;

  const location = new Headers(returned.headers as HeadersInit).get("location");
  if (!location?.includes(SWALLOWED_LINK_ERROR)) return;

  throw ctx.redirect(location.replace(SWALLOWED_LINK_ERROR, `error=${GITHUB_ALREADY_LINKED}`));
}
