import { crc32, deflateRawSync } from "node:zlib";

/**
 * Minimal DOCX writer: one paragraph per line, stored (uncompressed) zip entries.
 *
 * Generated rather than checked in as a binary, for the same reason as `buildPdf`: what the test
 * asserts is visible in the test.
 */

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Stored entries by default; `deflate` compresses them, as Word does. */
function zip(files: Array<[name: string, content: string | Buffer]>, deflate = false): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const [name, content] of files) {
    const nameBytes = Buffer.from(name);
    const raw = Buffer.from(content);
    const data = deflate ? deflateRawSync(raw) : raw;
    const crc = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(deflate ? 8 : 0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    locals.push(local, nameBytes, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(deflate ? 8 : 0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);

    offset += local.length + nameBytes.length + data.length;
  }

  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

export function buildDocx(lines: string[]): Buffer {
  return buildDocxBody(
    lines.map((line) => `<w:p><w:r><w:t>${escapeXml(line)}</w:t></w:r></w:p>`).join(""),
  );
}

/**
 * A document from raw body XML, for formatting the line-per-paragraph writer cannot express.
 * `extra` adds archive entries beside the document, e.g. media.
 */
export function buildDocxBody(
  body: string,
  deflate = false,
  extra: Array<[name: string, content: string | Buffer]> = [],
): Buffer {
  return zip(
    [
      ["[Content_Types].xml", CONTENT_TYPES],
      ["_rels/.rels", RELS],
      ["word/document.xml", documentXml(body)],
      ...extra,
    ],
    deflate,
  );
}

/** `word/document.xml` around raw body XML, e.g. for a second entry of that name in `extra`. */
export function documentXml(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`;
}
