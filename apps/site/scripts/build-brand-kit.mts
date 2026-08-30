/**
 * Builds public/brand/veriworkly-brand-kit.zip.
 *
 * The archive is generated from apps/site/config/brand.ts - the same file
 * /brand-kit and /style-guide render from - so the palette in the download can
 * never drift from the palette on the page. That drift is exactly what this
 * script exists to prevent: the previous kit was assembled by hand and its
 * README had already fallen out of step with the site.
 *
 * Run:  npm run build:brand-kit  (from apps/site)
 *
 * Deliberately dependency-free. The ZIP writer below is a minimal but spec-correct
 * implementation, which is cheaper than owning another supply-chain dependency for
 * one build artefact.
 */

import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { deflateRawSync } from "node:zlib";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

import {
  logoRules,
  typeScale,
  fontStack,
  logoAssets,
  pressFacts,
  brandColors,
} from "../config/brand.js";

const HERE = dirname(fileURLToPath(import.meta.url));

const PUBLIC_DIR = join(HERE, "..", "public");
const LOGO_DIR = join(PUBLIC_DIR, "brand", "logo");

const OUT = join(PUBLIC_DIR, "brand", "veriworkly-brand-kit.zip");

/* ------------------------------------------------------------- zip writer ---- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let n = 0; n < 256; n++) {
    let c = n;

    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;

    table[n] = c >>> 0;
  }

  return table;
})();

const crc32 = (buf: Buffer) => {
  let c = 0xffffffff;

  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);

  return (c ^ 0xffffffff) >>> 0;
};

interface Entry {
  path: string;
  data: Buffer;
}

/**
 * Timestamps are pinned so the archive is byte-identical across runs - a kit that
 * changes hash on every build produces noisy diffs and defeats caching.
 */

const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

const buildZip = (entries: Entry[]) => {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];

  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.path, "utf8");

    const compressed = deflateRawSync(entry.data, { level: 9 });
    const crc = crc32(entry.data);

    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // extra length
    name.copy(local, 30);

    locals.push(local, compressed);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // comment
    central.writeUInt16LE(0, 34); // disk
    central.writeUInt16LE(0, 36); // internal attrs
    central.writeUInt32LE(0, 38); // external attrs
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);

    centrals.push(central);
    offset += local.length + compressed.length;
  }

  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, ...centrals, end]);
};

/* ---------------------------------------------------------------- content ---- */

const pad = (value: string, width: number) => value.padEnd(width);

const paletteTable = () => {
  const nameW = Math.max(...brandColors.map((c) => c.name.length)) + 2;
  const varW = Math.max(...brandColors.map((c) => c.variable.length)) + 2;
  const lightW = Math.max(...brandColors.map((c) => c.light.length)) + 2;

  const head = `${pad("Token", nameW)}${pad("Variable", varW)}${pad("Light", lightW)}Dark`;
  const rule = "-".repeat(head.length);

  const rows = brandColors.map(
    (c) => `${pad(c.name, nameW)}${pad(c.variable, varW)}${pad(c.light, lightW)}${c.dark}`,
  );

  return [head, rule, ...rows].join("\n");
};

const typeTable = () =>
  typeScale
    .map(
      (step) =>
        `${pad(step.label, 14)}${pad(step.sizes, 18)}weight ${pad(step.weight, 6)}tracking ${step.tracking}\n` +
        `${" ".repeat(14)}${step.usage}`,
    )
    .join("\n\n");

const readme = () => `VeriWorkly Brand Kit
====================

Generated from the live design system. Do not hand-edit - run
"npm run build:brand-kit" from apps/site instead, so this file and the published
pages can never disagree.

Interactive versions, including live component examples and copyable values:

  https://veriworkly.com/brand-kit
  https://veriworkly.com/style-guide


Logo
----
${logoAssets.map((a) => `${pad(`logo/${a.file}`, 38)}${pad(`${a.size} ${a.format}`, 14)}${a.usage}`).join("\n")}

Official high-resolution PNG image assets for all digital surfaces and media embeds.


Usage
-----
- Clear space on every side equals ${logoRules.clearSpaceRatio * 100}% of the mark's width.
- The mark maintains clarity across all standard digital resolutions.
- Do not recolour, distort, rotate, or add effects (shadows, gradients, outlines).
- Do not place the mark on a ground that breaks its contrast.
- Write "${pressFacts.spelling}" as one word, capital V and W.
  Not ${pressFacts.misspellings.map((m) => `"${m}"`).join(", ")}.


Colour
------
Every token carries two values. Use the light column on pale grounds and the dark
column on near-black. Alpha values are given as rgba() because they are meant to
composite over whatever is behind them.

${paletteTable()}

Machine-readable: palette.json


Typography
----------
${fontStack.sans.family} (var(${fontStack.sans.variable})) - ${fontStack.sans.usage}
${fontStack.mono.family} (var(${fontStack.mono.variable})) - ${fontStack.mono.usage}

Both are released by Vercel under the SIL Open Font License 1.1 and are available
from Google Fonts. Nothing needs to be licensed to typeset the VeriWorkly name.

${typeTable()}


Press
-----
Created by     ${pressFacts.creator}
Website        ${pressFacts.website}
Licence        ${pressFacts.licence} - ${pressFacts.model}
Repository     ${pressFacts.repository}
${pressFacts.socials.map((s) => `${pad(s.label, 15)}${s.handle}`).join("\n")}

Questions about press or brand usage: ${pressFacts.email}
`;

const palette = () => ({
  $schema: "https://veriworkly.com/brand-kit",
  name: "VeriWorkly",
  description:
    "Theme tokens for the VeriWorkly design system. Mirrors packages/ui/src/styles/themes.css.",
  source: "https://veriworkly.com/style-guide#colors",
  modes: ["light", "dark"],
  tokens: Object.fromEntries(
    brandColors.map((c) => [
      c.variable,
      { name: c.name, light: c.light, dark: c.dark, description: c.description },
    ]),
  ),
});

/* ------------------------------------------------------------------- build --- */

const entries: Entry[] = [];

const wanted = new Set(logoAssets.map((a) => a.file));
const present = readdirSync(LOGO_DIR);

const missing = [...wanted].filter((file) => !present.includes(file));

if (missing.length) {
  console.error(`Missing logo assets referenced by config/brand.ts:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}

for (const file of present.filter((f) => wanted.has(f)).sort()) {
  entries.push({ path: `logo/${file}`, data: readFileSync(join(LOGO_DIR, file)) });
}

entries.push({
  path: "palette.json",
  data: Buffer.from(JSON.stringify(palette(), null, 2) + "\n", "utf8"),
});

entries.push({ path: "README.txt", data: Buffer.from(readme(), "utf8") });

const zip = buildZip(entries);
writeFileSync(OUT, zip);

console.log(
  `veriworkly-brand-kit.zip - ${entries.length} files, ${(zip.length / 1024).toFixed(1)} KB`,
);

for (const entry of entries) {
  console.log(`  ${pad(entry.path, 40)}${(entry.data.length / 1024).toFixed(1)} KB`);
}
