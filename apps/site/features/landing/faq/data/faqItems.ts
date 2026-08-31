export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export const faqs: FAQItem[] = [
  {
    id: "landing-free-tier",
    question: "Is VeriWorkly free to build and export resumes?",
    answer:
      "Yes. VeriWorkly offers a free tier that lets you create your resume and matching cover letter, and export clean, watermark-free PDFs as many times as you need without hidden fees, surprise subscriptions, or forced account creation.",
    category: "Pricing & Plans",
  },
  {
    id: "landing-data-privacy",
    question: "Is my personal data private and stored locally?",
    answer:
      "Yes. VeriWorkly is built with a local-first architecture. All your resume data, career experience, and draft documents stay in your browser local storage by default. Your private data is never tracked, staying completely under your control.",
    category: "Privacy & Security",
  },
  {
    id: "landing-no-signup",
    question: "Do I need to sign up or log in to create a resume?",
    answer:
      "No. Click through as a guest and the editor opens with no account: choose a template and build your resume or cover letter right away. Signing up is only needed for cloud sync across devices, more than one document per type, or publishing a web portfolio.",
    category: "Getting Started",
  },
  {
    id: "landing-ats-friendly",
    question: "Are VeriWorkly resume templates ATS-friendly?",
    answer:
      "Yes. All VeriWorkly resume templates are designed around standard ATS parsing principles: clear headings, standard system fonts, single-column reading flow, and uncorrupted text streams. Standard applicant tracking systems can parse every section without jumbling your text or missing dates.",
    category: "Resumes & ATS",
  },
  {
    id: "landing-ai-tailoring",
    question: "How does AI resume tailoring work without hallucinating details?",
    answer:
      "VeriWorkly sends the request to a third-party model provider (Anthropic's Claude or OpenAI's GPT) to rewrite your existing bullet points against a job description, grounded in the facts already in your Master Profile. Every change is shown as a diff you approve before it lands, so nothing reaches your document unreviewed. No prompt can make a language model incapable of error — that review step is what protects you.",
    category: "AI Tools",
  },
  {
    id: "landing-web-portfolio",
    question: "How do I publish a live web portfolio on a custom subdomain?",
    answer:
      "You turn your Master Profile into a responsive web portfolio, pick a template, and publish it to your own subdomain (such as yourname.veriworkly.com). The two core templates, Signal and Atelier, are free and publish with a small “Built with VeriWorkly” badge; Nimbus and Cipher, badge removal, analytics, and SEO controls come with a paid plan. Publishing opens at launch — you can build and preview now.",
    category: "Web Portfolios",
  },
  {
    id: "landing-master-profile",
    question: "What is the Master Profile feature?",
    answer:
      "The Master Profile is your central source of truth for all career history, skills, projects, and achievements. Input your details once, then selectively sync them to generate targeted resumes, tailored cover letters, and web portfolios.",
    category: "Core Features",
  },
  {
    id: "landing-data-imports",
    question: "Can I import my data from LinkedIn, GitHub, or existing PDF resumes?",
    answer:
      "Yes. VeriWorkly features zero-friction ingestors that extract experience from LinkedIn profile PDFs, GitHub repositories, or existing PDF/DOCX resumes straight into your Master Profile for quick editing.",
    category: "Imports & Integrations",
  },
  {
    id: "landing-flexible-passes",
    question: "What are Flexible Passes (3-Day and 7-Day Sprint Passes)?",
    answer:
      "Flexible Passes are one-time payments (3-Day or 7-Day Sprint Passes) that unlock the premium portfolio templates, portfolio badge removal, analytics, and AI writing credits for an active job hunt, without a recurring subscription. They do not gate exports — every file format is free on every tier.",
    category: "Pricing & Plans",
  },
  {
    id: "landing-file-formats",
    question: "What file formats can I export from VeriWorkly?",
    answer:
      "Six formats, all free and ungated: PDF, Word (DOCX), Markdown, HTML, plain text, and JSON. Publishing a live web portfolio is a separate feature, not an export format.",
    category: "Exports & Formats",
  },
];
