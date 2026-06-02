import type { PortfolioContent } from "@/lib/portfolio";
import { renderTemplate } from "@/templates/runtime/registry";

/**
 * Compatibility wrapper for routes or integrations that render a portfolio.
 * Template implementations live in the server-only runtime registry.
 */
export async function PortfolioSite({ project }: { project: PortfolioContent }) {
  return await renderTemplate(project);
}
