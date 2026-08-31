import { Database, Layers, Cpu, ShieldCheck, Globe } from "lucide-react";

import type { WorkflowStepItem, PipelineNodeItem } from "../types";

export const WORKFLOW_STEPS: WorkflowStepItem[] = [
  {
    step: "01",
    title: "Ingest Career Records into Master Profile",
    subtitle: "GitHub OAuth & LinkedIn Data Parser",
    description:
      "Your career DNA starts in your private Master Profile. Connect GitHub to automatically import repositories, star counts, and language breakdowns, or import your LinkedIn data archive in one click. No manual retyping required.",
    tags: ["GitHub OAuth", "LinkedIn Ingest", "Master Profile", "AI-Parsed on Import"],
  },
  {
    step: "02",
    title: "Draft Inside the Sandboxed Studio",
    subtitle: "Zero Sign-Up & Non-Destructive Editing",
    description:
      "Continue as a guest and the studio opens without an account or a credit card. Choose from proven ATS templates, switch between Geist, Manrope, and Inter, and adjust page margins without overwriting your Master Profile records.",
    tags: ["No Sign-Up Needed", "LocalStorage", "Typographic Scales", "Snapshot Isolation"],
  },
  {
    step: "03",
    title: "Target Job ATS Scoring & AI Rewriting",
    subtitle: "Keyword Gap Analysis & Live Diff Approvals",
    description:
      "Paste any target job description. The scanner checks hard skills, soft skills, and parser readability. Use AI to rewrite vague bullets into quantified achievements, reviewing every suggested edit with side-by-side diffs before accepting.",
    tags: [
      "Target Job Matching",
      "ATS Parser Safety",
      "AI Diff Previews",
      "You Approve Every Edit",
    ],
  },
  {
    step: "04",
    title: "Watermark-Free Multi-Format Exports",
    subtitle: "Six Formats, Free and Ungated",
    description:
      "The live preview is rendered in your browser and checked against the PDF by an automated parity suite. Download unwatermarked PDFs, editable Microsoft Word (.docx) files, Markdown, clean HTML, plain text, or a JSON export of your document data. Every format is free on every tier.",
    tags: ["PDF Export", "Word (.docx)", "Markdown", "JSON", "No Document Watermark"],
  },
  {
    step: "05",
    title: "Launch a Live Web Portfolio",
    subtitle: "Your Own Subdomain, Opening at Launch",
    description:
      "Turn your resume into a personal portfolio website at yourname.veriworkly.com, with automatic SSL, responsive layouts, dark and light modes, and zero tracking cookies. The two core templates are free and publish with a small “Built with VeriWorkly” badge; the premium templates and badge removal come with a paid plan. Publishing opens at launch — build and preview now.",
    tags: ["Subdomain", "At Launch", "Zero Cookies", "Mobile Responsive"],
  },
];

export const PIPELINE_NODES: PipelineNodeItem[] = [
  { step: "01", label: "Career Ingest", desc: "GitHub & LinkedIn", icon: Database },
  { step: "02", label: "Studio Sandbox", desc: "Local-First Editor", icon: Layers },
  { step: "03", label: "AI & ATS Match", desc: "Job Tailoring & Diffs", icon: Cpu },
  { step: "04", label: "Multi-Export", desc: "PDF, Word & MD", icon: ShieldCheck },
  { step: "05", label: "Web Portfolio", desc: "Custom Subdomain", icon: Globe },
];
