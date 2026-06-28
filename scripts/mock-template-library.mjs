import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const projectRoot = process.cwd();
const templateLibPath = path.join(projectRoot, "apps", "portfolio", "template-library");
const registryFilePath = path.join(templateLibPath, "registry.ts");

if (fs.existsSync(registryFilePath)) {
  console.log("Template library already exists. Skipping mock setup.");
  process.exit(0);
}

console.log("Template library not found. Setting up mock templates for CI build...");

// Create directories
fs.mkdirSync(templateLibPath, { recursive: true });
fs.mkdirSync(path.join(templateLibPath, "atelier"), { recursive: true });
fs.mkdirSync(path.join(templateLibPath, "signal"), { recursive: true });

// Types
const typesContent = `export interface PortfolioSection {
  id: string;
  type: string;
  title: string;
  visible: boolean;
  items: Array<Record<string, unknown>>;
}

export interface PortfolioProject {
  schemaVersion: 1;
  templateId: string;
  identity: {
    name: string;
    headline: string;
    bio: string;
    location: string;
    email: string;
    availability: string;
    avatar: { id: string; url: string } | null;
  };
  seo: { title: string; description: string; socialImage: { id: string; url: string } | null };
  socialLinks: Array<{ id: string; label: string; url: string }>;
  sections: PortfolioSection[];
}

export function visibleSection(project: PortfolioProject, type: string) {
  return project.sections.find((section) => section.type === type && section.visible);
}

export function itemText(item: Record<string, unknown>, key: string, fallback = "") {
  return typeof item[key] === "string" ? item[key] : fallback;
}

export function itemTags(item: Record<string, unknown>) {
  return Array.isArray(item.tags)
    ? item.tags.filter((tag): tag is string => typeof tag === "string")
    : [];
}

export function itemAssetUrl(item: Record<string, unknown>, key: string) {
  const value = item[key];
  return value && typeof value === "object" && typeof (value as { url?: unknown }).url === "string"
    ? (value as { url: string }).url
    : "";
}

export function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}
`;

fs.writeFileSync(path.join(templateLibPath, "types.ts"), typesContent);

// Registry
const registryContent = `import type { ComponentType } from "react";
import type { PortfolioProject } from "./types";

export type TemplateComponent = ComponentType<{ project: PortfolioProject }>;

export const templateLoaders = {
  atelier: () => import("./atelier/AtelierTemplate"),
  signal: () => import("./signal/SignalTemplate"),
} satisfies Record<string, () => Promise<{ default: TemplateComponent }>>;

export type PrivateTemplateId = keyof typeof templateLoaders;

export function hasPrivateTemplate(id: string): id is PrivateTemplateId {
  return id in templateLoaders;
}
`;

fs.writeFileSync(registryFilePath, registryContent);

// AtelierTemplate
const atelierContent = `import React from "react";
import { safeExternalUrl, itemText, type PortfolioProject } from "../types";
import "./styles.css";

export default function AtelierTemplate({ project }: { project: PortfolioProject }) {
  const visibleSections = project.sections.filter((s) => s.visible);
  return (
    <div>
      <div>Mock Atelier Template: {project.identity.name}</div>
      {visibleSections.map((section) => {
        if (section.type === "projects") {
          return (
            <div key={section.id} data-section={section.type}>
              <h2>{section.title}</h2>
              {section.items.map((item, idx) => (
                <div key={idx}>
                  <h3>{itemText(item, "title") || itemText(item, "name")}</h3>
                  <p>{itemText(item, "summary")}</p>
                </div>
              ))}
            </div>
          );
        }
        if (section.type === "contact") {
          return (
            <div key={section.id} data-section={section.type}>
              <h2>{section.title}</h2>
              {project.socialLinks.map((link) => {
                const href = safeExternalUrl(link.url);
                return href && link.label.trim() ? (
                  <a key={link.id} href={href}>
                    {link.label}
                  </a>
                ) : null;
              })}
            </div>
          );
        }
        return (
          <div key={section.id} data-section={section.type}>
            <h2>{section.title}</h2>
            {section.type === "services" && <div className="atelier-service-list" />}
            {section.type === "testimonials" && <div className="atelier-testimonial-list" />}
            {section.items.map((item, idx) => (
              <div key={idx}>
                <h3>{itemText(item, "title") || itemText(item, "name")}</h3>
                <p>{itemText(item, "summary")}</p>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
`;

fs.writeFileSync(path.join(templateLibPath, "atelier", "AtelierTemplate.tsx"), atelierContent);
fs.writeFileSync(path.join(templateLibPath, "atelier", "styles.css"), "/* Mock styles */");

// SignalTemplate
const signalContent = `import React from "react";
import { safeExternalUrl, itemText, type PortfolioProject } from "../types";
import "./styles.css";

export default function SignalTemplate({ project }: { project: PortfolioProject }) {
  const visibleSections = project.sections.filter((s) => s.visible);
  return (
    <div>
      <div>Mock Signal Template: {project.identity.name}</div>
      {visibleSections.map((section) => {
        if (section.type === "projects") {
          return (
            <div key={section.id} data-section={section.type}>
              <h2>{section.title}</h2>
              {section.items.map((item, idx) => (
                <div key={idx}>
                  <h3>{itemText(item, "title") || itemText(item, "name")}</h3>
                  <p>{itemText(item, "summary")}</p>
                </div>
              ))}
            </div>
          );
        }
        if (section.type === "contact") {
          return (
            <div key={section.id} data-section={section.type}>
              <h2>{section.title}</h2>
              {project.socialLinks.map((link) => {
                const href = safeExternalUrl(link.url);
                return href && link.label.trim() ? (
                  <a key={link.id} href={href}>
                    {link.label}
                  </a>
                ) : null;
              })}
            </div>
          );
        }
        return (
          <div key={section.id} data-section={section.type}>
            <h2>{section.title}</h2>
            {section.type === "experience" && <div className="signal-timeline" />}
            {section.type === "testimonials" && <div className="signal-quotes-grid" />}
            {section.items.map((item, idx) => (
              <div key={idx}>
                <h3>{itemText(item, "title") || itemText(item, "name")}</h3>
                <p>{itemText(item, "summary")}</p>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
`;

fs.writeFileSync(path.join(templateLibPath, "signal", "SignalTemplate.tsx"), signalContent);
fs.writeFileSync(path.join(templateLibPath, "signal", "styles.css"), "/* Mock styles */");

// SignalDesign
const signalDesignContent = `export const design = {
  positioning: "Mock signal positioning",
  fonts: "Mock signal fonts",
  motion: "Mock signal motion",
  palette: "Mock signal palette",
  layout: "Mock signal layout",
  componentLanguage: "Mock signal componentLanguage",
  contentModel: ["Mock signal contentModel"],
  colorScheme: [{ name: "Mock", value: "#000", className: "bg-black" }],
  bestFor: ["Mock signal bestFor"],
  designNotes: ["Mock signal designNotes"],
};
`;

fs.writeFileSync(path.join(templateLibPath, "signal", "design.ts"), signalDesignContent);

console.log("Mock templates set up successfully.");

try {
  console.log("Formatting mocked files...");
  execSync("npx prettier --write apps/portfolio/template-library", { stdio: "inherit" });
  console.log("Formatting completed.");
} catch (err) {
  console.error("Failed to run prettier on mocked files:", err.message);
}
