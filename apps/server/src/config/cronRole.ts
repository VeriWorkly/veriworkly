/**
 * CRON_ROLE (read straight from the environment, not via config.ts):
 *   - `all` (default, also when unset or empty): every worker schedules every background job
 *     (`jobs/scheduledJobs.ts`). Each job takes its own Redis lock (`github:sync:lock`,
 *     `changelog:release-sync:lock`, `views:flush:lock`, `usage:flush:lock`,
 *     `portfolio:suspension:lock` for the portfolio-access sweep and its upload cleanup,
 *     `credits:sweep:lock`, `credits:annual-monthly:lock`, `retention:lock`), so one worker runs
 *     each tick and the rest skip at debug level. No single worker is special, so losing a
 *     worker (throng revives it with a new id) no longer stops the jobs (V-053/V-086).
 *   - `none`: this process schedules no jobs. Use it for API-only replicas when another
 *     deployment runs with `all`.
 * Case and surrounding whitespace are ignored. Any other value throws, so the boot fails rather
 * than silently enabling or disabling billing enforcement.
 */
type CronRole = "all" | "none";

export function parseCronRole(raw: string | undefined): CronRole {
  const value = (raw ?? "").trim().toLowerCase();

  if (value === "" || value === "all") return "all";
  if (value === "none") return "none";

  throw new Error(`Invalid CRON_ROLE "${raw}": expected "all" or "none"`);
}
