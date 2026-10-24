import type { WorkflowStepItem } from "../types";

/** The five steps, in order. `title` and `description` also feed the page's HowTo schema. */
export const WORKFLOW_STEPS: WorkflowStepItem[] = [
  {
    id: "import",
    label: "Import your history",
    title: "Bring in your history.",
    subtitle: "GitHub and LinkedIn import, into one private Master Profile.",
    description:
      "Your career record starts in your private Master Profile. Connect GitHub to import repositories with their stars and primary language, or upload your LinkedIn profile PDF (or paste its text) and let the parser fill in titles, dates, degrees and skills. No retyping.",
    points: [
      {
        term: "GitHub",
        detail:
          "Up to 30 recent repositories with stars and primary language, 15 mapped to projects. No write, commit or SSH access.",
      },
      {
        term: "LinkedIn",
        detail: "Job titles, dates, degrees and skills, parsed into structured entries.",
      },
    ],
  },
  {
    id: "draft",
    label: "Draft in the studio",
    title: "Draft in the studio.",
    subtitle: "No sign-up, and nothing you do here can damage your profile.",
    description:
      "Continue as a guest and the studio opens without an account or a credit card. Choose a proven ATS template, switch between Geist, Manrope and Inter, and adjust page margins. Each document is a snapshot of your Master Profile, so editing it never overwrites the original.",
    points: [
      { term: "No account", detail: "Start typing straight away; no card, no email." },
      {
        term: "Snapshots, not copies",
        detail: "Tailor one resume per role while the profile stays as it was.",
      },
    ],
  },
  {
    id: "tailor",
    label: "Score and tailor",
    title: "Match it to the job.",
    subtitle: "Keyword gaps, parser checks, and AI edits you approve one by one.",
    description:
      "Paste a job description. The scanner checks hard skills, soft skills and how readable the file is to a parser. Use AI to rewrite vague bullets into measurable achievements, reviewing each suggested edit side by side before accepting it.",
    points: [
      {
        term: "Keyword gaps",
        detail: "The skills and tools the posting asks for that your draft leaves out.",
      },
      { term: "Review mode", detail: "Every AI suggestion waits for your approval." },
    ],
  },
  {
    id: "export",
    label: "Export anywhere",
    title: "Export it anywhere.",
    subtitle: "Six formats, free on every tier, with no watermark.",
    description:
      "The live preview renders in your browser and an automated parity suite checks it against the PDF. Download an unwatermarked PDF, an editable Word file, Markdown, clean HTML, plain text, or a JSON export of your document data.",
    points: [
      { term: "Six formats", detail: "PDF, DOCX, Markdown, HTML, plain text and JSON." },
      { term: "No limits", detail: "Download as many times as your search needs." },
    ],
  },
  {
    id: "publish",
    label: "Publish a portfolio",
    title: "Publish your portfolio.",
    subtitle: "Your own subdomain. Publishing opens at launch.",
    description:
      "Turn your resume into a personal website at yourname.veriworkly.com, with automatic SSL, responsive layouts, dark and light modes and no tracking cookies. The two core templates are free and carry a small “Built with VeriWorkly” badge; premium templates and badge removal come with a paid plan. Build and preview yours now.",
    points: [
      { term: "Edge delivery", detail: "Fast delivery worldwide with automatic HTTPS." },
      { term: "Clean SEO", detail: "Pre-rendered, semantic pages with Open Graph cards." },
    ],
  },
];
