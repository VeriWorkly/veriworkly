import { inflateRawSync } from "node:zlib";

/** Every file inside a .docx (a zip), decoded as text. Reads the central directory. */
export async function unzipDocx(blob: Blob): Promise<Map<string, string>> {
  const bytes = Buffer.from(await blob.arrayBuffer());
  const files = new Map<string, string>();
  const end = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let entry = bytes.readUInt32LE(end + 16);

  for (let count = bytes.readUInt16LE(end + 10); count > 0; count -= 1) {
    const method = bytes.readUInt16LE(entry + 10);
    const size = bytes.readUInt32LE(entry + 20);
    const nameLength = bytes.readUInt16LE(entry + 28);
    const extraLength = bytes.readUInt16LE(entry + 30);
    const commentLength = bytes.readUInt16LE(entry + 32);
    const local = bytes.readUInt32LE(entry + 42);
    const name = bytes.toString("utf8", entry + 46, entry + 46 + nameLength);
    const dataStart = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
    const data = bytes.subarray(dataStart, dataStart + size);

    files.set(name, (method === 8 ? inflateRawSync(data) : data).toString("utf8"));
    entry += 46 + nameLength + extraLength + commentLength;
  }

  return files;
}

/** The section page size Word reads from `word/document.xml`, in twips. */
export async function docxPageSize(blob: Blob): Promise<{ width: number; height: number }> {
  const xml = (await unzipDocx(blob)).get("word/document.xml") ?? "";
  const pgSz = xml.match(/<w:pgSz\b[^>]*>/)?.[0] ?? "";

  return {
    width: Number(pgSz.match(/w:w="(\d+)"/)?.[1]),
    height: Number(pgSz.match(/w:h="(\d+)"/)?.[1]),
  };
}
