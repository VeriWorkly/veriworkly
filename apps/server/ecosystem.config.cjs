/**
 * pm2 apps for the API (V-373): two copies on two ports behind one nginx `upstream`, restarted
 * one after the other by `scripts/rolling-restart.sh`, so a deploy never leaves nobody listening.
 *
 * - Each copy runs one throng primary with `WEB_CONCURRENCY` workers (one here).
 * - `DB_POOL_MAX_TOTAL` is each copy's own Postgres budget (`src/lib/prisma.ts` divides it by
 *   that copy's workers). The two copies together must not exceed what the single copy had: it
 *   ran 2 workers on the production default of 80, so each copy gets 40. If `.env` sets a
 *   different total, set half of it here; these values win over `.env`.
 *   `tests/lifecycle/deploy-config.test.ts` checks the sum.
 * - `exec_mode: "fork"`: the server forks its own workers; do not use pm2 cluster mode.
 * - `kill_timeout` must stay above the drain (`SHUTDOWN_TIMINGS` in `src/lib/shutdown.ts`).
 * - Everything else comes from `apps/server/.env`, as before.
 *
 * Apply with `pm2 delete veriworkly-server; pm2 start ecosystem.config.cjs` (a plain restart keeps
 * the old settings), then `pm2 save`.
 */
const shared = {
  script: "dist/index.js",
  cwd: __dirname,
  exec_mode: "fork",
  instances: 1,
  kill_timeout: 40000,
};

const copy = (name, port) => ({
  ...shared,
  name,
  env: { PORT: port, WEB_CONCURRENCY: "1", DB_POOL_MAX_TOTAL: "40" },
});

module.exports = {
  apps: [copy("veriworkly-server-a", "7042"), copy("veriworkly-server-b", "7043")],
};
