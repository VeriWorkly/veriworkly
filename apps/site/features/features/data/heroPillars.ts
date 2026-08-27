import { FileText, Sparkles, Gauge, Globe } from "lucide-react";
import type { HeroPillar } from "../types";

export const HERO_PILLARS: HeroPillar[] = [
  {
    icon: FileText,
    title: "100% Free Downloads",
    description:
      "Export clean PDFs, Word (.docx), and Markdown with zero watermarks or subscription traps.",
  },
  {
    icon: Sparkles,
    title: "AI Writing & Tailoring",
    description: "Target bullet points to job descriptions with live side-by-side diff previews.",
  },
  {
    icon: Gauge,
    title: "Target Job ATS Scanner",
    description:
      "Match your resume against any job description with instant keyword and parse scoring.",
  },
  {
    icon: Globe,
    title: "Web Portfolios",
    description: "Publish your personal website on your custom subdomain (core templates free).",
  },
];
