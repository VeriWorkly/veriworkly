export type TemplateDocumentType = "resume" | "cover-letter";

export type TemplateStatus = "available" | "planned";

export type TemplateDetailSection = {
  title: string;
  description: string;
  items: string[];
};

export type TemplateSummary = {
  id: string;
  editorTemplateId: string;
  legacyIds: string[];
  name: string;
  documentType: TemplateDocumentType;
  documentTypeLabel: string;
  description: string;
  shortDescription: string;
  accentColor: string;
  previewImage: string;
  tags: string[];
  family: string;
  layout: string;
  audience: string[];
  bestFor: string[];
  designVision: string;
  typography: string[];
  structure: TemplateDetailSection[];
  proofPoints: string[];
  seo: {
    title: string;
    description: string;
  };
};

export type DocumentTypeSummary = {
  id: TemplateDocumentType | "formal-letter" | "invoice" | "portfolio-website";
  label: string;
  pluralLabel: string;
  description: string;
  href: string;
  status: TemplateStatus;
  cta: string;
  seoTitle: string;
  seoDescription: string;
  highlights: string[];
};

export const documentTypeSummaries: DocumentTypeSummary[] = [
  {
    id: "resume",
    label: "Resume",
    pluralLabel: "Resume Templates",
    description:
      "ATS-safe resume systems with real PDF exports, recruiter-friendly hierarchy, and strong first-page scanning.",
    href: "/templates/resume",
    status: "available",
    cta: "Explore Resume Templates",
    seoTitle: "Free Resume Templates | ATS-Friendly Resume Designs",
    seoDescription:
      "Browse free, ATS-friendly resume templates for modern job applications. Compare structure, typography, layout, and target use cases.",
    highlights: ["ATS-aware layouts", "PDF-ready previews", "Recruiter scan paths"],
  },

  {
    id: "cover-letter",
    label: "Cover Letter",
    pluralLabel: "Cover Letter Templates",
    description:
      "Cover letter formats built for polished applications, clear intent, and consistent branding beside your resume.",
    href: "/templates/cover-letter",
    status: "available",
    cta: "Explore Cover Letters",
    seoTitle: "Free Cover Letter Templates | Professional Letter Designs",
    seoDescription:
      "Browse free cover letter templates with professional structure, letterhead treatments, and editor-ready layouts.",
    highlights: ["Letterhead systems", "Formal spacing", "Resume pairing"],
  },

  {
    id: "formal-letter",
    label: "Formal Letter",
    pluralLabel: "Formal Letter Templates",
    description:
      "Business letters, recommendations, notices, and structured correspondence templates are planned next.",
    href: "/templates/formal-letter",
    status: "planned",
    cta: "Planned",
    seoTitle: "Formal Letter Templates | VeriWorkly",
    seoDescription: "Formal letter templates are planned for VeriWorkly.",
    highlights: ["Business correspondence", "Printable formats", "Reusable identity blocks"],
  },

  {
    id: "invoice",
    label: "Invoice",
    pluralLabel: "Invoice Templates",
    description:
      "Clean invoice templates for freelancers and operators are planned for future document workflows.",
    href: "/templates/invoice",
    status: "planned",
    cta: "Planned",
    seoTitle: "Invoice Templates | VeriWorkly",
    seoDescription: "Invoice templates are planned for VeriWorkly.",
    highlights: ["Line items", "Payment details", "Client-ready export"],
  },

  {
    id: "portfolio-website",
    label: "Portfolio Website",
    pluralLabel: "Portfolio Website Templates",
    description:
      "Website templates for personal portfolios are coming soon. Fill information, publish portfolio site, and share it.",
    href: "/templates/portfolio-website",
    status: "planned",
    cta: "Coming soon",
    seoTitle: "Portfolio Website Templates | VeriWorkly",
    seoDescription:
      "Portfolio website templates are coming soon for VeriWorkly, with hosted subdomain publishing.",
    highlights: ["Hosted subdomain", "Project sections", "Public website"],
  },
];

export const templateSummaries: TemplateSummary[] = [
  {
    id: "resume-executive-clarity",
    editorTemplateId: "executive-clarity",
    legacyIds: ["executive-clarity"],
    name: "Executive Clarity",
    documentType: "resume",
    documentTypeLabel: "Resume",
    description:
      "A polished single-column resume with refined spacing, strong section rhythm, and ATS-safe structure. Ideal for experienced professionals who need authority without visual noise.",
    shortDescription:
      "Executive-grade spacing and hierarchy for a calm, senior resume presentation.",
    accentColor: "#0ea5e9",
    previewImage: "/templates/resume/executive-clarity.png",
    tags: ["One column", "ATS-friendly", "Modern", "Professional"],
    family: "Modern Core",
    layout: "One column",
    audience: ["Senior individual contributors", "Managers", "Consultants", "Operators"],
    bestFor: [
      "Career stories where judgment and scope matter more than visual flash.",
      "Applications where the first page needs to feel composed, current, and easy to skim.",
      "Professionals who want a modern resume without risky columns or decorative parsing traps.",
    ],
    designVision:
      "Executive Clarity treats the resume like a high-trust business document: measured whitespace, a confident name block, and section rhythm that lets senior accomplishments breathe.",
    typography: [
      "Large identity block for immediate name recognition.",
      "Quiet section labels that create rhythm without shouting.",
      "Comfortable body measure for accomplishment bullets and leadership context.",
    ],
    structure: [
      {
        title: "Opening Scan",
        description:
          "The top band prioritizes identity, contact context, and a concise professional summary.",
        items: [
          "Name-led hierarchy",
          "Contact line kept readable",
          "Summary placed before dense history",
        ],
      },
      {
        title: "Experience Core",
        description:
          "Role entries use steady spacing so outcomes, ownership, and business scope can be compared quickly.",
        items: [
          "Single-column flow",
          "Clear date alignment",
          "Bullet rhythm for measurable outcomes",
        ],
      },
      {
        title: "Supporting Proof",
        description:
          "Education and skills stay compact, letting the strongest work history carry the document.",
        items: ["Compact skill groups", "ATS-readable text", "No fragile graphical meters"],
      },
    ],
    proofPoints: [
      "Best when your resume needs to feel senior, calm, and editorially controlled.",
      "Keeps every important section in a predictable order for recruiters and parsers.",
      "Pairs well with the Professional cover letter template for conservative applications.",
    ],
    seo: {
      title: "Executive Clarity Resume Template | ATS-Friendly Senior Resume",
      description:
        "Use the Executive Clarity resume template for senior, management, consulting, and professional resumes that need a polished ATS-safe layout.",
    },
  },

  {
    id: "resume-precision-ats",
    editorTemplateId: "precision-ats",
    legacyIds: ["precision-ats"],
    name: "Precision ATS",
    documentType: "resume",
    documentTypeLabel: "Resume",
    description:
      "A dense, recruiter-friendly layout for longer resumes that still exports as a real matching PDF. Built for clarity, parsing accuracy, and fast comparison.",
    shortDescription: "A compact ATS-first resume for detailed histories and high-signal bullets.",
    accentColor: "#10b981",
    previewImage: "/templates/resume/precision-ats.png",
    tags: ["One column", "ATS-friendly", "Compact", "Simple"],
    family: "Compact Core",
    layout: "One column",
    audience: ["Engineers", "Analysts", "Technical specialists", "Multi-role professionals"],
    bestFor: [
      "Longer work histories that still need to fit into a controlled page count.",
      "Keyword-sensitive applications where parsing accuracy matters.",
      "Candidates who want structure and density without a visually crowded result.",
    ],
    designVision:
      "Precision ATS is built like a disciplined index of evidence: tight vertical rhythm, clear headings, and very little ornamentation between the recruiter and the facts.",
    typography: [
      "Compact heading scale to preserve vertical space.",
      "Readable bullet density for technical achievements.",
      "Minimal accent usage so keywords and outcomes remain the focus.",
    ],
    structure: [
      {
        title: "Dense Header",
        description:
          "Contact and identity details stay compact so the work history starts quickly.",
        items: [
          "Space-efficient contact line",
          "Small accent surface",
          "No image or sidebar dependency",
        ],
      },
      {
        title: "ATS Work History",
        description:
          "The body is optimized for readable chronology, strong keyword placement, and clean export text.",
        items: ["Chronological role blocks", "Parser-safe bullets", "Consistent date treatment"],
      },
      {
        title: "Skill Compression",
        description:
          "Skills and education remain compact enough to support longer experience sections.",
        items: ["Grouped skills", "Short education rows", "Simple section dividers"],
      },
    ],
    proofPoints: [
      "Best when every line needs to earn its place.",
      "Keeps formatting conservative for applicant tracking systems.",
      "Strong fit for technical resumes with many tools, projects, and measurable results.",
    ],
    seo: {
      title: "Precision ATS Resume Template | Compact ATS Resume Format",
      description:
        "Use the Precision ATS resume template for compact, keyword-friendly resumes that prioritize clean parsing and recruiter readability.",
    },
  },

  {
    id: "cover-letter-professional",
    editorTemplateId: "professional",
    legacyIds: ["professional"],
    name: "Professional",
    documentType: "cover-letter",
    documentTypeLabel: "Cover Letter",
    description:
      "A formal cover letter with a strong letterhead, conservative spacing, and a recruiter-safe structure for direct, polished applications.",
    shortDescription: "A formal letterhead layout for conservative, high-trust applications.",
    accentColor: "#0ea5e9",
    previewImage: "/templates/cover-letter/professional.png",
    tags: ["Formal", "Professional", "Conservative", "Recruiter-friendly"],
    family: "Classic Letter",
    layout: "One column",
    audience: [
      "Corporate applicants",
      "Graduate candidates",
      "Operations roles",
      "Public-sector roles",
    ],
    bestFor: [
      "Applications where tone, clarity, and restraint matter.",
      "Pairing with an ATS-friendly resume without changing visual language.",
      "Cover letters that need to look credible when exported as a standalone PDF.",
    ],
    designVision:
      "Professional keeps the letter unmistakably formal while giving the sender identity enough presence to feel intentional rather than generic.",
    typography: [
      "Clear sender block for letterhead authority.",
      "Readable paragraph spacing for hiring-manager review.",
      "Conservative heading weight that avoids over-branding.",
    ],
    structure: [
      {
        title: "Letterhead",
        description: "The top block frames the sender and recipient before the letter begins.",
        items: ["Sender identity", "Recipient context", "Date and subject treatment"],
      },
      {
        title: "Body Flow",
        description: "Paragraph spacing keeps motivation, fit, and proof points easy to follow.",
        items: ["Formal greeting", "Readable body paragraphs", "Controlled closing block"],
      },
      {
        title: "Export Shape",
        description:
          "The design stays printable and professional across PDF export and browser preview.",
        items: ["No fragile overlays", "Letter-sized composition", "Recruiter-safe contrast"],
      },
    ],
    proofPoints: [
      "Best when the letter should feel established and serious.",
      "Useful for applications where a highly designed letter would feel out of place.",
      "Pairs well with Precision ATS for a clean, conservative application set.",
    ],
    seo: {
      title: "Professional Cover Letter Template | Formal Letterhead Design",
      description:
        "Use the Professional cover letter template for formal applications with a clean letterhead, readable body structure, and PDF-ready layout.",
    },
  },

  {
    id: "cover-letter-veriworkly-special",
    editorTemplateId: "veriworkly-special",
    legacyIds: ["veriworkly-special"],
    name: "VeriWorkly Special",
    documentType: "cover-letter",
    documentTypeLabel: "Cover Letter",
    description:
      "A branded two-column cover letter with an identity rail and numbered proof points for applicants who want a more distinctive application page.",
    shortDescription: "A branded cover letter with an identity rail and structured proof points.",
    accentColor: "#2563eb",
    previewImage: "/templates/cover-letter/veriworkly-special.png",
    tags: ["Branded", "Two-column", "Identity rail", "Distinctive"],
    family: "Branded Letter",
    layout: "Two column",
    audience: [
      "Product builders",
      "Design-minded candidates",
      "Startup applicants",
      "Portfolio-led roles",
    ],
    bestFor: [
      "Applications where tasteful distinctiveness is an advantage.",
      "Candidates who want a letter that visually aligns with a modern resume.",
      "Cover letters that benefit from highlighted proof points beside the main narrative.",
    ],
    designVision:
      "VeriWorkly Special turns the cover letter into a composed application page: identity on the rail, narrative in the body, and proof points placed where they can be scanned.",
    typography: [
      "Prominent sender identity for a strong first impression.",
      "Balanced paragraph width for human reading.",
      "Numbered proof markers that add structure without becoming decorative clutter.",
    ],
    structure: [
      {
        title: "Identity Rail",
        description:
          "A side rail keeps contact details and applicant identity visible without crowding the body.",
        items: ["Name and role rail", "Contact grouping", "Accent-led section rhythm"],
      },
      {
        title: "Narrative Column",
        description:
          "The main column gives the letter a conventional reading path with a modern page feel.",
        items: ["Subject emphasis", "Readable paragraphs", "Clear closing and signature"],
      },
      {
        title: "Proof Points",
        description:
          "Highlights are shaped for scanning, helping the letter carry evidence as well as intent.",
        items: ["Numbered highlights", "Visual separation", "PDF-ready composition"],
      },
    ],
    proofPoints: [
      "Best when you want the cover letter to feel crafted, not default.",
      "Helps product, design, and startup candidates show taste without sacrificing readability.",
      "Pairs well with Executive Clarity for a polished modern application set.",
    ],
    seo: {
      title: "VeriWorkly Special Cover Letter Template | Branded Application Letter",
      description:
        "Use the VeriWorkly Special cover letter template for a branded two-column application letter with identity rail and structured proof points.",
    },
  },
];

export function getDocumentTypeSummary(docType: string): DocumentTypeSummary | undefined {
  return documentTypeSummaries.find((type) => type.id === docType);
}

export function getTemplatesByDocumentType(docType: string): TemplateSummary[] {
  return templateSummaries.filter((template) => template.documentType === docType);
}

export function getTemplateById(id: string): TemplateSummary | undefined {
  return templateSummaries.find((template) => template.id === id);
}

export function getTemplateByDocumentTypeAndId(
  docType: string,
  id: string,
): TemplateSummary | undefined {
  return templateSummaries.find(
    (template) => template.documentType === docType && template.id === id,
  );
}

export function getTemplateByLegacyId(id: string): TemplateSummary | undefined {
  return templateSummaries.find((template) => template.legacyIds.includes(id));
}
