import { logger } from "#lib/logger";

/**
 * better-auth's own log lines go through the app logger (V-255): they can carry an email address
 * (a failed OTP send, an account lookup), and only the app logger masks those. Extra arguments
 * become the line's data, so they are masked too.
 */
export const betterAuthLogger = {
  level: "warn" as const,
  log(level: "debug" | "info" | "warn" | "error", message: string, ...args: unknown[]) {
    const data = args.length === 0 ? undefined : args.length === 1 ? args[0] : args;
    logger[level](`[better-auth] ${message}`, data);
  },
};
