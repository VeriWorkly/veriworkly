import { Columns, EyeOff, FileText, SearchCheck } from "lucide-react";

export const FAILURE_TRAPS = [
  {
    icon: Columns,
    badge: "Formatting Trap",
    title: "Multi-Column Layout Scrambling",
    problem:
      "When a PDF puts two columns, a sidebar, or a floating text box on the same lines, extraction reads straight across the page. Your job titles, employers, and dates come out interleaved with whatever sat beside them.",
    solution:
      "On an uploaded PDF we measure the page geometry directly and report the share of lines split across a column gutter — the layout itself, not a guess from the text.",
  },
  {
    icon: EyeOff,
    badge: "Indexing Trap",
    title: "Sections a Parser Cannot Map",
    problem:
      "Parsers map work history from headings. A creative label like 'What I Love', or a resume where 'experience' only ever appears inside a sentence, leaves those fields empty in the recruiter's database.",
    solution:
      "We match Experience, Education, and Skills headings on their own line only, so the check cannot be satisfied by the word turning up in prose.",
  },
  {
    icon: FileText,
    badge: "Evidence Trap",
    title: "Passive Duties with Zero Metrics",
    problem:
      "Listing duties ('Responsible for customer support tickets') instead of measurable outcomes makes you invisible to recruiters searching for proven performers.",
    solution:
      "We score the share of your bullets that carry a number and the share that open with an action verb — density across the resume, not a single occurrence somewhere in it.",
  },
  {
    icon: SearchCheck,
    badge: "Keyword Trap",
    title: "Missing Job Description Requirements",
    problem:
      "Recruiters filter candidate databases by specific terms. Miss a requirement the posting names and you can drop out of the search — but a keyword score that also counts the benefits section tells you nothing useful.",
    solution:
      "We score requirements above nice-to-haves, skip about-us and benefits copy, read 'Go or Java' as one choice, and credit skills your resume evidences under another name.",
  },
] as const;
