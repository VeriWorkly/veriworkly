import { describe, expect, it } from "vitest";

import {
  mainNav,
  supportNav,
  bottomNav,
  NavGroup,
  StudioNavLink,
} from "@/components/dashboard/sidebar/StudioNavigation";

describe("dashboard navigation contracts", () => {
  it("exports navigation components and configs", () => {
    expect(NavGroup).toBeDefined();
    expect(StudioNavLink).toBeDefined();
    expect(mainNav).toBeDefined();
    expect(supportNav).toBeDefined();
    expect(bottomNav).toBeDefined();
  });

  it("defines expected main navigation items", () => {
    const labels = mainNav.map((item) => item.label);
    expect(labels).toContain("Overview");
    expect(labels).toContain("Documents");
    expect(labels).toContain("ATS checker");
    expect(labels).toContain("Templates");
    expect(labels).toContain("Portfolio");
  });

  it("correctly matches pathname routes for internal navigation", () => {
    const overview = mainNav.find((item) => item.label === "Overview")!;
    expect(overview.match("/")).toBe(true);
    expect(overview.match("/documents")).toBe(false);

    const documents = mainNav.find((item) => item.label === "Documents")!;
    expect(documents.match("/documents")).toBe(true);
    expect(documents.match("/documents/resume-1")).toBe(true);
    expect(documents.match("/ats")).toBe(false);

    const ats = mainNav.find((item) => item.label === "ATS checker")!;
    expect(ats.match("/ats")).toBe(true);
    expect(ats.match("/ats/check")).toBe(true);
  });

  it("defines expected resource and utility items", () => {
    const resourceLabels = supportNav.map((item) => item.label);
    expect(resourceLabels).toContain("Docs");
    expect(resourceLabels).toContain("Blog");

    const utilityLabels = bottomNav.map((item) => item.label);
    expect(utilityLabels).toContain("FAQ");
    expect(utilityLabels).toContain("API keys");
  });
});
