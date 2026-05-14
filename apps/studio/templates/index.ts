/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { CleanProfessionalWeb } from "./clean-professional/web";
import { CompactAtsWeb } from "./compact-ats/web";

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  previewImage?: string;
  tags: string[];
  renderWeb: (props: any) => React.ReactNode;
}

// Template registry metadata - lazy loads components on demand
// Templates are NOT loaded by default to optimize performance
export const templateRegistry: TemplateDefinition[] = [
  {
    id: "clean-professional",
    name: "Executive Clarity",
    description:
      "A polished single-column resume with refined spacing, strong section rhythm, and ATS-safe structure.",
    accentColor: "#0ea5e9",
    previewImage: "/templates/executive-clarity.png",
    tags: ["One column", "ATS-friendly", "Modern", "Professional"],
    renderWeb: (props: any) => {
      return React.createElement(CleanProfessionalWeb, props);
    },
  },
  {
    id: "compact-ats",
    name: "Precision ATS",
    description:
      "A dense, recruiter-friendly layout for longer resumes that still exports as a real matching PDF.",
    accentColor: "#10b981",
    previewImage: "/templates/compact-ats.png",
    tags: ["One column", "ATS-friendly", "Compact", "Simple"],
    renderWeb: (props: any) => {
      return React.createElement(CompactAtsWeb, props);
    },
  },
];

export const loadTemplateComponentById = (id: string | undefined): React.ComponentType<any> => {
  const match = templateRegistry.find((t) => t.id === id);
  const template = match || templateRegistry[0];

  return (props: any) => {
    return template.renderWeb(props);
  };
};

export const getTemplateById = (id: string | undefined): TemplateDefinition | undefined => {
  return templateRegistry.find((t) => t.id === id);
};
