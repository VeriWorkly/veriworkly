import "server-only";

import { notFound } from "next/navigation";
import type { PortfolioContent } from "@/lib/portfolio";
import { hasPrivateTemplate, templateLoaders } from "@/template-library/registry";

export async function renderTemplate(project: PortfolioContent) {
  if (!hasPrivateTemplate(project.templateId)) notFound();
  const { default: Template } = await templateLoaders[project.templateId]();
  return <Template project={project} />;
}
