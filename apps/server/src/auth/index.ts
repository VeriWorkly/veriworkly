import { betterAuth } from "better-auth";
import { IncomingHttpHeaders } from "node:http";

import { emailOTP } from "better-auth/plugins";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";

import { config } from "#config";

import { prisma } from "#utils/prisma";
import { getRedis } from "#utils/redis";
import { sendAuthOtpEmail } from "#auth/mailer";

import { createAuthMiddleware } from "better-auth/api";
import { invalidateSessionCache, invalidateCacheByToken } from "#utils/authCache";

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
      delete: {
        before: async (user) => {
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
