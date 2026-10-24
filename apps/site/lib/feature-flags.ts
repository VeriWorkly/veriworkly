import "server-only";

export function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value.trim() === "") return fallback;

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

const isProductionRuntime = process.env.NODE_ENV === "production";

// Mirrors `apps/studio/lib/feature-flags.ts` and the server-side `requireFeatureEnabled`
// gate on the growth routers. Without a check here the marketing site happily linked to
// an apply page whose backend answers 503, which the page then misread as "logged out".

export function isAffiliateProgramEnabled() {
  return parseBoolean(process.env.AFFILIATE_PROGRAM_ENABLED, !isProductionRuntime);
}

export function isAmbassadorProgramEnabled() {
  return parseBoolean(process.env.AMBASSADOR_PROGRAM_ENABLED, !isProductionRuntime);
}
