import { fitDescription, fitTitle } from "@/utils/metadata";

/**
 * Titles and descriptions for /compare/[tool]. "VeriWorkly vs X" already carries the brand, so
 * the suffix is the page's subject rather than the brand a second time. The description used
 * to append the competitor's positioning sentence, which pushed every page past 260 characters.
 */
export const compareTitle = (competitorName: string) =>
  fitTitle(`VeriWorkly vs ${competitorName}`, "Pricing, ATS & Features");

export const compareDescription = (competitorName: string) =>
  fitDescription(
    `Honest side-by-side comparison of VeriWorkly vs ${competitorName}: ATS keyword scoring, download limits, pricing models and account requirements.`,
  );
