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
    previewImage: "/templates/portfolio/signal.png",
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
    previewImage: "/templates/portfolio/atelier.png",
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
    id: "portfolio-nimbus",
    editorTemplateId: "nimbus",
    name: "Nimbus",
    documentType: "portfolio-website",
    documentTypeLabel: "Portfolio Website",
    description:
      "A precise, proof-first developer portfolio with an atmospheric mint-emerald / electric-amber aesthetic, featuring bento mouse-glow, text scramble interactions, and GSAP motion.",
    shortDescription:
      "An atmospheric brutalist-editorial developer portfolio with magnetic interactions and text scramble effects.",
    accentColor: "#ffe566",
    previewImage: "/templates/portfolio/nimbus.png",
    tags: ["Website", "Subdomain", "Brutalist", "GSAP Motion", "Interactive"],
    family: "Portfolio Websites",
    layout: "Live site",
    audience: [
      "Full-stack engineers",
      "Frontend developers",
      "Creative-tech engineers",
      "UI/UX engineers",
    ],
    bestFor: [
      "Developers who want to stand out from generic glassmorphism portfolios.",
      "Engineers and creators who appreciate high-craft typography and kinetic text interactions.",
      "Applications to editorial, creative-tech, or high-craft product studios.",
    ],
    designVision:
      "Nimbus treats the portfolio as a printed broadsheet: oversized typography, zero cards or shadows, split-section entrance reveals, and kinetic text scramble interactions that signal craft.",
    typography: [
      "Fraunces variable serif for high-contrast display headlines.",
      "DM Mono for metadata, indexes, and technical labels.",
      "Oversized hero index numbers and full-bleed marquee ticker pacing.",
    ],
    structure: [
      {
        title: "Hero and marquee ticker",
        description: "Atmospheric introduction with a full-bleed inverted marquee ticker band.",
        items: ["Headline & availability", "Oversized bio split", "Full-bleed marquee ticker"],
      },
      {
        title: "Accordion projects & tag cloud",
        description: "Projects expand as accordion rows alongside a free-flowing skill tag cloud.",
        items: ["Accordion project list", "Oversized ambient index numbers", "Tag cloud"],
      },
      {
        title: "Table experience & contact band",
        description:
          "Clean table-style experience timeline ending with a full-width amber call to action.",
        items: ["Table timeline", "Hover highlights", "Full-width contact band"],
      },
    ],
    proofPoints: [
      "Built for developers who value typography and micro-interactions over generic templates.",
      "Features text-scramble, magnetic spring CTAs, and a trailing cursor ring.",
      "Live preview available through the portfolio app template route.",
    ],
    seo: {
      title: "Nimbus AI Portfolio Template | VeriWorkly Editorial Developer Website",
      description:
        "Use the Nimbus template and privacy-first AI copywriter to publish a brutalist-editorial developer portfolio with kinetic typography on a VeriWorkly subdomain.",
    },
  },

  {
    id: "portfolio-cipher",
    editorTemplateId: "cipher",
    name: "Cipher",
    documentType: "portfolio-website",
    documentTypeLabel: "Portfolio Website",
    description:
      "A fully interactive, cold-boot CLI terminal emulator featuring a command tab rail, live autocomplete, draggable OS window, and a matrix-rain Easter egg.",
    shortDescription:
      "An interactive cold-boot CLI terminal emulator portfolio for systems engineers and developers.",
    accentColor: "#6dffb0",
    previewImage: "/templates/portfolio/cipher.png",
    tags: ["Website", "Terminal CLI", "Interactive", "Developer", "Subdomain"],
    family: "Portfolio Websites",
    layout: "Live site",
    audience: ["Systems engineers", "Security researchers", "DevOps & SREs", "Backend developers"],
    bestFor: [
      "Developers who want a memorable, hands-on interactive console for recruiters.",
      "Systems, security, and DevOps engineers demonstrating authentic terminal credibility.",
      "Anyone wanting their portfolio to demonstrate technical craft rather than static resume copy.",
    ],
    designVision:
      "Cipher transforms your portfolio into an interactive cold-boot console window with real typed commands, tab shortcuts, phosphor green CRT contrast, and matrix Easter eggs.",
    typography: [
      "JetBrains Mono for complete terminal visual fidelity.",
      "ASCII banner headings and prompt string hierarchy.",
      "High-contrast CRT green-on-black with paper terminal light mode option.",
    ],
    structure: [
      {
        title: "Boot sequence and prompt",
        description: "Glitch-reveal ASCII header and staggered kernel boot sequence.",
        items: ["ASCII banner", "Boot lines", "Interactive command prompt"],
      },
      {
        title: "Command-driven tabs and navigation",
        description: "Tabs and icon rail bind 1:1 to executable shell commands.",
        items: ["Tab shortcuts", "Autocomplete chips", "Command output pane"],
      },
      {
        title: "Interactive controls and Easter eggs",
        description: "Draggable window frame with light/dark CRT themes and secret matrix mode.",
        items: ["Draggable window chrome", "Matrix rain toggle", "Paper terminal theme"],
      },
    ],
    proofPoints: [
      "First-class CLI emulator with full keyboard and mobile touch support.",
      "Every tab maps directly to typed commands like 'projects', 'about', and 'skills'.",
      "Live preview available through the portfolio app template route.",
    ],
    seo: {
      title: "Cipher AI Portfolio Template | VeriWorkly Interactive Terminal Website",
      description:
        "Use the Cipher template to publish an interactive CLI terminal portfolio with real commands and autocomplete on a VeriWorkly subdomain.",
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
    id: "resume-modern-minimal",
    editorTemplateId: "modern-minimal",
    name: "Modern Minimal",
    documentType: "resume",
    documentTypeLabel: "Resume",
    description:
      "A quiet, rule-free resume with generous whitespace and small uppercase section labels, so the writing carries the page instead of the styling.",
    shortDescription: "Whitespace-led minimalism for resumes that let the writing lead.",
    accentColor: "#6366f1",
    previewImage: "/templates/resume/modern-minimal.svg",
    tags: ["One column", "ATS-friendly", "Minimal", "Whitespace"],
    family: "Modern Core",
    layout: "One column",
    audience: ["Designers", "Writers", "Researchers", "Early-career professionals"],
    bestFor: [
      "Shorter histories where empty space reads as confidence rather than absence.",
      "Roles judged on craft and clarity of thought.",
      "Candidates who dislike heavy borders, boxes, and dividers.",
    ],
    designVision:
      "Modern Minimal removes every rule and container it can, then spends the recovered space on breathing room between sections so the eye is guided by rhythm instead of lines.",
    typography: [
      "Understated name block with tightened letterspacing.",
      "Small uppercase accent labels that mark sections without dividing the page.",
      "Comfortable body measure tuned for narrative bullets.",
    ],
    structure: [
      {
        title: "Quiet Masthead",
        description:
          "Name, headline, and contact sit flush left with no rule underneath, opening the page calmly.",
        items: ["Flush-left identity", "Single contact line", "No header borders"],
      },
      {
        title: "Label-Led Sections",
        description:
          "Each section is announced by a small accent label, keeping the vertical flow uninterrupted.",
        items: ["Uppercase micro-labels", "Wide section spacing", "No dividers"],
      },
      {
        title: "Open Body",
        description:
          "Items rely on spacing rather than boxes, which keeps the export text clean for parsers.",
        items: ["Airy item gaps", "Plain-text bullets", "Parser-safe structure"],
      },
    ],
    proofPoints: [
      "Best when the resume is short enough that whitespace becomes an asset.",
      "Keeps the page free of graphical elements that confuse applicant tracking systems.",
      "Pairs well with the Professional cover letter for a restrained application set.",
    ],
    seo: {
      title: "Modern Minimal AI Resume Template | Clean Minimalist Resume",
      description:
        "Use the Modern Minimal resume template and AI tailoring to build a clean, whitespace-led resume that stays ATS-friendly.",
    },
  },

  {
    id: "resume-timeline-focus",
    editorTemplateId: "timeline-focus",
    name: "Timeline Focus",
    documentType: "resume",
    documentTypeLabel: "Resume",
    description:
      "Dates sit in a fixed left column so a recruiter can scan an entire career chronology in one pass, with the narrative kept in a clean right-hand measure.",
    shortDescription: "A date-gutter layout built for scanning career chronology fast.",
    accentColor: "#0f766e",
    previewImage: "/templates/resume/timeline-focus.svg",
    tags: ["One column", "ATS-friendly", "Date gutter", "Chronological"],
    family: "Structured Core",
    layout: "One column with date gutter",
    audience: ["Long-tenure professionals", "Operators", "Public sector", "Academics"],
    bestFor: [
      "Careers where continuity and tenure length are part of the argument.",
      "Applications reviewed by humans who scan dates before titles.",
      "Histories with many roles inside the same organisation.",
    ],
    designVision:
      "Timeline Focus separates when from what: a narrow left gutter carries every date range, leaving the right column free to hold titles, context, and outcomes at a consistent measure.",
    typography: [
      "Dates set quietly in the gutter so they never compete with role titles.",
      "Section labels paired with a trailing hairline for a steady horizon.",
      "Consistent right-column measure across every section.",
    ],
    structure: [
      {
        title: "Anchored Header",
        description:
          "Identity and contact details sit above an accent rule that sets the page's baseline.",
        items: ["Name-led identity", "Inline contact row", "Accent baseline rule"],
      },
      {
        title: "Date Gutter",
        description:
          "Every dated item repeats the same left column, making the chronology readable top to bottom.",
        items: ["Fixed date column", "Aligned role titles", "Uniform item rhythm"],
      },
      {
        title: "Narrative Column",
        description:
          "Context, summaries, and bullets stay in one measure so long histories remain comfortable to read.",
        items: ["Single reading measure", "Plain-text bullets", "Predictable export order"],
      },
    ],
    proofPoints: [
      "Best when a reviewer needs to verify continuity quickly.",
      "Keeps dates and titles visually separated without using a sidebar.",
      "Strong fit for resumes that run to two pages or more.",
    ],
    seo: {
      title: "Timeline Focus AI Resume Template | Chronological Resume Layout",
      description:
        "Use the Timeline Focus resume template with AI tailoring to present a scannable, date-anchored career chronology that stays ATS-safe.",
    },
  },

  {
    id: "resume-corporate-brief",
    editorTemplateId: "corporate-brief",
    name: "Corporate Brief",
    documentType: "resume",
    documentTypeLabel: "Resume",
    description:
      "A split letterhead puts identity on the left and contact details on the right, with accent-barred section headings that read like an internal business brief.",
    shortDescription: "A letterhead-style resume with split header and barred headings.",
    accentColor: "#1d4ed8",
    previewImage: "/templates/resume/corporate-brief.svg",
    tags: ["One column", "ATS-friendly", "Letterhead", "Corporate"],
    family: "Business Core",
    layout: "One column with split header",
    audience: ["Finance", "Consulting", "Legal", "Corporate functions"],
    bestFor: [
      "Conservative industries where a document should look institutional.",
      "Applications submitted alongside formal letters and briefs.",
      "Candidates who want structure without a decorative or trendy feel.",
    ],
    designVision:
      "Corporate Brief borrows the letterhead convention: identity anchors the left, contact details settle to the right, and short accent bars mark each section like a well-formatted internal memo.",
    typography: [
      "Compact masthead that leaves more of page one for content.",
      "Right-aligned contact stack for a formal letterhead balance.",
      "Accent-bar section markers with restrained letterspacing.",
    ],
    structure: [
      {
        title: "Split Letterhead",
        description:
          "Name and title sit left, contact details right, closed by a single hairline rule.",
        items: ["Two-part header", "Right-aligned contact stack", "Hairline close"],
      },
      {
        title: "Barred Sections",
        description:
          "A short accent bar precedes every section label, giving the page a documentary structure.",
        items: ["Accent bar markers", "Uppercase labels", "Consistent heading gap"],
      },
      {
        title: "Business Body",
        description:
          "Items keep a steady rhythm so experience, education, and credentials read as one register.",
        items: ["Even item spacing", "Credential-friendly rows", "Parser-safe text"],
      },
    ],
    proofPoints: [
      "Best when the reviewing culture expects formality over personality.",
      "Uses the header space efficiently so more evidence fits on page one.",
      "Pairs naturally with the Professional cover letter template.",
    ],
    seo: {
      title: "Corporate Brief AI Resume Template | Formal Business Resume",
      description:
        "Use the Corporate Brief resume template and AI tailoring to build a formal, letterhead-style resume for finance, consulting, and corporate roles.",
    },
  },

  {
    id: "resume-bold-impact",
    editorTemplateId: "bold-impact",
    name: "Bold Impact",
    documentType: "resume",
    documentTypeLabel: "Resume",
    description:
      "A centered, high-contrast masthead with accent-underlined section headings, for applications where the first impression has to carry weight.",
    shortDescription: "A centered, high-contrast resume built for presence.",
    accentColor: "#b91c1c",
    previewImage: "/templates/resume/bold-impact.svg",
    tags: ["One column", "ATS-friendly", "Centered header", "High contrast"],
    family: "Statement Core",
    layout: "One column with centered header",
    audience: ["Career changers", "Sales and GTM", "Founders", "Senior candidates"],
    bestFor: [
      "Pitches where the name and headline need to land before anything else.",
      "Competitive shortlists where a plain page risks blending in.",
      "Candidates whose positioning statement is the strongest asset.",
    ],
    designVision:
      "Bold Impact spends its contrast budget in one place: a centered, uppercase masthead over a thick accent rule, then returns to a conservative single column so the rest of the page stays easy to parse.",
    typography: [
      "Uppercase, letterspaced name set at the largest scale in the library.",
      "Centered headline and contact row for a symmetrical opening.",
      "Short accent underlines that mark sections without boxing them.",
    ],
    structure: [
      {
        title: "Statement Masthead",
        description: "Name, headline, and contact details are centered above a heavy accent rule.",
        items: ["Uppercase name", "Centered contact row", "Thick accent rule"],
      },
      {
        title: "Underlined Sections",
        description:
          "Each heading carries a short accent underline that keeps structure visible while scrolling.",
        items: ["Accent underline", "Uppercase labels", "Left-aligned body"],
      },
      {
        title: "Conservative Body",
        description:
          "Below the masthead the layout stays single column and text-only, protecting parse accuracy.",
        items: ["Single column flow", "Plain-text bullets", "No graphical meters"],
      },
    ],
    proofPoints: [
      "Best when you need the top third of the page to do persuasive work.",
      "Keeps all the visual weight in text, so nothing is lost when the PDF is parsed.",
      "Pairs well with the VeriWorkly Special cover letter for a confident application set.",
    ],
    seo: {
      title: "Bold Impact AI Resume Template | High-Contrast Modern Resume",
      description:
        "Use the Bold Impact resume template with AI tailoring for a centered, high-contrast resume that stands out while staying ATS-friendly.",
    },
  },

  {
    id: "resume-veriworkly-special",
    editorTemplateId: "veriworkly-special",
    name: "Veriworkly Special",
    documentType: "resume",
    documentTypeLabel: "Resume",
    description:
      "The signature VeriWorkly resume: a quiet, editorial layout built around one confident name treatment and three precise touches of brand accent - a rule, a label, and a set of small marks. Nothing else competes for attention, and nothing sits in a table or a column a parser could misread.",
    shortDescription: "A quiet, editorial resume with one confident name and a precise accent.",
    accentColor: "#2563eb",
    previewImage: "/templates/resume/veriworkly-special.svg",
    tags: ["Branded", "One column", "ATS-friendly", "Minimal"],
    family: "Signature Core",
    layout: "One column, editorial masthead",
    audience: [
      "Candidates who want restraint and precision over decoration",
      "Designers and product roles",
      "Senior candidates who want the page to feel considered, not busy",
      "Anyone applying alongside a VeriWorkly cover letter",
    ],
    bestFor: [
      "Applications where a calm, confident first page reads better than a loud one.",
      "Candidates who want the polish of a designed document without risking a layout a parser cannot read.",
      "Pairing with the VeriWorkly Special cover letter for a matched, understated application set.",
    ],
    designVision:
      "Veriworkly Special spends its entire color budget on three deliberate moments: a tight-tracked name in ink, a wide-tracked accent label under it, a thin accent rule closing the header, and a small accent mark opening each section. Everything else - dates, bullets, body copy - is plain text in a single column, so the three accent touches read as a signature rather than decoration competing with the content.",
    typography: [
      "A large, tight-tracked name that carries hierarchy through size and weight, not color.",
      "A wide-tracked, uppercase accent label under the name - the one place the brand color touches text directly.",
      "Small, consistent accent marks before each section title instead of a filled background.",
    ],
    structure: [
      {
        title: "Quiet Masthead",
        description:
          "Name, accent label, contact row, and links sit above a single thin accent rule - no fills, no panels.",
        items: ["Tight-tracked name", "Accent label", "Single accent rule"],
      },
      {
        title: "Marked Sections",
        description:
          "Each heading opens with one small accent square and a tracked uppercase label, keeping rhythm without a filled chip.",
        items: ["Small accent mark", "Uppercase tracked label", "Consistent spacing rhythm"],
      },
      {
        title: "Plain Body",
        description:
          "Experience, education, and skills stay single column and text-only underneath the quiet header and headings.",
        items: ["Single column flow", "Plain-text bullets", "No graphical meters or tables"],
      },
    ],
    proofPoints: [
      "Best when you want a resume that reads as deliberately designed, not decorated.",
      "Every accent touch is small and precise, so nothing is lost when the PDF is parsed.",
      "Pairs naturally with the VeriWorkly Special cover letter for a matched, understated application.",
    ],
    seo: {
      title: "Veriworkly Special AI Resume Template | Minimal ATS-Friendly Resume",
      description:
        "Use the Veriworkly Special resume template with AI tailoring for a quiet, editorial resume that still parses cleanly through applicant tracking systems.",
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

  {
    id: "cover-letter-minimalist",
    editorTemplateId: "minimalist",
    name: "Minimalist",
    documentType: "cover-letter",
    documentTypeLabel: "Cover Letter",
    description:
      "A quiet, rule-free cover letter with a full-width stacked masthead, generous whitespace, and small uppercase labels in place of borders, built for candidates who want the writing to carry the page.",
    shortDescription: "A full-width stacked masthead with generous whitespace.",
    accentColor: "#6366f1",
    previewImage: "/templates/cover-letter/minimalist.svg",
    tags: ["Minimal", "Whitespace", "ATS-friendly", "Understated"],
    family: "Minimal Letter",
    layout: "One column",
    audience: [
      "Tech and product candidates",
      "Startup applicants",
      "Design-adjacent roles",
      "Early-career candidates",
    ],
    bestFor: [
      "Applications where a calm, confident tone matters more than visual flourish.",
      "Candidates pairing the letter with a similarly minimal, whitespace-led resume.",
      "Roles where the writing itself is the strongest signal.",
    ],
    designVision:
      "Minimalist stacks the sender's identity full width instead of splitting it into columns, then removes every rule and shaded block from the rest of the letter, so nothing competes with the sentence the reader is on.",
    typography: [
      "A full-width sender block with a light identifying label instead of a heavy rule.",
      "Contact details set as one wrapped inline row under the title, not a side column.",
      "An accent-colored rule beside list items instead of a filled background.",
    ],
    structure: [
      {
        title: "Stacked Masthead",
        description:
          "Name, title, and contact details run full width with no column split, above a date-then-address reading order.",
        items: ["Full-width header", "Inline contact row", "Date above the inside address"],
      },
      {
        title: "Open Body",
        description: "Paragraphs and highlights breathe with wide spacing and no boxed sections.",
        items: ["Accent-rule highlights", "Generous paragraph spacing", "En-dash markers"],
      },
      {
        title: "Export Shape",
        description:
          "The design stays printable and legible across PDF export and browser preview.",
        items: ["No fragile overlays", "Letter-sized composition", "Recruiter-safe contrast"],
      },
    ],
    proofPoints: [
      "Best when the letter should feel considered rather than designed.",
      "Keeps every word in plain text, so nothing is lost when the PDF is parsed.",
      "Pairs well with Precision ATS or Modern Minimal for a quiet, consistent application set.",
    ],
    seo: {
      title: "Minimalist AI Cover Letter Template | Quiet, Whitespace-Led Design",
      description:
        "Use the Minimalist cover letter template and AI writer to generate a calm, rule-free job application letter with generous whitespace.",
    },
  },

  {
    id: "cover-letter-executive",
    editorTemplateId: "executive",
    name: "Executive",
    documentType: "cover-letter",
    documentTypeLabel: "Cover Letter",
    description:
      "A centered masthead framed by a double rule, with a small-caps subject label and refined spacing, built for senior, leadership, and client-facing applications.",
    shortDescription: "A centered, double-ruled masthead for senior applications.",
    accentColor: "#164e63",
    previewImage: "/templates/cover-letter/executive.svg",
    tags: ["Executive", "Refined", "Centered header", "Leadership"],
    family: "Executive Letter",
    layout: "One column",
    audience: [
      "Senior and executive candidates",
      "Legal and finance professionals",
      "Consultants and advisors",
      "Academic and research leadership",
    ],
    bestFor: [
      "Applications where gravitas and restraint matter more than distinctiveness.",
      "Candidates writing to a board, partner group, or search committee.",
      "Letters that need to read as considered and unhurried.",
    ],
    designVision:
      "Executive frames the sender's identity between two hairlines and centers it, the way a formal letterhead is set, then presents the date and inside address the way a traditional business letter does - dateline first, address beneath it - before the letter runs in calm, single-column prose.",
    typography: [
      "A centered name and uppercase title inside a double-rule masthead.",
      "A centered dateline over a left-aligned inside address, not a side-by-side split.",
      "A small-caps subject label with wider letter spacing for a formal register.",
      "Em-dash list markers framed by top and bottom hairlines instead of a filled block.",
    ],
    structure: [
      {
        title: "Framed Masthead",
        description:
          "A double hairline frames the centered sender identity, with contact details held in a fixed right column.",
        items: ["Centered identity block", "Double-rule frame", "Fixed contact column"],
      },
      {
        title: "Traditional Dateline",
        description:
          "The date sits centered above the recipient's inside address, the composition a formal letter actually uses.",
        items: ["Centered dateline", "Left-aligned inside address", "Top-down reading order"],
      },
      {
        title: "Formal Subject Line",
        description: "A wide-tracked label introduces the subject beneath a single hairline.",
        items: ["Small-caps label", "Single hairline rule", "Clear subject heading"],
      },
      {
        title: "Export Shape",
        description: "The design stays printable and formal across PDF export and browser preview.",
        items: ["No fragile overlays", "Letter-sized composition", "Recruiter-safe contrast"],
      },
    ],
    proofPoints: [
      "Best when the letter needs to feel unmistakably senior without becoming ornate.",
      "Keeps every word in plain, parseable text despite the more formal frame.",
      "Pairs well with Executive Clarity or Corporate Brief for a matched senior application set.",
    ],
    seo: {
      title: "Executive AI Cover Letter Template | Centered Formal Letterhead",
      description:
        "Use the Executive cover letter template and AI writer to generate a refined, centered letter for senior and leadership job applications.",
    },
  },

  {
    id: "cover-letter-ats-essential",
    editorTemplateId: "ats-essential",
    name: "ATS Essential",
    documentType: "cover-letter",
    documentTypeLabel: "Cover Letter",
    description:
      "The classic block-letter format taught in business writing: every line left-aligned with no column split anywhere on the page, no shaded blocks, and no decorative rules beyond a single hairline - built to parse correctly in any ATS.",
    shortDescription: "The classic left-aligned block letter, with no column split.",
    accentColor: "#57534e",
    previewImage: "/templates/cover-letter/ats-essential.svg",
    tags: ["ATS-friendly", "Maximum compatibility", "Plain text", "Conservative"],
    family: "ATS Letter",
    layout: "One column",
    audience: [
      "Government and public-sector applicants",
      "High-volume corporate applications",
      "Conservative and regulated industries",
      "Candidates unsure which ATS will read their file",
    ],
    bestFor: [
      "Applications submitted through an unfamiliar or older applicant tracking system.",
      "Candidates who would rather not gamble any layout choice against a parser.",
      "Pairing with Precision ATS for a resume-and-letter set built for parsing accuracy above all else.",
    ],
    designVision:
      "ATS Essential strips the letter down to what a parser and a hiring manager both need: name, title, and every contact line stacked left with nothing beside them, a plain 'Re: subject' line, and unadorned paragraphs and hyphenated bullets with no shaded surface anywhere on the page.",
    typography: [
      "Name, title, and contact lines stacked left with no column split.",
      "A single plain 'Re: subject' line in place of a separate label and heading.",
      "Body copy with no color-only cues, so meaning never depends on rendering.",
      "Plain hyphen bullets instead of a typographic marker or shaded box.",
    ],
    structure: [
      {
        title: "Block Letterhead",
        description:
          "Name, title, and every contact line run left-aligned in one column, the format most business-writing guides teach and the one least likely to confuse a parser that reads top to bottom.",
        items: ["No column split", "Left-aligned contact lines", "Single hairline"],
      },
      {
        title: "Unadorned Body",
        description: "Paragraphs and highlights run as plain text with hyphen markers only.",
        items: ["Hyphen bullets", "No background fills", "No color-only cues"],
      },
      {
        title: "Export Shape",
        description:
          "The design stays printable and maximally parseable across PDF export and browser preview.",
        items: ["No fragile overlays", "Letter-sized composition", "High-contrast text"],
      },
    ],
    proofPoints: [
      "Best when the letter must survive an ATS with no assumptions about how it renders.",
      "Every element is real text with no decoration that could confuse a parser.",
      "Pairs well with Precision ATS for a conservative, parsing-first application set.",
    ],
    seo: {
      title: "ATS Essential AI Cover Letter Template | Maximum Parsing Compatibility",
      description:
        "Use the ATS Essential cover letter template and AI writer to generate the most conservative, parser-safe job application letter in the set.",
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
