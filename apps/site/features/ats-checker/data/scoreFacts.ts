import { Layers, Scale, Lock } from "lucide-react";

export const SCORE_FACTS = [
  {
    icon: Layers,
    title: "Two scores, two different questions",
    body: "Readiness measures format and parsing stability. Job match compares your resume directly against a job posting's specific requirements. Paste a job description to get tailored keyword scores.",
  },
  {
    icon: Scale,
    title: "Transparent heuristic scoring",
    body: "No commercial ATS vendor publishes a single universal score formula. Online tools claiming to provide an official third-party score are using their own estimations. We are fully transparent about the deterministic rules we check.",
  },
  {
    icon: Lock,
    title: "100% Stateless and private by default",
    body: "Your resume and target job description are processed in volatile memory and immediately discarded. There is zero file retention, no AI training on user data, and no account requirement to scan.",
  },
] as const;
