import fs from "node:fs";
import path from "node:path";

const repo = "https://github.com/VeriWorkly/veriworkly";
const app = "apps/docs-platform";
const specDir = path.join(process.cwd(), "specs", "paths");

/** Which `specs/paths/*.yaml` file defines each operationId. */
const specFileByOperation = new Map(
  fs
    .readdirSync(specDir)
    .filter((file) => file.endsWith(".yaml"))
    .flatMap((file) =>
      [...fs.readFileSync(path.join(specDir, file), "utf8").matchAll(/operationId:\s*(\S+)/g)].map(
        (match) => [match[1], file] as const,
      ),
    ),
);

/** Edit link for a hand-written page under `content/<tree>/`. */
export function contentEditUrl(tree: "docs" | "api-reference" | "ats-engine", pagePath: string) {
  return `${repo}/edit/master/${app}/content/${tree}/${pagePath}`;
}

/**
 * Operation pages are generated from the spec, so their edit link opens the spec file that
 * defines the operation; overview pages are hand-written and link to themselves.
 */
export function apiEditUrl(pagePath: string) {
  const operationId = path.basename(pagePath, ".mdx");
  const specFile = specFileByOperation.get(operationId);

  return specFile
    ? `${repo}/edit/master/${app}/specs/paths/${specFile}`
    : contentEditUrl("api-reference", pagePath);
}
