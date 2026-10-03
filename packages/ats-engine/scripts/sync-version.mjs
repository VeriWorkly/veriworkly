// After `changeset version`: copy package.json's version into ENGINE_VERSION, which every report
// is stamped with (a test holds the two equal).
import { readFileSync, writeFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const file = "src/version.ts";
const source = readFileSync(file, "utf8");
const updated = source.replace(/ENGINE_VERSION = "[^"]*"/, `ENGINE_VERSION = "${version}"`);
if (updated === source && !source.includes(`"${version}"`))
  throw new Error("ENGINE_VERSION not found");
writeFileSync(file, updated);
console.log(`ENGINE_VERSION = ${version}`);
