import { Request, Response, NextFunction } from "express";

import { createErrorResponse } from "#lib/errors";

// Gates an entire router behind a config flag. Used for growth programs (affiliate, campus
// ambassador) that are still being finished and should not be reachable in production until
// they're explicitly turned on.
export function requireFeatureEnabled(enabled: boolean, featureName: string) {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (!enabled) {
      // Read by the request logger: an expected 503, not an outage (no error line, no audit row).
      res.locals.programDisabled = true;
      // The code lets a client tell "switched off" from an outage without matching the wording.
      res.status(503).json(
        createErrorResponse(503, `${featureName} is not available yet. Check back soon.`, {
          code: "PROGRAM_DISABLED",
        }),
      );
      return;
    }
    next();
  };
}
