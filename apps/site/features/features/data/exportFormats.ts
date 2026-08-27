import type { ExportFormatItem } from "../types";

export const EXPORT_FORMATS: ExportFormatItem[] = [
  {
    ext: "PDF",
    name: "Vector PDF",
    desc: "Compiled client-side with selectable text and embedded fonts.",
    badge: "Most Popular",
  },
  {
    ext: "DOCX",
    name: "Microsoft Word",
    desc: "Native Word format for corporate recruiters and agency portals.",
    badge: "Recruiter Friendly",
  },
  {
    ext: "MD",
    name: "Markdown",
    desc: "Plaintext structured format for developer portfolios and READMEs.",
    badge: "Developer Favorite",
  },
  {
    ext: "HTML",
    name: "Clean HTML",
    desc: "Standalone semantic web format ready to embed anywhere.",
    badge: "Web Ready",
  },
  {
    ext: "JSON",
    name: "JSON Resume",
    desc: "Standardized JSON schema backup for portable career data.",
    badge: "Open Standard",
  },
  {
    ext: "TXT",
    name: "Plain Text",
    desc: "Clean ASCII text stream for simple legacy application forms.",
    badge: "Universal",
  },
];
