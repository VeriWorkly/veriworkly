import { betterAuth } from "better-auth";
import { IncomingHttpHeaders } from "node:http";
import { AsyncLocalStorage } from "node:async_hooks";

import { createAuthMiddleware } from "better-auth/api";
import { emailOTP } from "better-auth/plugins/email-otp";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";

import { config } from "#config";

import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";
import { invalidateSessionCache, invalidateCacheByToken } from "#utils/authCache";

import {
  sendAuthOtpEmail,
  sendWelcomeEmail,
  sendLoginAlertEmail,
  sendAccountDeletedEmail,
} from "#services/mail";

export const authRequestContext = new AsyncLocalStorage<{
  ip: string;
  userAgent: string;
  provider?: string;
}>();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  secondaryStorage: {
    get: async (key) => {
      try {
        const redis = getRedis();
        return (await redis.get(key)) || null;
      } catch (error) {
        console.error("better-auth secondaryStorage get error:", error);
        return null;
      }
    },

    set: async (key, value, ttl) => {
      try {
        const redis = getRedis();

        if (ttl) await redis.set(key, value, { EX: ttl });
        else await redis.set(key, value);
      } catch (error) {
        console.error("better-auth secondaryStorage set error:", error);
      }
    },

    delete: async (key) => {
      try {
        const redis = getRedis();
        await redis.del(key);
      } catch (error) {
        console.error("better-auth secondaryStorage delete error:", error);
      }
    },
  },

  appName: "Veriworkly",

  secret: config.auth.secret,
  baseURL: config.auth.baseUrl,

  basePath: "/api/v1/auth",
  trustedOrigins: config.allowedOrigins,

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
    useSecureCookies: config.nodeEnv === "production",
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
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github", "linkedin"],
    },
  },

  plugins: [
    emailOTP({
      expiresIn: config.auth.otpTtlSeconds,
      allowedAttempts: config.auth.otpAllowedAttempts,
      disableSignUp: false,

      sendVerificationOTP: async ({ email, otp, type }) => {
        await sendAuthOtpEmail({ email, otp, type });
      },
    }),
  ],

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const pathsToInvalidate = [
        "/sign-out",
        "/revoke-session",
        "/revoke-sessions",
        "/change-email",
        "/change-password",
        "/delete-user",
      ];

      const shouldInvalidate = pathsToInvalidate.some(
        (p) => ctx.path === p || ctx.path.startsWith(p + "/"),
      );

      if (shouldInvalidate) {
        const cookieHeader = ctx.headers?.get("cookie") || "";

        if (cookieHeader) await invalidateSessionCache(cookieHeader);
      }
    }),
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await sendWelcomeEmail(user.email, user.name || "there");
          } catch (error) {
            console.error("Failed to send welcome email for user:", user.email, error);
          }
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
          } catch {
            // Ignore database hook errors
          }
        },
      },

      delete: {
        before: async (user) => {
          try {
            await sendAccountDeletedEmail(user.email, user.name || "there");
          } catch (error) {
            console.error("Failed to send account deleted email for user:", user.email, error);
          }

          try {
            const sessions = await prisma.session.findMany({
              where: { userId: user.id },
              select: { token: true },
            });

            await Promise.all(sessions.map((session) => invalidateCacheByToken(session.token)));
          } catch {
            // Ignore database hook errors to avoid blocking deletes
          }
        },
      },
    },

    session: {
      create: {
        after: async (session) => {
          try {
            const context = authRequestContext.getStore();
            const provider = context?.provider || "unknown";
            const ip = context?.ip || session.ipAddress || "Unknown";
            const device = context?.userAgent || session.userAgent || "Unknown";

            const user = await prisma.user.findUnique({
              where: { id: session.userId },
              select: { email: true, createdAt: true },
            });

            if (user?.email) {
              const timeSinceCreated = Date.now() - user.createdAt.getTime();

              // Skip alert on fresh signup (first 15 seconds) to avoid spamming
              if (timeSinceCreated > 15000) {
                await sendLoginAlertEmail(user.email, {
                  ip,
                  device,
                  timestamp: session.createdAt.toISOString(),
                  provider,
                });
              }
            }
          } catch (error) {
            console.error("Failed to send login alert email for session:", session.id, error);
          }
        },
      },

      delete: {
        after: async (session) => {
          try {
            await invalidateCacheByToken(session.token);
          } catch {
            // Ignore database hook errors to avoid blocking deletes
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
