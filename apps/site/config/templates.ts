export type TemplateDocumentType = "resume" | "cover-letter" | "portfolio-website";

export type TemplateStatus = "available" | "planned";

export type TemplateDetailSection = {
  title: string;
  description: string;
  items: string[];
};

export type TemplateSummary = {
  id: string;
  editorTemplateId: string;
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
      "ATS-safe AI resume systems with real PDF exports, recruiter-friendly hierarchy, and built-in AI resume tailoring.",
    href: "/templates/resume",
    status: "available",
    cta: "Explore Resume Templates",
    seoTitle: "Free AI Resume Templates | ATS-Friendly Resume Designs",
    seoDescription:
      "Browse free, ATS-friendly AI resume templates. Compare structures, and use our built-in privacy-first AI to tailor your resume for any job description.",
    highlights: ["ATS-aware layouts", "Privacy-first AI tailoring", "PDF-ready previews"],
  },

  {
    id: "cover-letter",
    label: "Cover Letter",
    pluralLabel: "Cover Letter Templates",
    description:
      "Cover letter formats built for polished applications, customized instantly with our privacy-first AI cover letter generator.",
    href: "/templates/cover-letter",
    status: "available",
    cta: "Explore Cover Letters",
    seoTitle: "Free AI Cover Letter Templates | Professional AI Writer",
    seoDescription:
      "Browse free cover letter templates and generate personalized cover letters with our built-in AI writing assistant.",
    highlights: ["AI cover letter generator", "Formal spacing", "Resume pairing"],
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
      "Live website templates for personal portfolios. Generate portfolio copy with AI, customize design layouts, and publish on a subdomain.",
    href: "/templates/portfolio-website",
    status: "available",
    cta: "Explore Portfolio Templates",
    seoTitle: "AI Portfolio Website Templates | VeriWorkly",
    seoDescription:
      "Browse VeriWorkly portfolio website templates with built-in AI copywriting support, hosted subdomain publishing, and live previews.",
    highlights: ["AI portfolio copywriter", "Hosted subdomain", "Live website previews"],
  },
];

export const templateSummaries: TemplateSummary[] = [
  {
    id: "portfolio-signal",
    editorTemplateId: "signal",
    name: "Signal",
    documentType: "portfolio-website",
    documentTypeLabel: "Portfolio Website",
    description:
      "A sharp, proof-first portfolio website for builders, product engineers, and founders who want their work to feel credible quickly.",
    shortDescription:
      "A structured public portfolio for project proof, technical credibility, and clear contact intent.",
    accentColor: "#2563eb",
    previewImage: "/veriworkly-logo.png",
    tags: ["Website", "Subdomain", "Project proof", "Builder"],
    family: "Portfolio Websites",
    layout: "Live site",
    audience: ["Product builders", "Engineers", "Founders", "Independent operators"],
    bestFor: [
      "Publishing a professional portfolio from one reusable profile.",
      "Showing selected work, experience, writing, and contact details without code.",
      "Builders who want a clean subdomain and metadata controls.",
    ],
    designVision:
      "Signal treats a portfolio like an evidence system: crisp hierarchy, fast project scanning, and a strong path from proof to contact.",
    typography: [
      "Large identity section for immediate recognition.",
      "Structured project cards for proof-first reading.",
      "Compact metadata rhythm for quick evaluation.",
    ],
    structure: [
      {
        title: "Identity and proof",
        description: "The opening area explains who the builder is and why the work matters.",
        items: ["Name and headline", "Availability", "Social links"],
      },
      {
        title: "Selected work",
        description: "Projects are shaped for quick scanning and deeper review.",
        items: ["Project summaries", "Tags", "External links"],
      },
      {
        title: "Publish controls",
        description: "The same content can be published with subdomain and SEO settings.",
        items: ["Subdomain", "Meta title", "Social description"],
      },
    ],
    proofPoints: [
      "Best for builders who need credibility before decorative flourish.",
      "Strong fit for Gautam Raj style founder and product-builder portfolios.",
      "Live preview available through the portfolio app template route.",
    ],
    seo: {
      title: "Signal AI Portfolio Template | VeriWorkly Personal Website",
      description:
        "Use the Signal template and privacy-first AI copywriter to publish a proof-first professional portfolio on a VeriWorkly subdomain.",
    },
  },

  {
    id: "portfolio-atelier",
    editorTemplateId: "atelier",
    name: "Atelier",
    documentType: "portfolio-website",
    documentTypeLabel: "Portfolio Website",
    description:
      "An editorial portfolio website for creative builders who want warmer storytelling without rebuilding their content.",
    shortDescription:
      "An expressive portfolio website direction for narrative work, case studies, and personal positioning.",
    accentColor: "#2563eb",
    previewImage: "/veriworkly-logo.png",
    tags: ["Website", "Editorial", "Template switching", "Creative"],
    family: "Portfolio Websites",
    layout: "Live site",
    audience: ["Designers", "Creative builders", "Consultants", "Product storytellers"],
    bestFor: [
      "Presenting work with a stronger editorial voice.",
      "Switching the portfolio mood while preserving the same data.",
      "Creators who want a public website without maintaining a custom site.",
    ],
    designVision:
      "Atelier makes the same portfolio data feel more narrative and personal, with a warmer rhythm for work that benefits from story.",
    typography: [
      "Editorial title scale for stronger first impression.",
      "Warmer section pacing for project narratives.",
      "Flexible content blocks that still come from one form.",
    ],
    structure: [
      {
        title: "Personal introduction",
        description: "The hero frames the builder with a warmer voice and clear position.",
        items: ["Name", "Story", "Availability"],
      },
      {
        title: "Narrative work",
        description: "Projects and writing can breathe without losing structure.",
        items: ["Case studies", "Notes", "Testimonials"],
      },
      {
        title: "Reusable content",
        description: "Template switching preserves content, links, and metadata.",
        items: ["One profile", "Live previews", "Subdomain publish"],
      },
    ],
    proofPoints: [
      "Best for portfolios where taste and story help sell the work.",
      "Useful when a builder wants a more expressive website without hand-designing one.",
      "Pairs with the same portfolio editor data used by Signal.",
    ],
    seo: {
      title: "Atelier AI Portfolio Template | VeriWorkly Editorial Website",
      description:
        "Use the Atelier template and built-in AI copywriting tools to create an editorial personal portfolio with hosted publishing.",
    },
  },

  {
    id: "resume-executive-clarity",
    editorTemplateId: "executive-clarity",
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
      title: "Executive Clarity AI Resume Template | ATS-Friendly Senior Resume",
      description:
        "Use the Executive Clarity resume template and AI tailoring tools for senior, management, and consulting resumes that need a polished ATS-safe layout.",
    },
  },

  {
    id: "resume-precision-ats",
    editorTemplateId: "precision-ats",
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
      title: "Precision ATS AI Resume Template | Compact ATS Resume Format",
      description:
        "Use the Precision ATS resume template with AI keyword optimization to create a compact, parser-safe resume that targets specific jobs.",
    },
  },

  {
    id: "cover-letter-professional",
    editorTemplateId: "professional",
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
      title: "Professional AI Cover Letter Template | Formal Letterhead Design",
      description:
        "Use the Professional cover letter template and AI writer to generate polished formal job applications with a matching letterhead.",
    },
  },

  {
    id: "cover-letter-veriworkly-special",
    editorTemplateId: "veriworkly-special",
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
      title: "VeriWorkly Special AI Cover Letter Template | Branded Application",
      description:
        "Use the VeriWorkly Special cover letter template and AI generation tools for a distinctive, two-column job application letter.",
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
