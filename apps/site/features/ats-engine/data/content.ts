import {
  Braces,
  Bot,
  Cpu,
  EyeOff,
  FileSearch,
  Fingerprint,
  Gauge,
  Globe,
  GraduationCap,
  Languages,
  Layers,
  ListChecks,
  Repeat,
  ScanText,
  ShieldAlert,
  Sparkles,
  Target,
  Terminal,
  Type,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { siteConfig } from "@/config/site";
import { engineSize } from "@/features/ats-engine/data/sizes";

/** Figures are for engine 0.21.0; update them with the engine bump (sizes from sizes.json, accuracy from npm run bench). */
export const ENGINE_VERSION_LABEL = "0.21.0";

export const ENGINE_LINKS = {
  docs: `${siteConfig.links.docs}/ats-engine`,
  quickStart: `${siteConfig.links.docs}/ats-engine/quick-start`,
  rubric: `${siteConfig.links.docs}/ats-engine/reference/rubric`,
  benchmarks: `${siteConfig.links.docs}/ats-engine/project/benchmarks`,
  responsibleUse: `${siteConfig.links.docs}/ats-engine/project/responsible-use`,
  ai: `${siteConfig.links.docs}/ats-engine/guides/ai`,
  locales: `${siteConfig.links.docs}/ats-engine/reference/locales`,
  apiReference: `${siteConfig.links.docs}/api-reference/ats/overview`,
  github: "https://github.com/VeriWorkly/ats-engine",
  npm: "https://www.npmjs.com/package/@veriworkly/ats-engine",
} as const;

export const INSTALL_COMMAND = "npm install @veriworkly/ats-engine";

export const HERO_FACTS = [
  { label: "Licence", value: "MIT" },
  { label: "Core, gzipped", value: engineSize(".", true) },
  { label: "Runs in", value: "Browser · Edge · Node" },
  { label: "Score from", value: "35 rules" },
] as const;

export interface EngineFeature {
  icon: LucideIcon;
  title: string;
  body: string;
}

export const CAPABILITIES: EngineFeature[] = [
  {
    icon: ScanText,
    title: "Read",
    body: "PDF, DOCX, HTML, plain text and JSON Resume. It rebuilds the reading order, joins wrapped lines and reads spaced-out letters back, the way an ATS extracts text before it files anything.",
  },
  {
    icon: FileSearch,
    title: "Recover",
    body: "The fields an ATS stores: name, contact, one row per role with title, employer and dates, education with its level, skills, certifications and spoken languages, each marked with where it came from.",
  },
  {
    icon: Gauge,
    title: "Score",
    body: "A readiness score from 0 to 100 across parsing, contact, structure, evidence, format and writing. Every failed rule comes with what it found, quoted from the resume, and the fix.",
  },
  {
    icon: Target,
    title: "Match",
    body: "A posting is read requirement by requirement: years of experience, degree level, skills, languages, clearances and the right to work, each met, partial, missing or unverifiable, with evidence.",
  },
];

export const DETERMINISM_POINTS: EngineFeature[] = [
  {
    icon: ListChecks,
    title: "A published rubric",
    body: "35 rules, each with its category, weight, what it reads, when it passes and the fix. The docs page is generated from the engine itself.",
  },
  {
    icon: Fingerprint,
    title: "Reproducible reports",
    body: "The same resume, policy and date always give the same report. Every report carries the engine version and a fingerprint of the policy that scored it.",
  },
  {
    icon: Layers,
    title: "A policy you can tune",
    body: "Rules, weights, keywords and synonyms are data, not code. Copy the community policy, change it, and the fingerprint tells your reports apart.",
  },
];

export const INTEGRITY_CHECKS: EngineFeature[] = [
  {
    icon: Bot,
    title: "Prompt injection",
    body: "Instructions aimed at AI screeners, including ones hidden in Unicode tag characters or PDF metadata.",
  },
  {
    icon: EyeOff,
    title: "Hidden text",
    body: "Text set in white, too small to read, off the page or covered by a shape, read from the uploaded file itself.",
  },
  {
    icon: Repeat,
    title: "Keyword stuffing",
    body: "Terms repeated far beyond what the text needs, and a posting pasted into the resume.",
  },
  {
    icon: Type,
    title: "Look-alike letters",
    body: "Letters from another alphabet posing as Latin ones, and invisible characters hidden between words.",
  },
];

export interface EngineSurface {
  id: string;
  label: string;
  icon: LucideIcon;
  title: string;
  body: string;
  language: string;
  code: string;
  docsPath: string;
}

export const SURFACES: EngineSurface[] = [
  {
    id: "library",
    label: "Library",
    icon: Braces,
    title: "Score inside your product",
    body: "One function, no network calls. Works the same in a React component, a route handler or a Worker.",
    language: "ts",
    code: `import { check, DEFAULT_POLICY } from "@veriworkly/ats-engine";
import { BUILT_IN_LOCALES, withLocales } from "@veriworkly/ats-engine/locales";

// Once at startup: German, French, Hindi, Spanish, Portuguese and 12 regions.
const policy = withLocales(DEFAULT_POLICY, BUILT_IN_LOCALES);

const report = check(resumeText, policy, { jobDescription });

report.readinessScore; // 0–100
report.failedChecks;   // each with evidence and a fix
report.parsed.roles;   // title, employer, start, end
report.requirements;   // met, partial, missing, unverifiable`,
    docsPath: "/ats-engine/quick-start",
  },
  {
    id: "cli",
    label: "CLI",
    icon: Terminal,
    title: "Check a file from the terminal",
    body: "Read a PDF or DOCX, compare it with a saved posting or a Greenhouse, Lever or Ashby link, and get text or JSON back.",
    language: "bash",
    code: `npx -p @veriworkly/ats-engine -p pdf-parse@2 -p pdfjs-dist@5.4.296 -p mammoth \\
  ats-engine check resume.pdf \\
  --job-url https://job-boards.greenhouse.io/acme/jobs/123`,
    docsPath: "/ats-engine/tools/cli",
  },
  {
    id: "action",
    label: "GitHub Action",
    icon: Workflow,
    title: "Gate a resume kept in a repository",
    body: "Fail a pull request below a score you set, and get the failed checks and their fixes in the job summary.",
    language: "yaml",
    code: `- uses: VeriWorkly/ats-engine/action@<commit-sha>
  with:
    resume: resume.pdf
    job: posting.txt
    min-score: 80`,
    docsPath: "/ats-engine/tools/github-action",
  },
  {
    id: "mcp",
    label: "MCP server",
    icon: Sparkles,
    title: "Give your AI assistant the rubric",
    body: "Claude, Cursor and VS Code can check a resume, match a posting and explain any rule. Runs locally over stdio and calls no model.",
    language: "bash",
    code: `claude mcp add ats-engine -- npx -y @veriworkly/ats-engine-mcp`,
    docsPath: "/ats-engine/tools/mcp",
  },
];

export const RUNTIMES = [
  {
    subpath: "@veriworkly/ats-engine",
    size: engineSize(".", true),
    where: "Browser, edge, Node",
    what: "check(), parsing, scoring",
  },
  {
    subpath: "/locales",
    size: engineSize("./locales"),
    where: "Browser, edge, Node",
    what: "German, French, Hindi, Spanish, Portuguese; 12 regions",
  },
  {
    subpath: "/job",
    size: engineSize("./job"),
    where: "Browser, edge, Node",
    what: "Postings from HTML and JSON-LD",
  },
  {
    subpath: "/format",
    size: engineSize("./format"),
    where: "Browser, edge, Node",
    what: "Labels, bands, dates for your UI",
  },
  {
    subpath: "/ai",
    size: engineSize("./ai", true),
    where: "Server, with fetch",
    what: "Optional: explain, repair, convert",
  },
  {
    subpath: "/node",
    size: engineSize("./node"),
    where: "Node.js 22.12+",
    what: "PDF and DOCX extraction",
  },
] as const;

export const EXTRAS: EngineFeature[] = [
  {
    icon: Cpu,
    title: "AI is optional, and grounded",
    body: "Bring your own key for Anthropic, OpenAI, Gemini, Groq, OpenRouter, Together or a local Ollama. A model can explain a report or fill gaps in a parse; any value it returns that is not in the resume is dropped, and contact details are redacted before analysis.",
  },
  {
    icon: Languages,
    title: "Reads more than English",
    body: "German, French, Hindi, Spanish and Portuguese packs, and region rules for the US, UK, Germany, France, India, Spain, Brazil, Portugal, Mexico, Argentina, Colombia and Chile: day-first dates, national credentials, and whether a photo or a date of birth is expected. A resume in a language with no pack is named in the report instead of being misread.",
  },
  {
    icon: ShieldAlert,
    title: "Safe on hostile files",
    body: "Every pattern runs in linear time, inputs are capped, crafted DOCX archives are refused before parsing, and extraction can run in a child process with a timeout.",
  },
];

export const BENCHMARKS = [
  { label: "Fields read back, hand-written test resumes (regression check)", value: "100%" },
  {
    label: "Fields read back, invented resumes as text, PDF, two-column PDF and DOCX",
    value: "100%",
  },
  {
    label: "Fields read back, invented German, French, Hindi, Spanish and Portuguese resumes",
    value: "100%",
  },
] as const;

export const AUDIENCES: EngineFeature[] = [
  {
    icon: Layers,
    title: "Resume builders",
    body: "Score as people type, show the rows an ATS would recover, and point at the exact line to fix.",
  },
  {
    icon: Globe,
    title: "Job boards, for candidates",
    body: "Show a candidate how their resume reads against a posting before they apply.",
  },
  {
    icon: GraduationCap,
    title: "Career centres and bootcamps",
    body: "Give every student the same published standard, and explain each score line by line.",
  },
  {
    icon: Bot,
    title: "AI agents and assistants",
    body: "Ground an assistant's resume advice in a deterministic report instead of a model's guess.",
  },
];

export const COMPARISON_COLUMNS = [
  "VeriWorkly ATS Engine",
  "Hosted parsing APIs",
  "AI-scored checkers",
] as const;

export const COMPARISON_ROWS: { label: string; values: [string, string, string] }[] = [
  {
    label: "How the score is made",
    values: ["Published rules", "Usually no score", "A model's judgement"],
  },
  {
    label: "Same input, same result",
    values: ["Always, with a policy fingerprint", "Depends on the vendor", "Can vary between runs"],
  },
  {
    label: "Every rule and weight public",
    values: ["Yes", "No", "Rarely"],
  },
  {
    label: "Where the resume goes",
    values: ["Nowhere: runs in your code", "The vendor's servers", "The vendor's servers"],
  },
  {
    label: "Requirement-by-requirement match",
    values: ["Yes, with evidence", "Some", "Some"],
  },
  {
    label: "Price",
    values: ["Free, MIT", "Usually per document", "Usually a subscription"],
  },
];

export const FAQ_IDS = [
  "ats-engine-what",
  "ats-engine-no-ai-score",
  "ats-engine-runtimes",
  "ats-engine-vendors",
  "ats-engine-languages",
  "ats-engine-screening",
];
