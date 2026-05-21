import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { templateRegistry } from "@/templates";

const repoRoot = join(__dirname, "../../../..");
const studioPublicDir = join(repoRoot, "apps/studio/public");
const docsContentDir = join(repoRoot, "apps/docs-platform/content");

function getPngDimensions(filePath: string) {
  const bytes = readFileSync(filePath);

  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function readDocsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const filePath = join(dir, entry.name);

    if (entry.isDirectory()) return readDocsFiles(filePath);
    if (!entry.isFile() || !/\.(md|mdx)$/.test(entry.name)) return [];

    return readFileSync(filePath, "utf8");
  });
}

describe("template preview assets", () => {
  it("keeps registered Studio preview images as full-page portrait PNGs", () => {
    for (const template of templateRegistry) {
      const previewPath = join(studioPublicDir, template.previewImage);

      expect(existsSync(previewPath), `${template.id} preview exists`).toBe(true);

      const { width, height } = getPngDimensions(previewPath);
      expect(height, `${template.id} preview should be portrait`).toBeGreaterThan(width);
      expect(height / width, `${template.id} preview should show a full page`).toBeGreaterThan(
        1.25,
      );
    }
  });

  it("does not expose the legacy compact-ats template name in public docs", () => {
    const publicDocs = [
      readFileSync(join(repoRoot, "README.md"), "utf8"),
      ...readDocsFiles(docsContentDir),
    ].join("\n");

    expect(publicDocs).not.toMatch(/compact-ats|Compact ATS/);
  });
});
