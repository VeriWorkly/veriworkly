import * as LucideIcons from "lucide-react";
import { FileText, type LucideIcon } from "lucide-react";

import type { DocumentType } from "./document-types";

import { getDocumentDefinition } from "./registry";

export function getDocumentIcon(type: DocumentType): LucideIcon {
  const iconName = getDocumentDefinition(type).icon;
  const icon = (LucideIcons as unknown as Record<string, LucideIcon | undefined>)[iconName];

  return icon ?? FileText;
}
