import { betterAuth } from "better-auth";
import { createHash } from "node:crypto";
import { IncomingHttpHeaders } from "node:http";
import { AsyncLocalStorage } from "node:async_hooks";

import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP } from "better-auth/plugins/email-otp";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";

import { config, isProduction } from "#config";

import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";

import { incrementFixedWindow } from "#middleware/rateLimit";

import { betterAuthLogger } from "#auth/authLogger";
import {
  invalidateCacheByToken,
  isSignOutPath,
  revokeSessionCacheForCookie,
  revokeSessionCaches,
} from "#utils/authCache";
import { incrementUsageMetric } from "#services/analyticsService";

import { sendAuthOtpEmail, sendWelcomeEmail, sendLoginAlertEmail } from "#services/mail/index";

export const authRequestContext = new AsyncLocalStorage<{
  ip: string;
  userAgent: string;
  provider?: string;
}>();

/** Endpoints whose only job is to mail an OTP; their limiter fails closed without Redis (V-094). */
const OTP_SEND_PATHS = new Set([
  "/email-otp/send-verification-otp",
  "/email-otp/request-password-reset",
  "/email-otp/request-email-change",
]);

const OTP_RECIPIENT_MAX_PER_HOUR = 5;
const OTP_RECIPIENT_WINDOW_SECONDS = 60 * 60;

function otpRecipientKey(email: string): string {
  const digest = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  return `auth:otp:recipient:${digest}`;
}

function otpThrottleUnavailable(error: unknown): APIError {
  logger.warn("OTP recipient throttle unavailable; refusing to send", {
    error: error instanceof Error ? error.message : String(error),
  });
  return new APIError("SERVICE_UNAVAILABLE", {
    message: "Sign-in codes are temporarily unavailable. Please try again shortly.",
  });
}

function otpRecipientExhausted(): APIError {
  return new APIError("TOO_MANY_REQUESTS", {
    message: "Too many codes requested for this email. Please try again later.",
  });
}

/**
 * V-157: per-recipient cap on OTP mails, so rotating IPs cannot mail-bomb one address. Counts a mail
 * about to be sent; refuses (fail closed) when Redis cannot count it.
 * TODO(V-157): add Turnstile to the OTP request form (needs studio work).
 */
export async function consumeOtpRecipientQuota(email: string): Promise<void> {
  let count: number;
  try {
    ({ count } = await incrementFixedWindow(otpRecipientKey(email), OTP_RECIPIENT_WINDOW_SECONDS));
  } catch (error) {
    throw otpThrottleUnavailable(error);
  }
  if (count > OTP_RECIPIENT_MAX_PER_HOUR) throw otpRecipientExhausted();
}

/**
 * Read-only check run before the OTP endpoints. `sendVerificationOTP` runs inside better-auth's
 * `runInBackgroundOrAwait`, which logs and swallows a throw, so a refusal there never reaches the
 * client; this hook is what turns an exhausted recipient into a 429 (or 503 without Redis).
 */
/**
 * Which address the pre-check above applies to, or none. Only where a mail goes out whatever the
 * address: a sign-in OTP (sign-up is open) and an email change (signed-in caller). The reset and
 * verification types only mail existing accounts, so a 429 there would reveal that the account
 * exists; those stay a uniform 200 and the cap inside `sendVerificationOTP` still stops the mail.
 * Never throws: a missing body or a non-string field just skips the check.
 */
export function otpPrecheckRecipient(path: string, body: unknown): string | undefined {
  const fields = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  if (path === "/email-otp/request-email-change")
    return typeof fields.newEmail === "string" ? fields.newEmail : undefined;

  if (path === "/email-otp/send-verification-otp" && fields.type === "sign-in")
    return typeof fields.email === "string" ? fields.email : undefined;

  return undefined;
}

/**
 * V-047 / V-099: welcome and login-alert mails go out after the hook returns, so a slow or failing
 * SMTP/Resend call never holds up OTP verify or the OAuth callback. The OTP mail itself stays
 * synchronous (the user is waiting for it). Failures are logged, never thrown.
 */
function sendInBackground(label: string, send: () => Promise<void>, meta: Record<string, unknown>) {
  void Promise.resolve()
    .then(send)
    .catch((error: unknown) => logger.warn(`Failed to send ${label} email`, { ...meta, error }));
}

export async function assertOtpRecipientQuotaAvailable(email: string): Promise<void> {
  let used: number;
  try {
    used = Number((await getRedis().get(otpRecipientKey(email))) ?? 0);
  } catch (error) {
    throw otpThrottleUnavailable(error);
  }
  if (used >= OTP_RECIPIENT_MAX_PER_HOUR) throw otpRecipientExhausted();
}

export const auth = betterAuth({
  // Its log lines go through the app logger, which masks email addresses (V-255).
  logger: betterAuthLogger,
  // better-auth's deprecated alias of `/email-otp/request-password-reset`, removed in its next
  // major (V-191). No app calls it; switching it off now means that bump cannot change anything.
  disabledPaths: ["/forget-password/email-otp"],

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  secondaryStorage: {
    get: async (key) => {
      try {
        const redis = getRedis();
        return (await redis.get(key)) || null;
      } catch (error) {
        logger.error("better-auth secondaryStorage get failed", { error });
        return null;
      }
    },

    set: async (key, value, ttl) => {
      try {
        const redis = getRedis();

        if (ttl) await redis.set(key, value, { EX: ttl });
        else await redis.set(key, value);
      } catch (error) {
        logger.error("better-auth secondaryStorage set failed", { error });
      }
    },

    delete: async (key) => {
      try {
        const redis = getRedis();
        await redis.del(key);
      } catch (error) {
        logger.error("better-auth secondaryStorage delete failed", { error });
      }
    },

    // Present so better-auth's limiter uses its atomic `consume` instead of get-then-set (V-094).
    // Its keys are `${ip}|${path}`. Without Redis the OTP-send paths report "over any limit"
    // (429) and everything else reports a first hit, which keeps today's fail-open behaviour.
    //
    // Only the limiter calls `increment`, and once it exists the limiter never reads or writes
    // these keys through get/set, so the `ba-rl:` prefix is applied here alone and stays
    // consistent. It also keeps first deploy clean: the old get-then-set limiter left JSON values
    // under the bare `${ip}|${path}` keys; INCR on those fails with "ERR value is not an integer"
    // until they expire (up to one rate-limit window), which would fail open, or closed on the
    // OTP-send paths. With the prefix no such collision can happen.
    increment: async (key, ttl) => {
      try {
        return (await incrementFixedWindow(`ba-rl:${key}`, ttl)).count;
      } catch (error) {
        const failClosed = OTP_SEND_PATHS.has(key.slice(key.lastIndexOf("|") + 1));
        logger.warn("better-auth rate limit counter unavailable", {
          failClosed,
          error: error instanceof Error ? error.message : String(error),
        });
        return failClosed ? Number.MAX_SAFE_INTEGER : 1;
      }
    },
  },

  appName: "Veriworkly",

  secret: config.auth.secret,
  baseURL: config.auth.baseUrl,

  basePath: "/api/v1/auth",
  trustedOrigins: config.allowedOrigins,

  onAPIError: {
    errorURL: config.auth.studioLoginUrl,
  },

  rateLimit: {
    enabled: true,
    window: Math.max(1, Math.ceil(config.rateLimit.authWindowMs / 1000)),
    max: config.rateLimit.authMaxRequests,
    storage: "secondary-storage",
    customRules: {
      "/email-otp/send-verification-otp": {
        window: 60,
        max: 3,
      },
      "/email-otp/verify-otp": {
        window: 60,
        max: 5,
      },
    },
  },

  advanced: {
    trustedProxyHeaders: true,
    cookiePrefix: "veriworkly-auth",
    useSecureCookies: isProduction,
    ipAddress: {
      ipAddressHeaders: config.auth.ipAddressHeaders,
    },
    crossSubDomainCookies: {
      enabled: !!config.auth.cookieDomain,
      domain: config.auth.cookieDomain,
    },
  },

  session: {
    storeSessionInDatabase: true,
    expiresIn: config.auth.sessionTtlSeconds,
    updateAge: config.auth.sessionResetTtlOnUse,
    cookieCache: {
      enabled: config.auth.sessionCacheEnabled,
      maxAge: config.auth.sessionCacheMaxAgeSeconds,
      strategy: "jwt",
    },
  },

  socialProviders: {
    ...(config.auth.googleClientId && config.auth.googleClientSecret
      ? {
          google: {
            clientId: config.auth.googleClientId,
            clientSecret: config.auth.googleClientSecret,
          },
        }
      : {}),
    ...(config.auth.githubClientId && config.auth.githubClientSecret
      ? {
          github: {
            clientId: config.auth.githubClientId,
            clientSecret: config.auth.githubClientSecret,
          },
        }
      : {}),
    ...(config.auth.linkedinClientId && config.auth.linkedinClientSecret
      ? {
          linkedin: {
            clientId: config.auth.linkedinClientId,
            clientSecret: config.auth.linkedinClientSecret,
          },
        }
      : {}),
  },

  account: {
    storeStateStrategy: "cookie",
    accountLinking: {
      enabled: true,
      // A trusted provider is linked to the existing user with the same email even when the
      // provider reports that email as unverified. GitHub returns `verified: false` for any
      // address a user has merely added, so trusting it lets anyone sign in as the owner of that
      // address (an OTP user's local row is already verified, which is the only check better-auth
      // applies on the local side). Google only issues verified emails. Untrusted providers still
      // link when the provider itself says the email is verified.
      trustedProviders: ["google"],
    },
  },

  plugins: [
    emailOTP({
      expiresIn: config.auth.otpTtlSeconds,
      allowedAttempts: config.auth.otpAllowedAttempts,
      disableSignUp: false,

      sendVerificationOTP: async ({ email, otp, type }) => {
        await consumeOtpRecipientQuota(email);
        await sendAuthOtpEmail({ email, otp, type });
      },
    }),
  ],

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const recipient = otpPrecheckRecipient(ctx.path, ctx.body);
      if (recipient) await assertOtpRecipientQuotaAvailable(recipient);

      // Sign-out only. The request's own cookie is the session being ended there; on
      // /revoke-session(s) it is the caller's session, which stays valid, and the sessions that
      // are revoked are tombstoned by `session.delete.after` instead.
      if (isSignOutPath(ctx.path)) {
        const cookieHeader = ctx.headers?.get("cookie") || "";

        // Tombstoned, not just deleted: a lookup in flight cannot re-cache it (V-122).
        if (cookieHeader) await revokeSessionCacheForCookie(cookieHeader);
      }
    }),
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          sendInBackground("welcome", () => sendWelcomeEmail(user.email, user.name || "there"), {
            userId: user.id,
          });
        },
      },

      update: {
        after: async (user) => {
          try {
            const sessions = await prisma.session.findMany({
              where: { userId: user.id },
              select: { token: true },
            });

            await Promise.all(sessions.map((session) => invalidateCacheByToken(session.token)));
          } catch (error) {
            // Never block the update, but a stale session cache must be visible (V-165).
            logger.warn("Session cache invalidation failed in user.update.after", { error });
          }
        },
      },
    },

    session: {
      create: {
        after: async (session) => {
          try {
            await incrementUsageMetric({ event: "auth_login_success" });
          } catch (error) {
            logger.warn("Failed to record auth_login_success metric", {
              sessionId: session.id,
              error,
            });
          }

          // Read while still inside the request's async context.
          const context = authRequestContext.getStore();
          const provider = context?.provider || "unknown";
          const ip = context?.ip || session.ipAddress || "Unknown";
          const device = context?.userAgent || session.userAgent || "Unknown";

          sendInBackground(
            "login alert",
            async () => {
              const user = await prisma.user.findUnique({
                where: { id: session.userId },
                select: { email: true, createdAt: true },
              });

              // Skip alert on fresh signup (first 15 seconds) to avoid spamming
              if (!user?.email || Date.now() - user.createdAt.getTime() <= 15000) return;

              await sendLoginAlertEmail(user.email, {
                ip,
                device,
                timestamp: session.createdAt.toISOString(),
                provider,
              });
            },
            { sessionId: session.id },
          );
        },
      },

      delete: {
        after: async (session) => {
          try {
            await revokeSessionCaches([session.token]);
          } catch (error) {
            // Never block the delete, but a stale session cache must be visible (V-165).
            logger.warn("Session cache invalidation failed in session.delete.after", { error });
          }
        },
      },
    },
  },
});

export const authNodeHandler = toNodeHandler(auth);

export async function getSessionFromRequestHeaders(headers: Headers) {
  return auth.api.getSession({ headers });
}

export function convertNodeHeadersToWebHeaders(rawHeaders: IncomingHttpHeaders) {
  return fromNodeHeaders(rawHeaders);
}
