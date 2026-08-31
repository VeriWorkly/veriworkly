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
    title: "Nothing is stored, and no account is required",
    body: "The free scan runs entirely in memory on our servers and is discarded when the response is sent. We do not retain your file or its text, and we do not train models on it. The optional AI analysis is the one exception: that step sends your resume text to a model provider to generate the write-up, so it does not stay on our infrastructure.",
  },
] as const;
