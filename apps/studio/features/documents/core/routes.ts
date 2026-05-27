import { isDocumentType, type DocumentType } from "./document-types";

export function getDocumentRouteSegment(type: DocumentType) {
  return type.toLowerCase().replaceAll("_", "-");
}

export function parseDocumentRouteSegment(value: string): DocumentType | null {
  const normalized = value.replaceAll("-", "_").toUpperCase();

  return isDocumentType(normalized) ? normalized : null;
}

export function getDocumentEditorPath(type: DocumentType, id: string) {
  return `/editor/${getDocumentRouteSegment(type)}/${id}`;
}

export function getDocumentPreviewPath(type: DocumentType, id: string) {
  return `${getDocumentEditorPath(type, id)}/preview`;
}
