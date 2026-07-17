export interface FAQItem {
  question: string;
  answer: string;
  category?: string;
}

export const faqs: FAQItem[] = [
  {
    question: "Is VeriWorkly free to build and export resumes?",
    answer:
      "Yes. VeriWorkly offers a free tier that lets you create ATS-friendly resumes, generate matching cover letters, and export high-quality PDFs without any hidden fees, subscription traps, or mandatory account creation.",
    category: "Pricing & Plans",
  },
  {
    question: "Is my personal data private and stored locally?",
    answer:
      "Yes. VeriWorkly is built with a local-first architecture. All your resume data, career experience, and draft documents stay in your browser local storage by default. Your private data is never sold, tracked, or harvested for advertising.",
    category: "Privacy & Security",
  },
  {
    question: "Do I need to sign up or log in to create a resume?",
    answer:
      "No. You can immediately launch the VeriWorkly Studio editor, choose a professional template, and build your resume or cover letter right away. Account signup is only required if you choose to enable cloud sync or publish a web portfolio.",
    category: "Getting Started",
  },
  {
    question: "Are VeriWorkly resume templates ATS-friendly?",
    answer:
      "Yes. All VeriWorkly resume templates are benchmarked against top Applicant Tracking Systems (ATS) including Workday, Taleo, Greenhouse, and Lever. Standardized headings, scannable layouts, and clean PDF output ensure maximum parse accuracy.",
    category: "Resumes & ATS",
  },
  {
    question: "How does AI resume tailoring work without hallucinating details?",
    answer:
      "VeriWorkly's AI models (Claude and GPT-4o) rewrite and optimize your existing bullet points against job descriptions using your verified Master Profile facts. The AI assists your phrasing without inventing fake roles or unearned metrics.",
    category: "AI Tools",
  },
  {
    question: "How do I publish a live web portfolio on a custom subdomain?",
    answer:
      "In VeriWorkly, you can transform your master career profile into a live, responsive web portfolio. Select a modern portfolio template and publish it instantly to your own subdomain (such as yourname.veriworkly.com).",
    category: "Web Portfolios",
  },
  {
    question: "What is the Master Profile feature?",
    answer:
      "The Master Profile is your central source of truth for all career history, skills, projects, and achievements. Input your details once, then selectively sync them to generate targeted resumes, tailored cover letters, and web portfolios.",
    category: "Core Features",
  },
  {
    question: "Can I import my data from LinkedIn, GitHub, or existing PDF resumes?",
    answer:
      "Yes. VeriWorkly features zero-friction ingestors that extract experience from LinkedIn profile PDFs, GitHub repositories, or existing PDF/DOCX resumes straight into your Master Profile for quick editing.",
    category: "Imports & Integrations",
  },
  {
    question: "What are Flexible Passes (3-Day and 7-Day Sprint Passes)?",
    answer:
      "Flexible Passes are one-time payments ($2.99 for 3 days or $5.99 for 7 days) that unlock Portfolio Pro hosting, AI writing credits, and advanced exports for active job hunts without requiring a recurring monthly subscription.",
    category: "Pricing & Plans",
  },
  {
    question: "What file formats can I export from VeriWorkly?",
    answer:
      "You can export your resumes and cover letters as vector-sharp PDFs for job applications, save editable JSON files for local backup, or publish live interactive portfolios directly on the web.",
    category: "Exports & Formats",
  },
];
