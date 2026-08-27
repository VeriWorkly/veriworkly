import { Database, Layers, Cpu, ShieldCheck, Globe } from "lucide-react";

import type { WorkflowStepItem, PipelineNodeItem } from "../types";

export const WORKFLOW_STEPS: WorkflowStepItem[] = [
  {
    step: "01",
    title: "Ingest Career Records into Master Profile",
    subtitle: "GitHub OAuth & LinkedIn Data Parser",
    description:
      "Your career DNA starts in your private Master Profile. Connect GitHub to automatically import repositories, star counts, and language breakdowns, or import your LinkedIn data archive in one click. No manual retyping required.",
    tags: ["GitHub OAuth", "LinkedIn Ingest", "Master Profile", "Client-Side Parsing"],
  },
  {
    step: "02",
    title: "Draft Inside the Sandboxed Studio",
    subtitle: "Zero Sign-Up & Non-Destructive Editing",
    description:
      "Open the studio immediately in your browser tab without creating an account or providing a credit card. Choose from proven ATS templates, customize font pairings (Inter, Source Serif, IBM Plex), and adjust margins without overwriting your master profile records.",
    tags: ["No Sign-Up Needed", "LocalStorage", "Typographic Scales", "Snapshot Isolation"],
  },
  {
    step: "03",
    title: "Target Job ATS Scoring & AI Rewriting",
    subtitle: "Keyword Gap Analysis & Live Diff Approvals",
    description:
      "Paste any target job description. The scanner checks hard skills, soft skills, and parser readability. Use AI to rewrite vague bullets into quantified achievements, reviewing every suggested edit with side-by-side diffs before accepting.",
    tags: ["Target Job Matching", "ATS Parser Safety", "AI Diff Previews", "Zero Hallucinations"],
  },
  {
    step: "04",
    title: "100% Watermark-Free Multi-Format Exports",
    subtitle: "In-Browser Compilation in 6 Formats",
    description:
      "What you see in the live preview is rendered and compiled directly in your browser. Download unwatermarked PDFs, editable Microsoft Word (.docx) files, Markdown, clean HTML, plain text, or standardized JSON Resume schemas with zero subscription traps.",
    tags: ["PDF Export", "Word (.docx)", "Markdown", "JSON Resume", "Zero Watermarks"],
  },
  {
    step: "05",
    title: "Launch a Live Web Portfolio in One Click",
    subtitle: "Custom Subdomain & Fast Edge Delivery",
    description:
      "Transform your resume into a personal portfolio website hosted at yourname.veriworkly.com. Includes automatic SSL, responsive layouts, dark and light modes, and zero tracking cookies. Core themes are completely free.",
    tags: ["Custom Subdomain", "Edge Routing", "Zero Cookies", "Mobile Responsive"],
  },
];

export const PIPELINE_NODES: PipelineNodeItem[] = [
  { step: "01", label: "Career Ingest", desc: "GitHub & LinkedIn", icon: Database },
  { step: "02", label: "Studio Sandbox", desc: "Local-First Editor", icon: Layers },
  { step: "03", label: "AI & ATS Match", desc: "Job Tailoring & Diffs", icon: Cpu },
  { step: "04", label: "Multi-Export", desc: "PDF, Word & MD", icon: ShieldCheck },
  { step: "05", label: "Web Portfolio", desc: "Custom Subdomain", icon: Globe },
];
