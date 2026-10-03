import { crc32, inflateRawSync } from "node:zlib";

/**
 * Hidden text in a Word document: the DOCX side of "white fonting".
 *
 * Text extraction reads every run in `word/document.xml` whatever its formatting, so a run an
 * author hid is read by an ATS like any other. A run counts as hidden when Word itself would not
 * show it to a reader:
 * - marked hidden (`w:vanish`);
 * - smaller than 2pt (`w:sz` is in half-points);
 * - in white or near white, on a white background. The background is whatever shading lies
 *   under the run — its own, its paragraph's, its table cell's — else the page colour, so white
 *   text in a dark cell is not flagged. Text in a text box is not judged: its background is the
 *   shape's fill, which this does not read.
 *
 * Character styles that hide text are not followed; direct formatting is what the tricks use.
 */

const MAX_XML_BYTES = 8 * 1024 * 1024;

/**
 * What a whole DOCX may expand to. A resume with photos is a few megabytes; past this it is a
 * zip bomb, refused before `mammoth` — which inflates whatever it reads without a limit — sees it.
 */
export const MAX_DOCX_EXPANDED_BYTES = 64 * 1024 * 1024;

/**
 * One entry as JSZip 3.10 — `mammoth`'s reader — reads it. `body` is the compressed data;
 * `size` the uncompressed size the directory declares (JSZip keeps no data for an entry
 * declaring 0); `key` the name JSZip files it under.
 */
export type ZipEntry = {
  name: string;
  key: string;
  method: number;
  body: Buffer;
  size: number;
  dir: boolean;
  /** A file whose Unix mode says folder: JSZip files it as a folder, then fails to find it. */
  unixDir: boolean;
};

const LOCAL_FILE = 0x04034b50;
const CENTRAL_FILE = 0x02014b50;
const END = 0x06054b50;
const ZIP64_LOCATOR = 0x07064b50;
const ZIP64_END = 0x06064b50;

/**
 * JSZip's `DataReader`: every index is relative to `zero` (where the archive starts, past any
 * bytes prepended to it) and every read is bounds-checked, throwing where JSZip throws.
 */
class Reader {
  index = 0;
  zero = 0;
  constructor(private readonly data: Buffer) {}

  private check(index: number) {
    if (this.data.length < this.zero + index || index < 0) throw new RangeError("End of data");
  }
  setIndex(index: number) {
    this.check(index);
    this.index = index;
  }
  skip(count: number) {
    this.setIndex(this.index + count);
  }
  /**
   * Little-endian, folded through 32-bit shifts as JSZip folds it: four bytes read as a signed
   * 32-bit integer (0xFFFFFFFF is -1), and eight as their low four.
   */
  int(size: number) {
    this.check(this.index + size);
    let value = 0;
    for (let at = this.index + size - 1; at >= this.index; at -= 1)
      value = (value << 8) + this.data[this.zero + at]!;
    this.index += size;
    return value;
  }
  /** As JSZip slices: a negative size yields nothing and steps back. */
  bytes(size: number) {
    this.check(this.index + size);
    const start = this.zero + this.index;
    this.index += size;
    return this.data.subarray(start, start + size);
  }
  signature(expected: number) {
    return this.bytes(4).readUInt32LE(0) === expected;
  }
  expect(expected: number) {
    if (!this.signature(expected)) throw new Error("Unexpected signature");
  }
  isSignature(index: number, expected: number) {
    const current = this.index;
    this.setIndex(index);
    const found = this.signature(expected);
    this.index = current;
    return found;
  }
  /** Over the whole file, not just its tail: JSZip does not stop at a comment's 64K. */
  lastIndexOf(signature: number) {
    const needle = Buffer.alloc(4);
    needle.writeUInt32LE(signature);
    const found = this.data.lastIndexOf(needle);
    return found < 0 ? -1 : found - this.zero;
  }
}

/** JSZip's `readEndOfCentral`: the directory's offset and its records, `reader.zero` set. */
function readEndOfCentral(reader: Reader) {
  const end = reader.lastIndexOf(END);
  if (end < 0) throw new Error("No end of central directory");
  reader.setIndex(end);
  reader.expect(END);
  const disk = reader.int(2);
  const directoryDisk = reader.int(2);
  const recordsOnDisk = reader.int(2);
  let records = reader.int(2);
  let size = reader.int(4);
  let offset = reader.int(4);
  reader.bytes(reader.int(2));

  // Any one of the six at its maximum makes it ZIP64 — not only the three a writer sets.
  const zip64 =
    disk === 0xffff ||
    directoryDisk === 0xffff ||
    recordsOnDisk === 0xffff ||
    records === 0xffff ||
    size === -1 ||
    offset === -1;
  let expectedEnd = offset + size;
  if (zip64) {
    const locator = reader.lastIndexOf(ZIP64_LOCATOR);
    if (locator < 0) throw new Error("No ZIP64 locator");
    reader.setIndex(locator);
    reader.expect(ZIP64_LOCATOR);
    reader.int(4);
    let record = reader.int(8);
    if (reader.int(4) > 1) throw new Error("Multi-volume");
    // A record away from where its locator says is looked for: the last one in the file.
    if (!reader.isSignature(record, ZIP64_END)) {
      record = reader.lastIndexOf(ZIP64_END);
      if (record < 0) throw new Error("No ZIP64 end of central directory");
    }
    reader.setIndex(record);
    reader.expect(ZIP64_END);
    const recordSize = reader.int(8);
    reader.skip(4);
    reader.int(4);
    reader.int(4);
    reader.int(8);
    records = reader.int(8);
    size = reader.int(8);
    offset = reader.int(8);
    // JSZip's loop over a record's extensible data never advances its counter: it reads until
    // it throws, or — where a field's length steps back over itself — forever.
    if (recordSize - 44 > 0) throw new Error("ZIP64 extensible data");
    // The record's declared size, not its fixed one, is what JSZip expects between the
    // directory and the end record.
    expectedEnd = offset + size + 20 + 12 + recordSize;
  }

  // Bytes before the archive shift every offset in it: the gap is where it starts.
  const extra = end - expectedEnd;
  if (extra > 0) {
    if (!reader.isSignature(end, CENTRAL_FILE)) reader.zero = extra;
  } else if (extra < 0) throw new Error("Missing bytes");
  return { records, offset };
}

/** The value of an extra field JSZip reads with its own reader: the ZIP64 sizes, a Unicode path. */
type Extras = Map<number, Buffer>;

/** JSZip's `findExtraFieldUnicodePath` / `…Comment`: null where it is stale or absent. */
function unicodeExtra(extras: Extras, id: number, original: Buffer): string | null {
  const field = extras.get(id);
  if (!field) return null;
  const reader = new Reader(field);
  if (reader.int(1) !== 1) return null;
  if ((original.length ? crc32(original) | 0 : 0) !== reader.int(4)) return null;
  return reader.bytes(field.length - 5).toString("utf8");
}

/** JSZip's `readCentralPart` then `readLocalPart` and `handleUTF8`, for one entry. */
function readCentral(reader: Reader) {
  const madeBy = reader.int(2);
  reader.skip(2);
  const flags = reader.int(2);
  const method = reader.int(2);
  reader.int(4);
  reader.int(4);
  let compressedSize = reader.int(4);
  let size = reader.int(4);
  const nameLength = reader.int(2);
  const extraLength = reader.int(2);
  const commentLength = reader.int(2);
  reader.int(2);
  reader.int(2);
  const external = reader.int(4);
  let local = reader.int(4);
  if (flags & 1) throw new Error("Encrypted");
  reader.skip(nameLength);

  const extras: Extras = new Map();
  const extrasEnd = reader.index + extraLength;
  while (reader.index + 4 < extrasEnd) {
    const id = reader.int(2);
    extras.set(id, reader.bytes(reader.int(2)));
  }
  reader.setIndex(extrasEnd);
  const zip64 = extras.get(1);
  if (zip64) {
    const field = new Reader(zip64);
    if (size === -1) size = field.int(8);
    if (compressedSize === -1) compressedSize = field.int(8);
    if (local === -1) local = field.int(8);
  }
  const comment = reader.bytes(commentLength);
  return { madeBy, flags, method, compressedSize, size, external, local, extras, comment };
}

function readLocal(reader: Reader, entry: ReturnType<typeof readCentral>): ZipEntry {
  reader.setIndex(entry.local);
  reader.expect(LOCAL_FILE);
  reader.skip(22);
  const nameLength = reader.int(2);
  const extraLength = reader.int(2);
  // The name JSZip files an entry under is its local header's, not its directory header's.
  const nameBytes = reader.bytes(nameLength);
  reader.skip(extraLength);
  if (entry.compressedSize === -1 || entry.size === -1) throw new Error("Sizes unknown");
  if (entry.method !== 0 && entry.method !== 8) throw new Error("Unknown compression");
  const body = reader.bytes(entry.compressedSize);

  let name = nameBytes.toString("utf8");
  if (!(entry.flags & 0x800)) {
    name = unicodeExtra(entry.extras, 0x7075, nameBytes) ?? name;
    unicodeExtra(entry.extras, 0x6375, entry.comment);
  }
  const platform = entry.madeBy >> 8;
  const dir = !!(entry.external & 0x10) || name.slice(-1) === "/";
  const unixDir = platform === 3 && !!((entry.external >> 16) & 0xffff & 0x4000);
  const key = resolvePath(name);
  return {
    name,
    key: dir || unixDir ? (key.slice(-1) === "/" ? key : `${key}/`) : key,
    method: entry.method,
    body,
    size: entry.size,
    dir: dir || unixDir,
    unixDir: unixDir && !dir,
  };
}

/** JSZip's `utils.resolve`: "." and empty segments dropped, ".." steps back. */
function resolvePath(path: string) {
  const parts = path.split("/");
  const result: string[] = [];
  parts.forEach((part, index) => {
    if (part === "." || (part === "" && index !== 0 && index !== parts.length - 1)) return;
    if (part === "..") result.pop();
    else result.push(part);
  });
  return result.join("/");
}

/**
 * The entries of a zip archive in directory order, read exactly as JSZip's `ZipEntries.load`
 * reads them; null wherever JSZip throws, or would loop.
 *
 * The expansion budget holds only over the entries JSZip will inflate, so this does not read
 * the archive its own way: every signature search, the ZIP64 switch, the shift for prepended
 * bytes and the directory walk are JSZip's, quirks included. Linear in the file: each directory
 * header advances the walk by at least 46 bytes.
 */
export function zipEntries(data: Uint8Array): ZipEntry[] | null {
  try {
    const reader = new Reader(Buffer.from(data.buffer, data.byteOffset, data.byteLength));
    const { records, offset } = readEndOfCentral(reader);
    reader.setIndex(offset);
    const headers: Array<ReturnType<typeof readCentral>> = [];
    while (reader.signature(CENTRAL_FILE)) headers.push(readCentral(reader));
    // Records claimed and none found JSZip refuses; fewer than claimed it reads.
    if (records !== headers.length && records !== 0 && headers.length === 0)
      throw new Error("No records");
    return headers.map((header) => readLocal(reader, header));
  } catch {
    return null;
  }
}

/**
 * What JSZip then holds, by the name `mammoth` asks for: a later entry of a name replaces an
 * earlier one. Null where `loadAsync` fails.
 */
export function zipFiles(data: Uint8Array): Map<string, ZipEntry> | null {
  const entries = zipEntries(data);
  if (!entries) return null;
  const files = new Map<string, ZipEntry>();
  for (const entry of entries) {
    files.set(entry.key, entry);
    // JSZip looks the file up again under the name it meant to file it at, and throws if a
    // folder took it.
    if (entry.unixDir && files.get(resolvePath(entry.name))?.dir !== false) return null;
  }
  return files;
}

/**
 * Whether this reader can follow the archive and the relationships naming its parts:
 * `withinExpansionLimit` refuses the rest.
 */
export const readableArchive = (data: Uint8Array) => {
  const files = zipFiles(data);
  return !!files && !!mammothParts(files);
};

/** An entry's content, or null past `limit` bytes. Capped: a bomb costs the cap, not its claim. */
function inflate({ method, body, size }: ZipEntry, limit: number): Buffer | null {
  if (size === 0) return Buffer.alloc(0);
  if (method === 0) return body.length <= limit ? body : null;
  try {
    return inflateRawSync(body, { maxOutputLength: limit });
  } catch {
    return null;
  }
}

/** One file from a zip archive, as JSZip gives it to `mammoth`, or null. No dependency. */
export function readZipEntry(data: Uint8Array, name: string): Buffer | null {
  const entry = zipFiles(data)?.get(name);
  return entry && !entry.dir ? inflate(entry, MAX_XML_BYTES) : null;
}

const PACKAGE_RELATIONSHIPS = "http://schemas.openxmlformats.org/package/2006/relationships";
const MARKUP_COMPATIBILITY = "http://schemas.openxmlformats.org/markup-compatibility/2006";
const RELATIONSHIP_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/";
/** A relationships file is a few kilobytes; one past this is not followed. */
const MAX_RELS_BYTES = 1024 * 1024;

const XML_ENTITIES = new Map([
  ["amp", "&"],
  ["apos", "'"],
  ["gt", ">"],
  ["lt", "<"],
  ["quot", '"'],
]);

/** `@xmldom/xmldom` 0.8's `entityReplacer`; null for a name it reports as an error. */
function entity(reference: string): string | null {
  const name = reference.slice(1, -1);
  if (XML_ENTITIES.has(name)) return XML_ENTITIES.get(name)!;
  if (name[0] !== "#") return null;
  let code = parseInt(name.slice(1).replace("x", "0x"));
  if (code <= 0xffff || Number.isNaN(code)) return String.fromCharCode(code);
  code -= 0x10000;
  return String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 0x3ff));
}

/** An attribute's value as `@xmldom/xmldom` 0.8 gives it, or null where it reports an error. */
function attributeValue(raw: string): string | null {
  if (raw.replace(/&#?\w+;/g, "").includes("&")) return null;
  let unknown = false;
  const value = raw
    .replace(/[\t\n\r]/g, " ")
    .replace(/&#?\w+;/g, (reference) => entity(reference) ?? ((unknown = true), ""));
  return unknown ? null : value;
}

const QNAME = /^(?:([A-Za-z_][\w.-]*):)?([A-Za-z_][\w.-]*)$/;
const RELS_TAG = /<(\/?)([^\s<>/=]+)((?:\s+[^\s<>/=]+\s*=\s*(?:"[^"<]*"|'[^'<]*'))*)\s*(\/?)>/y;
const RELS_ATTR = /\s+([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

/**
 * A relationships part as `mammoth` reads it: the targets of each type, in order, of the
 * `Relationship` elements in the package namespace directly under the root. Null for anything
 * this cannot read as `mammoth`'s parser does — a DTD, an unknown entity or prefix, unbalanced or
 * malformed tags, markup-compatibility content — which no writer puts in such a file. Linear:
 * each tag pattern stops at the next `<`.
 */
function relationshipTargets(bytes: Buffer): Map<string, string[]> | null {
  // The decoder drops one byte-order mark and `mammoth` another.
  const text = new TextDecoder().decode(bytes);
  const xml = withoutMarkup(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  const targets = new Map<string, string[]>();
  const scopes: Array<Map<string, string>> = [new Map()];
  let roots = 0;
  for (let at = xml.indexOf("<"); at >= 0; at = xml.indexOf("<", at)) {
    RELS_TAG.lastIndex = at;
    const match = RELS_TAG.exec(xml);
    if (!match) return null;
    at = RELS_TAG.lastIndex;
    const [, closing, name, attrs, selfClosing] = match;
    const qualified = QNAME.exec(name!);
    if (!qualified) return null;
    const [, prefix = "", local] = qualified;
    if (closing) {
      if (attrs || selfClosing || scopes.length < 2 || scopes.pop()!.get("\0") !== name)
        return null;
      continue;
    }
    if (scopes.length === 1 && roots++) return null;
    // The prefixes in scope, and under "\0" the element's name, which its end tag must repeat.
    const scope = new Map(scopes[scopes.length - 1]);
    scope.set("\0", name!);
    const values = new Map<string, string>();
    for (const [, key, double, single] of attrs!.matchAll(RELS_ATTR)) {
      const value = attributeValue(double ?? single!);
      if (value === null || values.has(key!)) return null;
      values.set(key!, value);
      if (key === "xmlns") scope.set("", value);
      else if (key!.startsWith("xmlns:")) scope.set(key!.slice(6), value);
    }
    const namespace = scope.get(prefix) || undefined;
    if (prefix && namespace === undefined) return null;
    if (namespace === MARKUP_COMPATIBILITY && local === "AlternateContent") return null;
    if (scopes.length === 2 && namespace === PACKAGE_RELATIONSHIPS && local === "Relationship") {
      const type = values.get("Type") ?? "undefined";
      if (!targets.has(type)) targets.set(type, []);
      targets.get(type)!.push(values.get("Target") ?? "");
    }
    if (!selfClosing) scopes.push(scope);
  }
  return scopes.length === 1 && roots === 1 ? targets : null;
}

/** `mammoth`'s `zipfile.joinPath`: empty segments dropped, an absolute one starts afresh. */
function joinPath(...paths: string[]) {
  let joined: string[] = [];
  for (const path of paths.filter(Boolean)) joined = path[0] === "/" ? [path] : [...joined, path];
  return joined.join("/");
}

const splitPath = (path: string) => {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? ["", path] : [path.slice(0, slash), path.slice(slash + 1)];
};

const relationshipsOf = (path: string) => {
  const [dirname, basename] = splitPath(path);
  return joinPath(dirname!, "_rels", `${basename}.rels`);
};

/**
 * The parts `mammoth` 1.x's `docx-reader` reads, and how many times it reads each: its main
 * document — the package's `officeDocument` relationship, else `word/document.xml` — that
 * document's relationships (twice), its styles, numbering, notes and comments as those name them,
 * and the relationships of the notes and comments. A relationship may name any part, the main
 * document itself included, and each read inflates it again. Null where a relationships file
 * cannot be read.
 */
function mammothParts(files: Map<string, ZipEntry>) {
  const exists = (path: string) => files.get(path)?.dir === false;
  const reads = new Map<string, number>();
  const read = (path: string) => reads.set(path, (reads.get(path) ?? 0) + 1);
  const relationships = (path: string) => {
    read(path);
    if (!exists(path)) return new Map<string, string[]>();
    const content = inflate(files.get(path)!, MAX_RELS_BYTES);
    return content && relationshipTargets(content);
  };
  const find = (from: Map<string, string[]>, type: string, base: string, fallback: string) =>
    (from.get(RELATIONSHIP_TYPE + type) ?? [])
      .map((target) => joinPath(base, target).replace(/^\//, ""))
      .find(exists) ?? fallback;

  const packageRelationships = relationships("_rels/.rels");
  if (!packageRelationships) return null;
  const main = find(packageRelationships, "officeDocument", "", "word/document.xml");
  if (!exists(main)) return { main, reads };
  const related = relationships(relationshipsOf(main));
  if (!related) return null;
  const [base] = splitPath(main);
  const part = (name: string) => find(related, name, base!, `word/${name}.xml`);
  read(part("styles"));
  read(part("numbering"));
  for (const path of [...["footnotes", "endnotes", "comments"].map(part), main]) {
    read(relationshipsOf(path));
    read(path);
  }
  return { main, reads };
}

/**
 * Whether the whole archive expands to at most `MAX_DOCX_EXPANDED_BYTES`. Inflates every file
 * JSZip can give `mammoth` against what is left of the budget rather than trusting the sizes
 * the archive declares, which a bomb sets to whatever passes, and charges each part as many
 * times as `mammoth` reads it. An archive this reader cannot follow is refused, not left to
 * `mammoth`: what it could not measure, `mammoth` may still inflate in full.
 *
 * Entries whose data overlap — many headers naming one body, each inflated again — are refused
 * too: no writer produces them, and they would make this check cost more than the file.
 */
export function withinExpansionLimit(data: Uint8Array): boolean {
  const files = zipFiles(data);
  const parts = files && mammothParts(files);
  if (!files || !parts) return false;
  let left = MAX_DOCX_EXPANDED_BYTES;
  let input = data.byteLength;
  for (const entry of files.values()) {
    if (entry.dir || entry.size === 0) continue;
    input -= entry.body.length;
    if (input < 0) return false;
    const reads = Math.max(1, parts.reads.get(entry.key) ?? 0);
    const content = inflate(entry, Math.floor(left / reads));
    if (!content) return false;
    left -= content.length * reads;
  }
  return true;
}

function luminance(hex: string) {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

const isHex = (value: string | null | undefined): value is string =>
  !!value && /^[0-9a-f]{6}$/i.test(value);

/** Contrast against white below 1.25:1 — white, or a grey too pale to read. */
const nearWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05) < 1.25;

/** XML quotes an attribute with either `"` or `'`; a hand-edited file uses the second. */
const attr = (attrs: string, name: string) => {
  const match = new RegExp(`w:${name}=(?:"([^"]*)"|'([^']*)')`).exec(attrs);
  return match ? (match[1] ?? match[2]!) : null;
};

/**
 * The colour a `w:shd` paints. Its pattern (`w:val`) lays `w:color` over `w:fill`: "clear" is the
 * fill alone, "solid" the colour alone, "pctN" N% of the colour over the fill. Any other pattern,
 * or an "auto" colour under one, is "" — unknown, and white text on it is not judged.
 */
function shading(attrs: string): string | null {
  const pattern = attr(attrs, "val") ?? "clear";
  const fill = attr(attrs, "fill");
  const color = attr(attrs, "color");
  if (pattern === "nil") return null;
  if (pattern === "clear") return isHex(fill) ? fill : null;
  if (pattern === "solid") return isHex(color) ? color : "";
  const percent = /^pct(\d+)$/.exec(pattern);
  if (!percent || !isHex(color)) return "";
  const under = isHex(fill) ? fill : "FFFFFF";
  const share = Math.min(Number(percent[1]), 100) / 100;
  return [0, 2, 4]
    .map((at) => {
      const channel = (hex: string) => parseInt(hex.slice(at, at + 2), 16);
      const mixed = Math.round(channel(color) * share + channel(under) * (1 - share));
      return mixed.toString(16).padStart(2, "0");
    })
    .join("");
}

/**
 * Every pattern over the XML stops at the next `<` as well as `>`: XML allows neither inside a
 * tag, and `[^>]*` let each unclosed tag in a hostile file scan to the end of the document —
 * quadratic in the 8 MB this reader accepts, and worse where two such runs were nested.
 */
const TAG = /<(\/?)(w:[A-Za-z]+|wps:txbx|v:textbox)\b([^<>]*?)(\/?)>/g;
const EXTENT = /<wp:extent\b([^<>]*)>/g;

/** A drawing's printed size is in EMUs: 12,700 to the point. */
const EMU_PER_POINT = 12_700;
const PHOTO_MIN_POINTS = 50;

export type DocxMeasure = {
  hiddenChars: number;
  hiddenSample: string;
  /** Tables in the body, nested ones included: Word layouts built from tables extract out of order. */
  tableCount: number;
  /** Pictures printed at least 50pt a side — a photo, as for a PDF. */
  imageCount: number;
};

const MARKUP_OPEN = /<(?:!--|!\[CDATA\[|\?)/g;
const MARKUP_CLOSE = new Map([
  ["<!--", "-->"],
  ["<![CDATA[", "]]>"],
  ["<?", "?>"],
]);

/**
 * XML without its comments, processing instructions and CDATA markup, which an XML parser reads
 * as no elements: a tag written inside them is not one. A CDATA section's text stays, escaped as
 * the text around it is. One that never closes ends the document, as it ends what a parser
 * reads. Linear: each search starts where the last one ended.
 */
function withoutMarkup(xml: string): string {
  const kept: string[] = [];
  let at = 0;
  MARKUP_OPEN.lastIndex = 0;
  for (let match = MARKUP_OPEN.exec(xml); match; match = MARKUP_OPEN.exec(xml)) {
    kept.push(xml.slice(at, match.index));
    const start = match.index + match[0].length;
    const close = MARKUP_CLOSE.get(match[0])!;
    const end = xml.indexOf(close, start);
    if (end < 0) return kept.join("");
    if (match[0] === "<![CDATA[")
      kept.push(
        xml.slice(start, end).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
      );
    at = MARKUP_OPEN.lastIndex = end + close.length;
  }
  kept.push(xml.slice(at));
  return kept.join("");
}

/** A table being read; `outer` is what an unshaded cell of it shows, from the tables around it. */
type OpenTable = {
  styled: boolean;
  fill: string | null;
  cell: string | null;
  outer: string | null | undefined;
};

/**
 * The shading under text in `table` when its runs have none: its cell's, else its own, else —
 * unknown in a styled table — that of the tables around it. Undefined: none, the page shows.
 */
const underTable = (table: OpenTable | undefined): string | null | undefined =>
  table && (table.cell ?? table.fill ?? (table.styled ? null : table.outer));

export function measureDocx(data: Uint8Array): DocxMeasure | null {
  // The main document `mammoth` extracts, wherever the package's relationships put it.
  const files = zipFiles(data);
  const parts = files && mammothParts(files);
  const entry = parts && files.get(parts.main);
  const content = entry && !entry.dir ? inflate(entry, MAX_XML_BYTES) : null;
  if (!content?.length) return null;
  const xml = withoutMarkup(content.toString("utf8"));

  const tableCount = xml.match(/<w:tbl>|<w:tbl\s/g)?.length ?? 0;
  const imageCount = [...xml.matchAll(EXTENT)].filter(([, attrs]) =>
    [/\bcx=["'](\d+)["']/, /\bcy=["'](\d+)["']/].every(
      (size) => Number(size.exec(attrs)?.[1] ?? 0) / EMU_PER_POINT >= PHOTO_MIN_POINTS,
    ),
  ).length;

  // The page colour, when the document sets one and shows it.
  const page = /<w:background\b[^<>]*w:color=["']([0-9A-Fa-f]{6})["']/.exec(xml)?.[1] ?? "FFFFFF";
  // A shape anchored behind the text — a Word template's dark sidebar or header band — lies
  // under text this cannot place, so text on the bare page no longer has a known background.
  const behindText = /<wp:anchor\b[^<>]*\bbehindDoc=["'](?:1|true|on)["']/.test(xml);

  // One entry per open table: whether it names a table style, whose shading this does not read,
  // the shading its own properties give every cell, and the shading of its current cell. Kept per
  // table, not once: a table nested in a cell closes back into that cell, and a cell of its own
  // without shading shows the cell around it. Only the innermost table changes while it is open,
  // so what the tables around it show is taken once, when it opens: a run resolves its
  // background in constant time however deep the nesting.
  const tables: OpenTable[] = [];
  let paragraphFill: string | null = null;
  let inTextBox = 0;
  // The tracked formatting change (`w:rPrChange`, `w:pPrChange`, `w:tcPrChange`, …) being read:
  // the properties there are what the text looked like before the change, not what it looks
  // like. It ends with its own end tag, and at the latest where a run or paragraph opens, which
  // none holds: a change left open cannot hide the rest of the document.
  let change: string | null = null;
  let where: "table" | "cell" | "paragraph" | "run" | null = null;
  let run: {
    vanish: boolean;
    size: number | null;
    color: string | null;
    fill: string | null;
  } | null = null;
  let inText = false;
  let textStart = 0;
  let runText = "";
  const hidden: string[] = [];

  for (const match of xml.matchAll(TAG)) {
    const [, closing, tag, attrs, selfClosing] = match;
    const open = !closing;

    if (inText && closing && tag === "w:t") {
      runText += xml.slice(textStart, match.index);
      inText = false;
      continue;
    }

    if (open && !selfClosing && (tag === "w:r" || tag === "w:p")) change = null;
    if (/^w:\w+Pr(?:Ex)?Change$/.test(tag)) {
      if (open && !selfClosing) change ??= tag;
      else if (closing && tag === change) change = null;
    } else if (change) continue;
    else if (tag === "wps:txbx" || tag === "v:textbox") inTextBox += open ? 1 : -1;
    else if (tag === "w:tbl" && !selfClosing) {
      if (open)
        tables.push({ styled: false, fill: null, cell: null, outer: underTable(tables.at(-1)) });
      else tables.pop();
    } else if (tag === "w:tblStyle" && tables.length) tables[tables.length - 1].styled = true;
    else if (tag === "w:tc" && open && tables.length) tables[tables.length - 1].cell = null;
    else if (tag === "w:p" && open && !selfClosing) paragraphFill = null;
    else if (tag === "w:tblPr") where = open && !selfClosing ? "table" : null;
    else if (tag === "w:tcPr") where = open && !selfClosing ? "cell" : null;
    else if (tag === "w:pPr") where = open && !selfClosing ? "paragraph" : null;
    else if (tag === "w:rPr") where = open && !selfClosing ? "run" : null;
    else if (tag === "w:shd" || tag === "w:highlight") {
      // Shading is hex, or "" where its pattern leaves it unknown; a highlight is a named colour,
      // where only "white" leaves the page white.
      const value = tag === "w:highlight" ? attr(attrs, "val") : null;
      const colour =
        tag === "w:shd"
          ? shading(attrs)
          : value === "white"
            ? "FFFFFF"
            : value && value !== "none"
              ? "000000"
              : null;
      if (colour !== null) {
        if (where === "table" && tables.length) tables[tables.length - 1].fill = colour;
        else if (where === "cell" && tables.length) tables[tables.length - 1].cell = colour;
        else if (where === "paragraph") paragraphFill = colour;
        else if (where === "run" && run) run.fill = colour;
      }
    } else if (tag === "w:r" && open && !selfClosing) {
      run = { vanish: false, size: null, color: null, fill: null };
      runText = "";
    } else if (tag === "w:r" && closing && run) {
      // A cell without shading of its own shows its table's, and a table nested in a cell
      // without either shows that cell's, outwards. In a styled table with neither, the style
      // may shade the cell: unknown. So is the bare page under a shape behind the text.
      const underCell = underTable(tables.at(-1));
      const background =
        run.fill ??
        paragraphFill ??
        (underCell === undefined ? (behindText ? null : page) : underCell);
      const whiteOnWhite =
        !inTextBox &&
        isHex(run.color) &&
        nearWhite(run.color) &&
        isHex(background) &&
        nearWhite(background);
      const tiny = run.size !== null && run.size < 4;
      if (runText.trim() && (run.vanish || tiny || whiteOnWhite)) hidden.push(runText);
      run = null;
    } else if (run && where === "run") {
      if (tag === "w:vanish") run.vanish = !/^(?:0|false|off)$/.test(attr(attrs, "val") ?? "");
      else if (tag === "w:sz") run.size = Number(attr(attrs, "val")) || null;
      else if (tag === "w:color") run.color = attr(attrs, "val");
    } else if (tag === "w:t" && open && !selfClosing) {
      inText = true;
      textStart = match.index + match[0].length;
    }
  }

  const text = hidden.join(" ").replace(/\s+/g, " ").trim();
  const decoded = text.replace(
    /&(amp|lt|gt|quot|apos);/g,
    (_, entity: string) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" })[entity]!,
  );
  return {
    hiddenChars: decoded.replace(/\s/g, "").length,
    hiddenSample: decoded.slice(0, 80),
    tableCount,
    imageCount,
  };
}
