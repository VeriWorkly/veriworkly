import { Columns, EyeOff, FileText, SearchCheck } from "lucide-react";

export const FAILURE_TRAPS = [
  {
    icon: Columns,
    badge: "Formatting Trap",
    title: "Multi-Column Layout Scrambling",
    problem:
      "When a PDF contains two columns, text boxes, or floating sidebars, plain-text extraction algorithms read horizontally across the entire page. Your job titles, company names, and dates get scrambled together into unreadable text.",
    solution:
      "Our scanner tests single-stream linear extraction to ensure your text hierarchy maintains clean sequential reading order.",
  },
  {
    icon: EyeOff,
    badge: "Indexing Trap",
    title: "Skills Buried in Graphics or Rating Bars",
    problem:
      "Graphic skill meters (like 4/5 stars or progress bars), icons, and creative section headers like 'What I Love' are completely invisible to parser database indexes.",
    solution:
      "We verify standard section taxonomy and ensure all technical capabilities are stored in indexable plain-text strings.",
  },
  {
    icon: FileText,
    badge: "Evidence Trap",
    title: "Passive Duties with Zero Metrics",
    problem:
      "Listing job duties ('Responsible for customer support tickets') instead of measurable outcomes makes you invisible to recruiters searching for proven high performers.",
    solution:
      "We measure metric density (identifying percentages, dollar amounts, and team sizes) and power action verbs across all bullets.",
  },
  {
    icon: SearchCheck,
    badge: "Keyword Trap",
    title: "Missing Exact Job Description Requirements",
    problem:
      "Recruiters filter candidate databases by specific technical terms and core requirements. If the listing asks for 'PostgreSQL' and you wrote 'SQL databases', you may get filtered out.",
    solution:
      "Our job match engine weighs required skills higher than nice-to-haves and surfaces the exact missing phrases you need to add.",
  },
] as const;
