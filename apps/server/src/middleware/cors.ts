import cors from "cors";

import { config } from "#config";

import { ApiError } from "#utils/errors";

export const corsMiddleware = cors((req, callback) => {
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;

  const trustedPortfolioOrigin = Boolean(
    origin &&
    (/^https:\/\/[a-z0-9-]+\.veriworkly\.com$/i.test(origin) ||
      /^http:\/\/[a-z0-9-]+\.localhost:3004$/i.test(origin)),
  );

  callback(null, {
    origin: (requestOrigin, originCallback) => {
      if (!requestOrigin) {
        originCallback(null, true);
        return;
      }

      if (config.allowedOrigins.includes(requestOrigin) || trustedPortfolioOrigin) {
        originCallback(null, true);
      } else {
        originCallback(new ApiError(403, "Not allowed by CORS"));
      }
    },
    credentials: !trustedPortfolioOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-KEY"],
    maxAge: 86400,
  });
});
