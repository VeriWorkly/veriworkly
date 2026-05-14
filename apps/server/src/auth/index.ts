import { betterAuth } from "better-auth";
import { IncomingHttpHeaders } from "node:http";

import { emailOTP } from "better-auth/plugins";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";

import { config } from "#config";

import { prisma } from "#utils/prisma";
import { sendAuthOtpEmail } from "#auth/mailer";

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
});

export const authNodeHandler = toNodeHandler(auth);

export async function getSessionFromRequestHeaders(headers: Headers) {
  return auth.api.getSession({ headers });
}

export function convertNodeHeadersToWebHeaders(rawHeaders: IncomingHttpHeaders) {
  return fromNodeHeaders(rawHeaders);
}
