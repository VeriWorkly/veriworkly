import { describe, expect, it } from "vitest";

import {
  getDocumentEditorPath,
  getDocumentRouteSegment,
  parseDocumentRouteSegment,
} from "@/features/documents/core/routes";

describe("document routes", () => {
  it("uses stable route segments for document types with underscores", () => {
    expect(getDocumentRouteSegment("COVER_LETTER")).toBe("cover-letter");
    expect(getDocumentEditorPath("COVER_LETTER", "doc-1")).toBe("/editor/cover-letter/doc-1");
  });

  it("parses hyphen and underscore route segments", () => {
    expect(parseDocumentRouteSegment("cover-letter")).toBe("COVER_LETTER");
    expect(parseDocumentRouteSegment("cover_letter")).toBe("COVER_LETTER");
    expect(parseDocumentRouteSegment("resume")).toBe("RESUME");
  });

  it("rejects unknown route segments", () => {
    expect(parseDocumentRouteSegment("unknown-document")).toBeNull();
  });
});
