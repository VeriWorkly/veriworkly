import { betterAuth } from "better-auth";
import { IncomingHttpHeaders } from "node:http";

import { emailOTP } from "better-auth/plugins";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";

import { config } from "#config";

import { prisma } from "#utils/prisma";
import { sendAuthOtpEmail } from "#auth/mailer";

import { createAuthMiddleware } from "better-auth/api";
import { invalidateSessionCache, invalidateCacheByToken } from "#utils/authCache";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  appName: "Veriworkly",

  secret: config.auth.secret,
  baseURL: config.auth.baseUrl,

  basePath: "/api/v1/auth",
  trustedOrigins: config.allowedOrigins,

  advanced: {
    trustedProxyHeaders: true,
    ipAddress: {
      ipAddressHeaders: config.auth.ipAddressHeaders,
    },
    cookiePrefix: "veriworkly-auth",
    crossSubDomainCookies: {
      enabled: !!config.auth.cookieDomain,
      domain: config.auth.cookieDomain,
    },
  },

  session: {
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
        if (cookieHeader) {
          await invalidateSessionCache(cookieHeader);
        }
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
