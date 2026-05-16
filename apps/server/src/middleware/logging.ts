import { Request, Response, NextFunction } from "express";

import { config } from "#config";

import { prisma } from "#utils/prisma";
import { logger } from "#utils/logger";
import { getRequestIpDetails } from "#utils/requestIp";

export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = performance.now();

  const ip = getRequestIpDetails(req).resolvedIp;

  const userAgent = req.headers["user-agent"];

  res.on("finish", () => {
    if (res.statusCode >= 400) {
      const duration = Math.round(performance.now() - startTime);

      logger.error(`[ERROR] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);

      const shouldPersistAuditLog =
        config.nodeEnv === "production" &&
        // Avoid high-volume expected failures (auth probes, missing routes, rate limit noise).
        ![401, 404, 429].includes(res.statusCode);

      if (shouldPersistAuditLog) {
        prisma.auditLog
          .create({
            data: {
              method: req.method,
              path: req.originalUrl,
              status: res.statusCode,
              ip,
              userAgent,
              error: res.locals.errorMessage || null,
            },
          })
          .catch((err) => logger.error("Audit log DB write failed", err));
      }
    }
  });

  next();
}
