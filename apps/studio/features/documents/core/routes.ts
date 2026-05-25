import type { DocumentType } from "./document-types";

export function getDocumentEditorPath(type: DocumentType, id: string) {
  return `/editor/${type.toLowerCase()}/${id}`;
}

export function getDocumentPreviewPath(type: DocumentType, id: string) {
  return `${getDocumentEditorPath(type, id)}/preview`;
}
