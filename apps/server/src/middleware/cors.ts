import cors from "cors";

import { config } from "#config";

import { ApiError } from "#utils/errors";

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (config.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new ApiError(403, "Not allowed by CORS"));
    }
  },

  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-KEY"],
  maxAge: 86400,
});
