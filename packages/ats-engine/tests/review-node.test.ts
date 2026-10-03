import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateRawSync } from "node:zlib";

import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { afterAll, describe, expect, it, vi } from "vitest";

import { main } from "../src/cli/main.js";
import { htmlText } from "../src/job/html.js";
import {
  measureDocx,
  readZipEntry,
  withinExpansionLimit,
  zipEntries,
  zipFiles,
} from "../src/node/docx.js";
import { measureVisibility, seeThroughImages, type Box } from "../src/node/hidden.js";
import { extractResume } from "../src/node/index.js";
import { buildDocxBody, documentXml } from "./fixtures/buildDocx.js";
import { buildPdf, stream } from "./fixtures/buildPdf.js";

/**
 * The `/node`, `/job` and CLI findings of the October review, each reproduced before its fix.
 */

const KEYWORDS = "Kubernetes Terraform Kafka GraphQL Rust";
const KEYWORD_CHARS = KEYWORDS.replace(/\s/g, "").length;
const visible = "0 g BT /F1 11 Tf 50 750 Td (Jane Doe, Senior Engineer at Acme Corporation) Tj ET";
const line = (y: number, value = KEYWORDS, size = 10) =>
  `BT /F1 ${size} Tf 50 ${y} Td (${value}) Tj ET`;

async function pdfLayout(content: string, resources = "", extra: string[] = []) {
  const { layout } = await extractResume(
    buildPdf(`${visible}\n${content}`, resources, "", extra),
    "pdf",
  );
  return layout!;
}

const whiteRun = (value: string, quote = '"') =>
  `<w:r><w:rPr><w:color w:val=${quote}FFFFFF${quote}/></w:rPr><w:t>${value}</w:t></w:r>`;
const BODY = "<w:p><w:r><w:t>Jane Doe Senior Engineer at Acme building things</w:t></w:r></w:p>";

describe("#1 the DOCX expansion budget cannot be stepped around", () => {
  // 70 MB of spaces deflates to about 70 KB: past the 64 MB budget.
  const bomb = buildDocxBody(BODY, true, [["word/styles.xml", Buffer.alloc(70 * 1024 * 1024, 32)]]);

  it("still refuses the bomb itself", () => {
    expect(withinExpansionLimit(bomb)).toBe(false);
  });

  it("refuses it behind a prepended byte", async () => {
    const prepended = Buffer.concat([Buffer.from([32]), bomb]);
    expect(withinExpansionLimit(prepended)).toBe(false);
    await expect(extractResume(prepended, "docx")).rejects.toThrow(/expands to more than/);
  });

  it("refuses it when the directory's end under-counts its entries", () => {
    const lowered = Buffer.from(bomb);
    lowered.writeUInt16LE(3, lowered.length - 22 + 8);
    lowered.writeUInt16LE(3, lowered.length - 22 + 10);
    expect(withinExpansionLimit(lowered)).toBe(false);
  });

  it("refuses an archive it cannot follow rather than handing it on", () => {
    const broken = Buffer.from(buildDocxBody(BODY));
    // The directory claims to run past the record that ends it: the archive cannot be walked.
    broken.writeUInt32LE(broken.length, broken.length - 22 + 16);
    expect(withinExpansionLimit(broken)).toBe(false);
  });

  it("reads a document behind prepended bytes, as JSZip does", () => {
    const docx = buildDocxBody(`${BODY}<w:p>${whiteRun(KEYWORDS)}</w:p>`);
    const prepended = Buffer.concat([Buffer.from("junk"), docx]);
    expect(withinExpansionLimit(prepended)).toBe(true);
    expect(measureDocx(prepended)?.hiddenChars).toBe(KEYWORD_CHARS);
  });

  // Some Open XML writers end even a small package with ZIP64 records; JSZip reads them.
  const zip64 = (docx: Buffer) => {
    const classic = docx.length - 22;
    const count = docx.readUInt16LE(classic + 10);
    const record = Buffer.alloc(56);
    record.writeUInt32LE(0x06064b50, 0);
    record.writeBigUInt64LE(44n, 4);
    record.writeUInt16LE(45, 12);
    record.writeUInt16LE(45, 14);
    record.writeBigUInt64LE(BigInt(count), 24);
    record.writeBigUInt64LE(BigInt(count), 32);
    record.writeBigUInt64LE(BigInt(docx.readUInt32LE(classic + 12)), 40);
    record.writeBigUInt64LE(BigInt(docx.readUInt32LE(classic + 16)), 48);
    const locator = Buffer.alloc(20);
    locator.writeUInt32LE(0x07064b50, 0);
    locator.writeBigUInt64LE(BigInt(classic), 8);
    locator.writeUInt32LE(1, 16);
    const end = Buffer.from(docx.subarray(classic));
    end.writeUInt16LE(0xffff, 8);
    end.writeUInt16LE(0xffff, 10);
    end.writeUInt32LE(0xffffffff, 12);
    end.writeUInt32LE(0xffffffff, 16);
    return Buffer.concat([docx.subarray(0, classic), record, locator, end]);
  };

  it("reads a package that ends with ZIP64 records", async () => {
    const docx = zip64(buildDocxBody(`${BODY}<w:p>${whiteRun(KEYWORDS)}</w:p>`));
    expect(measureDocx(docx)?.hiddenChars).toBe(KEYWORD_CHARS);
    expect((await extractResume(docx, "docx")).text).toContain("Jane Doe");
  });

  it("still refuses the bomb behind ZIP64 records", () => {
    expect(withinExpansionLimit(zip64(bomb))).toBe(false);
  });
});

describe("#2 form XObjects keep their own graphics state and matrix", () => {
  const form = (content: string, dictionary = "") =>
    stream(
      `/Type/XObject/Subtype/Form/BBox[0 0 612 2000]${dictionary}/Resources<</Font<</F1 4 0 R>>>>`,
      content,
    );
  const XOBJECT = "/XObject<</Fm1 7 0 R>>";

  it("does not leak a form's fill colour into the text after it", async () => {
    const layout = await pdfLayout(`/Fm1 Do\n${line(700)}`, XOBJECT, [
      form("1 1 1 rg 500 740 20 20 re f"),
    ]);
    expect(layout.hiddenTextChars).toBe(0);
  });

  it("places a form's content through its /Matrix", async () => {
    const layout = await pdfLayout("/Fm1 Do", XOBJECT, [
      form(line(1700), "/Matrix[1 0 0 1 0 -1000]"),
    ]);
    expect(layout.hiddenTextChars).toBe(0);
  });

  it("still finds white text inside a form", async () => {
    const layout = await pdfLayout("/Fm1 Do", XOBJECT, [form(`1 1 1 rg ${line(700)}`)]);
    expect(layout.hiddenTextChars).toBe(KEYWORD_CHARS);
  });
});

describe("#3 honest white-on-dark Word designs", () => {
  const cases: Array<[string, string]> = [
    [
      "a table shaded as a whole",
      `<w:tbl><w:tblPr><w:shd w:val="clear" w:color="auto" w:fill="1F3864"/></w:tblPr><w:tr><w:tc><w:p>${whiteRun(KEYWORDS)}</w:p></w:tc></w:tr></w:tbl>`,
    ],
    [
      "a solid shading pattern, which paints its colour",
      `<w:p><w:pPr><w:shd w:val="solid" w:color="1F3864" w:fill="FFFFFF"/></w:pPr>${whiteRun(KEYWORDS)}</w:p>`,
    ],
    [
      "a dark percentage pattern",
      `<w:p><w:pPr><w:shd w:val="pct80" w:color="000000" w:fill="FFFFFF"/></w:pPr>${whiteRun(KEYWORDS)}</w:p>`,
    ],
    [
      "a dark sidebar shape anchored behind the text",
      `<w:p><w:r><w:drawing><wp:anchor behindDoc="1"><wp:extent cx="2000000" cy="9000000"/><a:graphic><a:graphicData><wps:wsp><wps:spPr><a:solidFill><a:srgbClr val="1F3864"/></a:solidFill></wps:spPr></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p><w:p>${whiteRun(KEYWORDS)}</w:p>`,
    ],
  ];
  it.each(cases)("does not flag white text on %s", (_, body) => {
    expect(measureDocx(buildDocxBody(body))?.hiddenChars).toBe(0);
  });

  it.each([
    [
      "a solid pattern in white",
      `<w:p><w:pPr><w:shd w:val="solid" w:color="FFFFFF" w:fill="1F3864"/></w:pPr>${whiteRun(KEYWORDS)}</w:p>`,
    ],
    [
      "a light percentage pattern",
      `<w:p><w:pPr><w:shd w:val="pct5" w:color="000000" w:fill="FFFFFF"/></w:pPr>${whiteRun(KEYWORDS)}</w:p>`,
    ],
    [
      "a table shaded white",
      `<w:tbl><w:tblPr><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/></w:tblPr><w:tr><w:tc><w:p>${whiteRun(KEYWORDS)}</w:p></w:tc></w:tr></w:tbl>`,
    ],
  ])("still flags white text on %s", (_, body) => {
    expect(measureDocx(buildDocxBody(body))?.hiddenChars).toBe(KEYWORD_CHARS);
  });
});

describe("#4 PDF text squashed, stencilled over, or outlined", () => {
  const STENCIL = (x: number, y: number, w: number, h: number) =>
    `q ${w} 0 0 ${h} ${x} ${y} cm BI /IM true /W 1 /H 1 /BPC 1 ID \u0000 EI Q`;

  it.each([
    ["squashed by 1% horizontal scaling", `BT /F1 10 Tf 1 Tz 50 700 Td (${KEYWORDS}) Tj ET`],
    ["squashed by its matrix", `q 0.001 0 0 1 50 700 cm ${line(0)} Q`],
    ["covered by a white stencil mask", `${line(700)}\n1 1 1 rg ${STENCIL(40, 690, 400, 30)}`],
    ["outlined in white", `0 g 1 1 1 RG 1 Tr ${line(700)} 0 Tr`],
    [
      "squashed to nothing by 0% horizontal scaling",
      `BT /F1 10 Tf 0 Tz 50 700 Td (${KEYWORDS}) Tj ET`,
    ],
  ])("finds text %s", async (_, content) => {
    expect((await pdfLayout(content)).hiddenTextChars).toBe(KEYWORD_CHARS);
  });

  it.each([
    ["condensed to 80%", `BT /F1 10 Tf 80 Tz 50 700 Td (${KEYWORDS}) Tj ET 100 Tz`],
    ["in a mirrored 10pt font", `BT /F1 -10 Tf 300 700 Td (${KEYWORDS}) Tj ET`],
    [
      "white on a dark stencil banner",
      `0.1 0.1 0.3 rg ${STENCIL(40, 690, 400, 30)} 1 1 1 rg ${line(700)}`,
    ],
    ["outlined in black with a white fill", `1 1 1 rg 0 0 0 RG 1 Tr ${line(700)} 0 Tr 0 g`],
    ["filled and stroked, white fill, black stroke", `1 1 1 rg 0 G 2 Tr ${line(700)} 0 Tr 0 g`],
  ])("does not flag text %s", async (_, content) => {
    expect((await pdfLayout(content)).hiddenTextChars).toBe(0);
  });
});

describe("#5 a crowded page cannot hold the visibility replay", () => {
  const ops = OPS as unknown as Record<string, number>;

  /** `count` 1pt squares and `count` one-glyph runs, all in one cell of the index. */
  function crowdedCell(count: number) {
    const fnArray: number[] = [];
    const argsArray: unknown[][] = [];
    for (let i = 0; i < count; i += 1) {
      fnArray.push(ops.constructPath);
      argsArray.push([ops.fill, [], new Float32Array([100 + (i % 50), 100, 101 + (i % 50), 101])]);
    }
    for (let i = 0; i < count; i += 1) {
      fnArray.push(ops.beginText, ops.setFont, ops.setTextMatrix, ops.showText);
      argsArray.push(
        [],
        ["F1", 10],
        [[1, 0, 0, 1, 100 + (i % 50), 120]],
        [[{ unicode: "a", width: 500 }]],
      );
    }
    return { fnArray, argsArray };
  }

  it("gives up, as unmeasured, instead of scanning quadratically", () => {
    const page = crowdedCell(40_000);
    const started = performance.now();
    expect(() => measureVisibility(ops, page, [0, 0, 612, 792])).toThrow();
    // The full scan took 20 s.
    expect(performance.now() - started).toBeLessThan(3_000);
  });

  it("reports such a page's hidden text as not measured", async () => {
    const shapes: string[] = [];
    const runs: string[] = [];
    for (let i = 0; i < 20_000; i += 1) {
      shapes.push(`${100 + (i % 50)} 100 1 1 re f`);
      runs.push(`BT /F1 10 Tf ${100 + (i % 50)} 120 Td (a) Tj ET`);
    }
    const started = performance.now();
    const { layout } = await extractResume(buildPdf([...shapes, ...runs].join("\n")), "pdf");
    expect(layout?.hiddenTextChars).toBeUndefined();
    expect(performance.now() - started).toBeLessThan(15_000);
  }, 30_000);
});

/** `pages` pages that all show one content stream. */
function multiPagePdf(pages: number, content: string): Buffer {
  const objects: string[] = [];
  objects[1] = "<</Type/Catalog/Pages 2 0 R>>";
  objects[3] = "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>";
  objects[4] = `<</Length ${content.length}>>\nstream\n${content}\nendstream`;
  const kids: string[] = [];
  for (let page = 0; page < pages; page += 1) {
    kids.push(`${5 + page} 0 R`);
    objects[5 + page] =
      "<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 3 0 R>>>>/Contents 4 0 R>>";
  }
  objects[2] = `<</Type/Pages/Kids[${kids.join(" ")}]/Count ${pages}>>`;
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1)
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<</Size ${objects.length}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

describe("#6 table detection reads only the measured pages", () => {
  it("counts the tables of the first pages, not of all thirty", async () => {
    const ops = [line(700, "Jane Doe Senior Engineer at Acme Corporation since 2019")];
    for (let row = 0; row <= 3; row += 1)
      ops.push(`60 ${100 + row * 20} m 400 ${100 + row * 20} l S`);
    for (let col = 0; col <= 3; col += 1)
      ops.push(`${60 + col * 113} 100 m ${60 + col * 113} 160 l S`);
    const { layout } = await extractResume(multiPagePdf(30, ops.join("\n")), "pdf");
    expect(layout?.tableCount).toBeGreaterThan(0);
    expect(layout?.tableCount).toBeLessThanOrEqual(6);
  }, 30_000);
});

describe("#7 single-quoted attributes in a DOCX", () => {
  it.each([
    ["white", `<w:p>${whiteRun(KEYWORDS, "'")}</w:p>`],
    ["1pt", `<w:p><w:r><w:rPr><w:sz w:val='2'/></w:rPr><w:t>${KEYWORDS}</w:t></w:r></w:p>`],
  ])("finds %s text", (_, body) => {
    expect(measureDocx(buildDocxBody(body))?.hiddenChars).toBe(KEYWORD_CHARS);
  });

  it("reads a single-quoted vanish switched off as visible", () => {
    const body = `<w:p><w:r><w:rPr><w:vanish w:val='false'/></w:rPr><w:t>${KEYWORDS}</w:t></w:r></w:p>`;
    expect(measureDocx(buildDocxBody(body))?.hiddenChars).toBe(0);
  });
});

describe("#9 the CLI prints a role without dates", () => {
  const dir = mkdtempSync(join(tmpdir(), "ats-review-cli-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("without a '(null)'", async () => {
    const path = join(dir, "resume.json");
    writeFileSync(
      path,
      JSON.stringify({
        basics: { name: "Jane Doe", email: "jane@example.com" },
        work: [{ name: "Acme", position: "Engineer", highlights: ["Built services"] }],
      }),
    );
    const out: string[] = [];
    const err: string[] = [];
    vi.spyOn(console, "log").mockImplementation((value: string) => void out.push(value));
    vi.spyOn(console, "error").mockImplementation((value: string) => void err.push(value));
    let code: number;
    try {
      code = await main(["check", path]);
    } finally {
      vi.restoreAllMocks();
    }
    expect(err).toEqual([]);
    expect(code).toBe(0);
    const printed = out.join("\n");
    expect(printed).not.toContain("null");
    expect(printed).toMatch(/^ {2}Role {5}Engineer, Acme$/m);
  });
});

describe("#12 a malformed DOCX", () => {
  it("fails with a clear message, keeping mammoth's as the cause", async () => {
    // A later entry of the same name is the one JSZip reads: here, not XML at all.
    const docx = buildDocxBody(BODY, false, [["word/document.xml", "garbage"]]);
    const failure = await extractResume(docx, "docx").catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe("The document could not be read as DOCX.");
    expect((failure as Error).cause).toBeInstanceOf(Error);
  });

  it("fails the same way on a file that is not an archive", async () => {
    await expect(extractResume(Buffer.from("not a zip"), "docx")).rejects.toThrow(
      "The document could not be read as DOCX.",
    );
  });
});

describe("#13 a '>' inside a quoted attribute does not end the tag", () => {
  it.each([
    ['<p><img alt="a > b">Hello</p>', "Hello"],
    ["<p><a title='x>y' href=\"/\">Hello</a></p>", "Hello"],
    ['<p><a title = "x>y">Hello</a></p>', "Hello"],
    // Unquoted values, and a quote that does not open a value, are as before.
    ['<p><a href=/x title=a">Hello</a></p>', "Hello"],
  ])("in %s", (html, expected) => {
    expect(htmlText(html).trim()).toBe(expected);
  });

  it("drops what follows a quote that never closes, as a browser does", () => {
    expect(htmlText('Before <img alt="never closed> After').trim()).toBe("Before");
  });

  it("stays linear on a page of unclosed quotes", () => {
    const html = '<a b="'.repeat(200_000);
    const started = performance.now();
    htmlText(html);
    expect(performance.now() - started).toBeLessThan(1_000);
  });
});

describe("#14 a soft-masked image drawn over text does not cover it", () => {
  const image = (dictionary: string, pixel: string) =>
    stream(
      `/Type/XObject/Subtype/Image/Width 1/Height 1/ColorSpace/DeviceGray/BitsPerComponent 8${dictionary}`,
      pixel,
    );
  const OVER = `${line(700)} q 400 0 0 30 40 690 cm /Im1 Do Q`;
  const XOBJECT = "/XObject<</Im1 7 0 R>>";

  it("still counts an opaque image over text as covering it", async () => {
    const layout = await pdfLayout(OVER, XOBJECT, [image("", "ÿ")]);
    expect(layout.hiddenTextChars).toBe(KEYWORD_CHARS);
  });

  it("does not count an image with a soft mask", async () => {
    const layout = await pdfLayout(OVER, XOBJECT, [
      image("/SMask 8 0 R", "ÿ"),
      image("", "\u0000"),
    ]);
    expect(layout.hiddenTextChars).toBe(0);
  });

  it("does not count a shape painted through a graphics-state soft mask, nor the mask", async () => {
    const mask = stream(
      "/Type/XObject/Subtype/Form/BBox[0 0 612 792]/Group<</S/Transparency/CS/DeviceGray>>",
      "0 g 0 0 612 792 re f",
    );
    const layout = await pdfLayout(
      `${line(700)} q /GS1 gs 1 1 1 rg 40 690 400 30 re f Q 0 g ${line(600)}`,
      "/ExtGState<</GS1<</SMask<</S/Luminosity/G 7 0 R>>>>>>",
      [mask],
    );
    expect(layout.hiddenTextChars).toBe(0);
  });
});

/* Zip records, field by field, for archives a writer would not produce. */
const u16 = (value: number) => {
  const bytes = Buffer.alloc(2);
  bytes.writeUInt16LE(value);
  return bytes;
};
const u32 = (value: number) => {
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32LE(value >>> 0);
  return bytes;
};
const u64 = (value: number) => {
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64LE(BigInt(value));
  return bytes;
};

function localHeader(name: string, method: number, data: Buffer, size = data.length, flags = 0) {
  const nameBytes = Buffer.from(name);
  return Buffer.concat([
    u32(0x04034b50),
    u16(20),
    u16(flags),
    u16(method),
    u32(0),
    u32(0),
    u32(data.length),
    u32(size),
    u16(nameBytes.length),
    u16(0),
    nameBytes,
    data,
  ]);
}

type CentralOptions = { extra?: Buffer; external?: number; madeBy?: number; flags?: number };
function centralHeader(
  name: string,
  method: number,
  compressed: number,
  size: number,
  offset: number,
  { extra = Buffer.alloc(0), external = 0, madeBy = 20, flags = 0 }: CentralOptions = {},
) {
  const nameBytes = Buffer.from(name);
  return Buffer.concat([
    u32(0x02014b50),
    u16(madeBy),
    u16(20),
    u16(flags),
    u16(method),
    u32(0),
    u32(0),
    u32(compressed),
    u32(size),
    u16(nameBytes.length),
    u16(extra.length),
    u16(0),
    u16(0),
    u16(0),
    u32(external),
    u32(offset),
    nameBytes,
    extra,
  ]);
}

type EndFields = {
  disk?: number;
  dirDisk?: number;
  onDisk: number;
  records: number;
  size: number;
  offset: number;
  comment?: number;
};
const endRecord = ({
  disk = 0,
  dirDisk = 0,
  onDisk,
  records,
  size,
  offset,
  comment = 0,
}: EndFields) =>
  Buffer.concat([
    u32(0x06054b50),
    u16(disk),
    u16(dirDisk),
    u16(onDisk),
    u16(records),
    u32(size),
    u32(offset),
    u16(comment),
  ]);
const zip64Record = (records: number, size: number, offset: number) =>
  Buffer.concat([
    u32(0x06064b50),
    u64(44),
    u16(45),
    u16(45),
    u32(0),
    u32(0),
    u64(records),
    u64(records),
    u64(size),
    u64(offset),
  ]);
const zip64Locator = (record: number) =>
  Buffer.concat([u32(0x07064b50), u32(0), u64(record), u32(1)]);

type EntrySpec = {
  name: string;
  content: string | Buffer;
  deflate?: boolean;
  /** Sizes moved to a ZIP64 extra field, the header's own set to 0xFFFFFFFF. */
  zip64Sizes?: boolean;
} & Omit<CentralOptions, "extra">;

/** An archive of `entries` in order, each named in both its headers as given. */
function archive(entries: EntrySpec[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const { name, content, deflate, zip64Sizes, ...options } of entries) {
    const raw = Buffer.from(content);
    const data = deflate ? deflateRawSync(raw) : raw;
    const method = deflate ? 8 : 0;
    const local = localHeader(name, method, data, raw.length, options.flags);
    const extra = zip64Sizes
      ? Buffer.concat([u16(1), u16(16), u64(raw.length), u64(data.length)])
      : Buffer.alloc(0);
    const [compressed, size] = zip64Sizes ? [0xffffffff, 0xffffffff] : [data.length, raw.length];
    centrals.push(centralHeader(name, method, compressed, size, offset, { ...options, extra }));
    locals.push(local);
    offset += local.length;
  }
  const directory = Buffer.concat(centrals);
  return Buffer.concat([
    ...locals,
    directory,
    endRecord({
      onDisk: entries.length,
      records: entries.length,
      size: directory.length,
      offset,
    }),
  ]);
}

/** The six fields of the end record JSZip reads, as [offset, width]. */
const END_FIELDS = {
  disk: [4, 2],
  dirDisk: [6, 2],
  onDisk: [8, 2],
  records: [10, 2],
  size: [12, 4],
  offset: [16, 4],
} as const;
type EndField = keyof typeof END_FIELDS;

function setMax(docx: Buffer, fields: EndField[], end = docx.length - 22) {
  const copy = Buffer.from(docx);
  for (const field of fields) {
    const [at, width] = END_FIELDS[field];
    if (width === 2) copy.writeUInt16LE(0xffff, end + at);
    else copy.writeUInt32LE(0xffffffff, end + at);
  }
  return copy;
}

/** `docx` ended with ZIP64 records, and `fields` of its classic end record at their maximum. */
function toZip64(docx: Buffer, fields: EndField[]) {
  const classic = docx.length - 22;
  const record = zip64Record(
    docx.readUInt16LE(classic + 10),
    docx.readUInt32LE(classic + 12),
    docx.readUInt32LE(classic + 16),
  );
  const zip64 = Buffer.concat([
    docx.subarray(0, classic),
    record,
    zip64Locator(classic),
    docx.subarray(classic),
  ]);
  return setMax(zip64, fields);
}

const DOCUMENT = "word/document.xml";

/**
 * The reviewer's first bomb: a disk number of 0xFFFF sends JSZip to ZIP64 records hidden in the
 * end record's comment, which place the directory on a bomb this reader never saw.
 */
function hiddenDirectoryBomb(bomb: Buffer, size: number) {
  const benign = Buffer.from(documentXml("<w:p><w:r><w:t>Jane</w:t></w:r></w:p>"));
  const parts: Buffer[] = [];
  let at = 0;
  const push = (part: Buffer) => {
    const start = at;
    parts.push(part);
    at += part.length;
    return start;
  };
  const benignLocal = push(localHeader(DOCUMENT, 0, benign));
  const hidden = at;
  const headerLength = centralHeader(DOCUMENT, 8, bomb.length, size, 0).length;
  push(centralHeader(DOCUMENT, 8, bomb.length, size, headerLength));
  push(localHeader(DOCUMENT, 8, bomb, size));
  const directory = at;
  push(centralHeader(DOCUMENT, 0, benign.length, benign.length, benignLocal));
  const directorySize = at - directory;
  const end = at;
  push(
    endRecord({
      disk: 0xffff,
      onDisk: 1,
      records: 1,
      size: directorySize,
      offset: directory,
      comment: 76,
    }),
  );
  push(zip64Record(1, end - 76 - hidden, 0));
  push(zip64Locator(end + 22));
  return Buffer.concat(parts);
}

/**
 * The reviewer's second: a ZIP64 record padded away from the end record, which JSZip reads as
 * bytes prepended to the archive, landing it on a directory hidden in the padding.
 */
function paddedRecordBomb(bomb: Buffer, size: number) {
  const benign = Buffer.from(documentXml(""));
  const padding = 4096;
  const parts: Buffer[] = [];
  let at = 0;
  const push = (part: Buffer) => {
    const start = at;
    parts.push(part);
    at += part.length;
    return start;
  };
  const benignLocal = push(localHeader(DOCUMENT, 0, benign));
  push(Buffer.alloc(padding));
  const bombLocal = push(localHeader(DOCUMENT, 8, bomb, size));
  const directory = at;
  push(centralHeader(DOCUMENT, 0, benign.length, benign.length, benignLocal));
  const record = push(zip64Record(1, at - directory, directory));
  const pad = Buffer.alloc(padding);
  centralHeader(DOCUMENT, 8, bomb.length, size, bombLocal - padding).copy(
    pad,
    directory + padding - (record + 56),
  );
  push(pad);
  push(zip64Locator(record));
  push(
    endRecord({
      onDisk: 0xffff,
      records: 0xffff,
      size: 0xffffffff,
      offset: 0xffffffff,
    }),
  );
  return Buffer.concat(parts);
}

/** A seeded PRNG (mulberry32): the mutations are the same on every run. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("R1 zip-bomb check bypass: the expansion budget reads the directory JSZip reads", () => {
  // JSZip as `mammoth` loads it, and its internal reader, which lists entries in directory order.
  const fromMammoth = createRequire(createRequire(import.meta.url).resolve("mammoth"));
  type JsZipEntry = {
    fileNameStr: string;
    compressionMethod: string;
    decompressed: { compressedContent: Uint8Array };
  };
  const ZipEntries = fromMammoth("jszip/lib/zipEntries") as new (options: object) => {
    load(data: Buffer): void;
    files: JsZipEntry[];
  };
  const { utf8decode } = fromMammoth("jszip/lib/utf8") as {
    utf8decode: (bytes: Uint8Array) => string;
  };
  const JSZip = fromMammoth("jszip") as {
    loadAsync(data: Buffer): Promise<{
      files: Record<string, { dir: boolean; _data: { compressedContent?: Uint8Array } }>;
    }>;
  };

  const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");
  const theirs = (data: Buffer) => {
    const reader = new ZipEntries({ decodeFileName: utf8decode });
    reader.load(data);
    return reader.files.map((file) => ({
      name: file.fileNameStr,
      method: file.compressionMethod.charCodeAt(0),
      body: hex(file.decompressed.compressedContent),
    }));
  };

  /**
   * Ours refuses the archive, or reads exactly JSZip's entries — never another directory.
   * True when ours read it.
   */
  const agrees = (data: Buffer) => {
    const ours = zipEntries(data);
    if (!ours) return false;
    expect(ours.map(({ name, method, body }) => ({ name, method, body: hex(body) }))).toEqual(
      theirs(data),
    );
    return true;
  };

  /** And the files JSZip then holds by name, which is what `mammoth` asks it for. */
  const agreesOnFiles = async (data: Buffer) => {
    const ours = zipFiles(data);
    if (!ours) return false;
    const { files } = await JSZip.loadAsync(data);
    expect([...ours.keys()].sort()).toEqual(Object.keys(files).sort());
    for (const [key, file] of ours) {
      const content = files[key]!._data.compressedContent;
      expect(file.dir).toBe(files[key]!.dir);
      // JSZip keeps no data for a folder, nor for an entry that declares itself empty.
      expect(content === undefined).toBe(file.dir || file.size === 0);
      if (content) expect(hex(file.body)).toBe(hex(content));
    }
    return true;
  };

  const base = buildDocxBody(BODY, true, [["word/styles.xml", "<w:styles/>"]]);
  const SIZE = 70 * 1024 * 1024;
  const bomb = deflateRawSync(Buffer.alloc(SIZE, 32), { level: 9 });
  const fields = Object.keys(END_FIELDS) as EndField[];
  const ALL_FOUR: EndField[] = ["onDisk", "records", "size", "offset"];

  // [label, archive, whether ours must read it (true), refuse it (false), or either (null)].
  const crafted: Array<[string, Buffer, boolean | null]> = [
    ["a normal package", base, true],
    ["a stored package", buildDocxBody(BODY), true],
    ["a package behind prepended bytes", Buffer.concat([Buffer.from("junk"), base]), true],
    ["a package ending with ZIP64 records", toZip64(base, ALL_FOUR), true],
    ["a package with every end field at its maximum", toZip64(base, fields), true],
    ...fields.map((field): [string, Buffer, boolean] => [
      `${field} at its maximum with no ZIP64 records`,
      setMax(base, [field]),
      false,
    ]),
    ...fields.map((field): [string, Buffer, boolean] => [
      `${field} alone at its maximum before ZIP64 records`,
      toZip64(base, [field]),
      true,
    ]),
    ["the hidden-directory bomb", hiddenDirectoryBomb(bomb, SIZE), null],
    ["the padded-record bomb", paddedRecordBomb(bomb, SIZE), null],
    [
      "a directory whose end under-counts it",
      (() => {
        const lowered = Buffer.from(base);
        lowered.writeUInt16LE(1, lowered.length - 22 + 8);
        lowered.writeUInt16LE(1, lowered.length - 22 + 10);
        return lowered;
      })(),
      true,
    ],
    [
      "a ZIP64 locator pointing at nothing",
      (() => {
        const zip64 = toZip64(base, ALL_FOUR);
        zip64.writeUInt32LE(0, zip64.length - 22 - 20 + 8);
        return zip64;
      })(),
      true,
    ],
    [
      "sizes in a ZIP64 extra field",
      archive([{ name: DOCUMENT, content: documentXml(BODY), deflate: true, zip64Sizes: true }]),
      true,
    ],
    [
      "an encrypted entry",
      archive([{ name: DOCUMENT, content: documentXml(BODY), flags: 1 }]),
      false,
    ],
    [
      "two entries of one name, a folder and a relative path",
      archive([
        { name: "word/", content: "", external: 0x10 },
        { name: DOCUMENT, content: documentXml(BODY) },
        { name: "./word/../word/document.xml", content: documentXml(BODY), deflate: true },
      ]),
      true,
    ],
    [
      "a file a Unix mode marks as a folder",
      archive([{ name: DOCUMENT, content: "x", madeBy: 0x0314, external: 0o40755 * 0x10000 }]),
      false,
    ],
  ];

  it.each(crafted)("reads %s as JSZip does, or refuses it", async (_, data, expected) => {
    const read = agrees(data);
    const readFiles = await agreesOnFiles(data);
    if (expected !== null) expect(readFiles).toBe(expected);
    if (!read) expect(readFiles).toBe(false);
  });

  it("agrees with JSZip on randomly damaged headers", () => {
    const random = seeded(20261003);
    const bases = [base, toZip64(base, ALL_FOUR), Buffer.concat([Buffer.from("junk"), base])];
    let read = 0;
    let refused = 0;
    for (let round = 0; round < 600; round += 1) {
      const damaged = Buffer.from(bases[round % bases.length]!);
      for (let change = Math.floor(random() * 3); change >= 0; change -= 1) {
        // Mostly the directory and end records at the tail; sometimes the first local header.
        const at =
          random() < 0.8
            ? damaged.length - 4 - Math.floor(random() * 260)
            : Math.floor(random() * 60);
        const kind = random();
        if (kind < 0.4) damaged[at] = Math.floor(random() * 256);
        else if (kind < 0.6) damaged.writeUInt16LE(0xffff, at);
        else if (kind < 0.8) damaged.writeUInt32LE(0xffffffff, at);
        else damaged.writeUInt32LE(Math.floor(random() * 4096), at);
      }
      if (agrees(damaged)) read += 1;
      else refused += 1;
    }
    // Both outcomes are exercised, not one of them only.
    expect(read).toBeGreaterThan(50);
    expect(refused).toBeGreaterThan(50);
  });

  it.each([
    ["the hidden-directory bomb", hiddenDirectoryBomb],
    ["the padded-record bomb", paddedRecordBomb],
  ])("refuses %s", (_, build) => {
    expect(withinExpansionLimit(build(bomb, SIZE))).toBe(false);
  });

  it("measures the document JSZip reads when two entries share its name", () => {
    const docx = buildDocxBody(BODY, false, [
      [DOCUMENT, documentXml(`${BODY}<w:p>${whiteRun(KEYWORDS)}</w:p>`)],
    ]);
    expect(measureDocx(docx)?.hiddenChars).toBe(KEYWORD_CHARS);
  });

  it("finds a part stored under a relative path as JSZip does", () => {
    const docx = archive([
      { name: `./${DOCUMENT}`, content: documentXml(`<w:p>${whiteRun(KEYWORDS)}</w:p>`) },
    ]);
    expect(readZipEntry(docx, DOCUMENT)).not.toBeNull();
    expect(measureDocx(docx)?.hiddenChars).toBe(KEYWORD_CHARS);
  });

  it("refuses entries that overlap, whose inflation would cost more than the file", () => {
    // Fifty entries of their own names, each local header's extra field skipping to one shared
    // deflated body: each would inflate it again. 50 MB in all, under the budget.
    const size = 1024 * 1024;
    const body = deflateRawSync(Buffer.alloc(size, 32));
    const names = Array.from({ length: 50 }, (_, index) => `a${String(index).padStart(2, "0")}`);
    const shared = names.length * (30 + 3);
    const locals = names.map((name, index) => {
      const header = localHeader(name, 8, Buffer.alloc(0), size);
      header.writeUInt32LE(body.length, 18);
      header.writeUInt16LE(shared - (index + 1) * header.length, 28);
      return header;
    });
    const directory = Buffer.concat(
      names.map((name, index) => centralHeader(name, 8, body.length, size, index * (30 + 3))),
    );
    const data = Buffer.concat([
      ...locals,
      body,
      directory,
      endRecord({ onDisk: 50, records: 50, size: directory.length, offset: shared + body.length }),
    ]);
    expect(zipFiles(data)?.size).toBe(50);
    expect(withinExpansionLimit(data)).toBe(false);
  });
});

describe("R2 nested tables: an unshaded cell shows the fill of the cell around it", () => {
  const white = (value: string) => `<w:p>${whiteRun(value)}</w:p>`;
  const cell = (inner: string, fill?: string) =>
    `<w:tc><w:tcPr>${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ""}</w:tcPr>${inner}</w:tc>`;
  const table = (...cells: string[]) => `<w:tbl><w:tblPr/><w:tr>${cells.join("")}</w:tr></w:tbl>`;

  it.each([
    [
      "after a nested table",
      table(
        cell(
          `${white("Contact")}${table(cell(white("Python")))}<w:p/>${white(KEYWORDS)}`,
          "1F2937",
        ),
      ),
    ],
    [
      "inside a nested unshaded table",
      table(cell(`${table(cell(white(KEYWORDS)))}<w:p/>`, "1F2937")),
    ],
  ])("does not flag white text in a dark cell %s", (_, body) => {
    expect(measureDocx(buildDocxBody(body))?.hiddenChars).toBe(0);
  });

  it("still flags white text in a white cell after a nested dark cell", () => {
    const body = table(cell(`${table(cell("<w:p/>", "1F2937"))}<w:p/>${white(KEYWORDS)}`));
    expect(measureDocx(buildDocxBody(body))?.hiddenChars).toBe(KEYWORD_CHARS);
  });

  it("still flags white text in a nested white cell inside a dark one", () => {
    const body = table(cell(`${table(cell(white(KEYWORDS), "FFFFFF"))}<w:p/>`, "1F2937"));
    expect(measureDocx(buildDocxBody(body))?.hiddenChars).toBe(KEYWORD_CHARS);
  });
});

describe("R3 tracked formatting changes: the previous formatting is not the live one", () => {
  const CHANGE = 'w:id="1" w:author="a" w:date="2024-01-01T00:00:00Z"';
  const run = (live: string, previous: string) =>
    `<w:p><w:r><w:rPr>${live}<w:rPrChange ${CHANGE}><w:rPr>${previous}</w:rPr></w:rPrChange></w:rPr><w:t>${KEYWORDS}</w:t></w:r></w:p>`;

  it.each([
    ["black text formerly white", run('<w:color w:val="000000"/>', '<w:color w:val="FFFFFF"/>')],
    ["shown text formerly hidden", run("", "<w:vanish/>")],
    ["11pt text formerly 1pt", run('<w:sz w:val="22"/>', '<w:sz w:val="2"/>')],
    [
      "white text on a dark paragraph formerly shaded white",
      `<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="1F3864"/><w:pPrChange ${CHANGE}><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/></w:pPr></w:pPrChange></w:pPr>${whiteRun(KEYWORDS)}</w:p>`,
    ],
    [
      "white text in a dark cell formerly shaded white",
      `<w:tbl><w:tblPr/><w:tr><w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="1F3864"/><w:tcPrChange ${CHANGE}><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/></w:tcPr></w:tcPrChange></w:tcPr><w:p>${whiteRun(KEYWORDS)}</w:p></w:tc></w:tr></w:tbl>`,
    ],
  ])("does not flag %s", (_, body) => {
    expect(measureDocx(buildDocxBody(body))?.hiddenChars).toBe(0);
  });

  it.each([
    ["white text formerly black", run('<w:color w:val="FFFFFF"/>', '<w:color w:val="000000"/>')],
    ["hidden text formerly shown", run("<w:vanish/>", "")],
  ])("still flags %s", (_, body) => {
    expect(measureDocx(buildDocxBody(body))?.hiddenChars).toBe(KEYWORD_CHARS);
  });
});

describe("R4 an image whose colour-key /Mask hides no pixel still covers the text under it", () => {
  const image = (dictionary: string, pixel: string) =>
    stream(
      `/Type/XObject/Subtype/Image/Width 1/Height 1/ColorSpace/DeviceGray/BitsPerComponent 8${dictionary}`,
      pixel,
    );
  const ops = OPS as unknown as Record<string, number>;

  /** Hidden characters on a page with keywords under a stretched 1×1 image. */
  async function hiddenUnder(extra: string[], lookup = true) {
    const pdf = buildPdf(
      `${visible}\n${line(700)} q 400 0 0 30 40 690 cm /Im1 Do Q`,
      "/XObject<</Im1 7 0 R>>",
      "",
      extra,
    );
    const document = await getDocument({
      data: new Uint8Array(pdf),
      isEvalSupported: false,
      verbosity: 0,
    }).promise;
    try {
      const page = await document.getPage(1);
      const list = (await page.getOperatorList()) as unknown as Parameters<
        typeof measureVisibility
      >[1];
      const seeThrough = lookup ? await seeThroughImages(ops, list, page) : undefined;
      const { hidden } = measureVisibility(ops, list, page.view as Box, seeThrough);
      return hidden.join("").replace(/\s/g, "").length;
    } finally {
      await document.destroy();
    }
  }

  it.each([
    ["an opaque image", [image("", "ÿ")]],
    ["a colour-key mask that keys out no pixel", [image("/Mask[0 0]", "ÿ")]],
    ["a soft mask that is opaque throughout", [image("/SMask 8 0 R", "ÿ"), image("", "ÿ")]],
  ])("counts %s as covering", async (_, extra) => {
    expect(await hiddenUnder(extra)).toBe(KEYWORD_CHARS);
  });

  it.each([
    ["a colour-key mask that keys out its pixel", [image("/Mask[255 255]", "ÿ")]],
    ["a soft mask that is transparent", [image("/SMask 8 0 R", "ÿ"), image("", "\u0000")]],
  ])("does not count %s", async (_, extra) => {
    expect(await hiddenUnder(extra)).toBe(0);
  });

  it("treats every masked image as see-through when its pixels are not looked up", async () => {
    expect(await hiddenUnder([image("/Mask[0 0]", "ÿ")], false)).toBe(0);
  });

  it("looks the pixels up when a PDF is extracted", async () => {
    const layout = await pdfLayout(
      `${line(700)} q 400 0 0 30 40 690 cm /Im1 Do Q`,
      "/XObject<</Im1 7 0 R>>",
      [image("/Mask[0 0]", "ÿ")],
    );
    expect(layout.hiddenTextChars).toBe(KEYWORD_CHARS);
  });
});

const vanishRun = (value: string) => `<w:r><w:rPr><w:vanish/></w:rPr><w:t>${value}</w:t></w:r>`;

describe("final review: nested tables and markup outside the elements stay linear", () => {
  const timed = (data: Buffer) => {
    const start = performance.now();
    const measured = measureDocx(data);
    return { measured, ms: performance.now() - start };
  };

  it("resolves a run's background in constant time under deeply nested tables", () => {
    // Quadratic, this walked 60,000 tables for each of 60,000 runs: tens of seconds.
    const body = `${BODY}${"<w:tbl>".repeat(60_000)}${"<w:r></w:r>".repeat(60_000)}`;
    const { measured, ms } = timed(buildDocxBody(body));
    expect(measured?.tableCount).toBe(60_000);
    expect(ms).toBeLessThan(2000);
  });

  it("reads nothing inside a comment, a CDATA section or a processing instruction", () => {
    const hostile = `<!-- ${"<w:tbl>".repeat(60_000)}${"<w:r></w:r>".repeat(60_000)} -->`;
    const { measured, ms } = timed(
      buildDocxBody(
        `${BODY}${hostile}<?pi <w:tbl> ?><w:p><w:r><w:t><![CDATA[<w:tbl>]]></w:t></w:r></w:p>`,
      ),
    );
    expect(measured?.tableCount).toBe(0);
    expect(ms).toBeLessThan(2000);
  });

  it("drops the rest of a document whose comment never closes, in linear time", () => {
    const body = `${BODY}${"<!--<w:tbl>".repeat(100_000)}`;
    const { measured, ms } = timed(buildDocxBody(body));
    expect(measured?.tableCount).toBe(0);
    expect(ms).toBeLessThan(2000);
  });

  it("still reads hidden text written as CDATA", () => {
    const body = `${BODY}<w:p><w:r><w:rPr><w:vanish/></w:rPr><w:t><![CDATA[${KEYWORDS} <&>]]></w:t></w:r></w:p>`;
    const measured = measureDocx(buildDocxBody(body));
    expect(measured?.hiddenChars).toBe(KEYWORD_CHARS + 3);
    expect(measured?.hiddenSample).toBe(`${KEYWORDS} <&>`);
  });
});

describe("final review: a tracked change cannot switch hidden-text detection off", () => {
  const hiddenAfter = (prefix: string) =>
    measureDocx(
      buildDocxBody(
        `${prefix}${BODY}<w:p>${vanishRun(KEYWORDS)}</w:p><w:p>${whiteRun(KEYWORDS)}</w:p>`,
      ),
    )?.hiddenChars;

  it.each([
    ["in a comment", "<!-- <w:rPrChange> -->"],
    ["in a CDATA section", "<w:p><w:r><w:t><![CDATA[<w:pPrChange>]]></w:t></w:r></w:p>"],
    ["in a processing instruction", "<?x <w:tcPrChange> ?>"],
    ["self-closing", '<w:p><w:pPr><w:pPrChange w:id="1"/></w:pPr></w:p>'],
    [
      "left open before the next run",
      '<w:p><w:r><w:rPr><w:rPrChange w:id="1"></w:rPr></w:r></w:p>',
    ],
    ["closed by another change's end tag", "<w:p><w:pPr><w:pPrChange></w:rPrChange></w:pPr></w:p>"],
  ])("ignores a change %s", (_, prefix) => {
    expect(hiddenAfter(prefix)).toBe(KEYWORD_CHARS * 2);
  });

  it("still skips the previous formatting inside a change", () => {
    const body = `<w:p><w:r><w:rPr><w:rPrChange w:id="1"><w:rPr><w:vanish/></w:rPr></w:rPrChange></w:rPr><w:t>${KEYWORDS}</w:t></w:r></w:p>`;
    expect(measureDocx(buildDocxBody(body))?.hiddenChars).toBe(0);
  });
});

describe("final review: the parts measured are the parts mammoth reads", () => {
  const PACKAGE = "http://schemas.openxmlformats.org/package/2006/relationships";
  const TYPES = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/";
  const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>`;
  const rels = (...targets: Array<[type: string, target: string]>) =>
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${PACKAGE}">${targets
      .map(
        ([type, target], index) =>
          `<Relationship Id="r${index}" Type="${TYPES}${type}" Target="${target}"/>`,
      )
      .join("")}</Relationships>`;
  const docx = (packageRels: string, ...parts: Array<[name: string, content: string]>) =>
    archive([
      { name: "[Content_Types].xml", content: CONTENT_TYPES },
      { name: "_rels/.rels", content: packageRels },
      ...parts.map(([name, content]) => ({ name, content, deflate: true })),
    ]);

  describe("the expansion budget charges a part each time mammoth reads it", () => {
    // 11 MB of comment after the document: read once it is within the budget, six times not.
    const padded = `${documentXml(BODY)}<!--${" ".repeat(11 * 1024 * 1024)}-->`;
    const RELATED = ["styles", "numbering", "footnotes", "endnotes", "comments"];
    const main = rels(["officeDocument", DOCUMENT]);

    it("passes the document read once", () => {
      expect(withinExpansionLimit(docx(main, [DOCUMENT, padded]))).toBe(true);
    });

    it("refuses it when every related part is the document again", async () => {
      const data = docx(
        main,
        [DOCUMENT, padded],
        [
          "word/_rels/document.xml.rels",
          rels(...RELATED.map((type): [string, string] => [type, "document.xml"])),
        ],
      );
      expect(withinExpansionLimit(data)).toBe(false);
      await expect(extractResume(data, "docx")).rejects.toThrow(/expands to more than/);
    });

    it("refuses it when the package names it as its related parts' rels", () => {
      // The main part's relationships file is read twice, and again as every related part.
      const data = docx(
        rels(["officeDocument", "word/main.xml"]),
        ["word/main.xml", documentXml(BODY)],
        [
          "word/_rels/main.xml.rels",
          `${rels(...RELATED.map((type): [string, string] => [type, "_rels/main.xml.rels"]))}<!--${" ".repeat(10 * 1024 * 1024)}-->`,
        ],
      );
      expect(withinExpansionLimit(data)).toBe(false);
    });

    it("refuses relationships it cannot read rather than guess at them", () => {
      expect(
        withinExpansionLimit(docx(`<Relationships><!-- `, [DOCUMENT, documentXml(BODY)])),
      ).toBe(false);
      expect(
        withinExpansionLimit(
          docx(`<!DOCTYPE r [<!ENTITY t "word/main.xml">]>${rels(["officeDocument", "&t;"])}`, [
            DOCUMENT,
            documentXml(BODY),
          ]),
        ),
      ).toBe(false);
    });
  });

  describe("hidden text is measured in the main part mammoth extracts", () => {
    const hidden = documentXml(`${BODY}<w:p>${vanishRun(KEYWORDS)}</w:p>`);

    it.each([
      ["a relative target", "word/main.xml"],
      ["an absolute target", "/word/main.xml"],
      ["an escaped target", "word/m&#97;in&#x2e;xml"],
    ])("follows %s past a clean word/document.xml", async (_, target) => {
      const data = docx(
        rels(["officeDocument", target]),
        ["word/main.xml", hidden],
        [DOCUMENT, documentXml(BODY)],
      );
      expect(measureDocx(data)?.hiddenChars).toBe(KEYWORD_CHARS);
      const { text, layout } = await extractResume(data, "docx");
      expect(text).toContain("Kubernetes");
      expect(layout?.hiddenTextChars).toBe(KEYWORD_CHARS);
    });

    it("ignores a relationship in another namespace or nested deeper, as mammoth does", async () => {
      const packageRels = `<Relationships xmlns="${PACKAGE}"><x:Relationship xmlns:x="urn:other" Id="a" Type="${TYPES}officeDocument" Target="word/decoy.xml"/><g><Relationship Id="b" Type="${TYPES}officeDocument" Target="word/decoy.xml"/></g><p:Relationship xmlns:p="${PACKAGE}" Id="c" Type="${TYPES}officeDocument" Target="word/main.xml"/></Relationships>`;
      const data = docx(
        packageRels,
        ["word/main.xml", hidden],
        ["word/decoy.xml", documentXml(BODY)],
      );
      expect(measureDocx(data)?.hiddenChars).toBe(KEYWORD_CHARS);
      const { layout } = await extractResume(data, "docx");
      expect(layout?.hiddenTextChars).toBe(KEYWORD_CHARS);
    });

    it("falls back to word/document.xml when the target is missing", () => {
      const data = docx(rels(["officeDocument", "word/absent.xml"]), [DOCUMENT, hidden]);
      expect(measureDocx(data)?.hiddenChars).toBe(KEYWORD_CHARS);
    });
  });
});
