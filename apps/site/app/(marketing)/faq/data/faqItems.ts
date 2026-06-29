import { Globe, FileText, Code, DollarSign, HelpCircle, Shield } from "lucide-react";

export const categories = [
  { id: "all", name: "All Questions", icon: HelpCircle },
  { id: "general", name: "General & Privacy", icon: Shield },
  { id: "documents", name: "Resumes & Documents", icon: FileText },
  { id: "portfolios", name: "Web Portfolios", icon: Globe },
  { id: "billing", name: "Billing & AI Credits", icon: DollarSign },
  { id: "contribute", name: "Open Source & Contributions", icon: Code },
] as const;

export const faqs = [
  // --- GENERAL & PRIVACY ---
  {
    id: "data-privacy",
    category: "general",
    question: "Is my data really private?",
    answer:
      "Yes. VeriWorkly uses a local-first architecture. Your document drafts and profile data are stored directly inside your browser's local database (IndexedDB). Optional features like cloud backups and web portfolio subdomains are only activated when you choose to register and log in.",
  },

  {
    id: "account-requirement",
    category: "general",
    question: "Do I need an account to use VeriWorkly?",
    answer:
      "No. You can open the editor, build your resume or cover letter, and export high-fidelity PDFs completely without an account. Sign-up is only required if you want to back up data in the cloud, publish portfolios to a subdomain, or utilize AI credit features.",
  },

  {
    id: "master-profile-concept",
    category: "general",
    question: "What is the Master Profile?",
    answer:
      "Your Master Profile serves as a central, private database of your career accomplishments. When you create a new resume, cover letter, or portfolio, the system copies information from this Master Profile to seed the new document. You can then edit and customize that document independently, so changes inside documents do not affect or overwrite your Master Profile data.",
  },

  {
    id: "analytics-tracking",
    category: "general",
    question: "How is visitor analytics handled?",
    answer:
      "We track visitor views and referral sources in aggregate to show you portfolio traffic statistics. We do not use tracking cookies, we do not follow visitors across other websites, and we never sell your data.",
  },

  {
    id: "mobile-compatibility",
    category: "general",
    question: "Can I use VeriWorkly on mobile?",
    answer:
      "Yes. The editing interface, dashboards, and landing pages are fully responsive. You can update your career details and export documents directly from your tablet or mobile browser.",
  },

  // --- RESUMES & DOCUMENTS ---
  {
    id: "ats-friendly",
    category: "documents",
    question: "Are the resume templates ATS-friendly?",
    answer:
      "Yes. All document templates focus on structured single-column and multi-column designs with clean standard typography. They are continuously tested against popular Applicant Tracking Systems (ATS) to ensure parser compliance.",
  },

  {
    id: "deep-customization",
    category: "documents",
    question: "Can I customize the template design?",
    answer:
      "Yes. Visual customization controls let you scale margins, line-heights, letter-spacing, page paddings, font pairings, section order, and section visibility dynamically to match your target role.",
  },

  {
    id: "master-profile-overwrite",
    category: "documents",
    question: "Does editing a resume update my Master Profile?",
    answer:
      "No. When you create a resume, it is seeded with a snapshot of your Master Profile. Any edits, section removals, or wording tweaks you perform within that resume are isolated to that document. This lets you tailor multiple resumes for different job descriptions without messing up your master data.",
  },

  {
    id: "custom-sections",
    category: "documents",
    question: "Can I include custom sections like projects or volunteer work?",
    answer:
      "Yes. You can add standard sections (Experience, Education, Skills) as well as custom sections for certifications, volunteer work, awards, publications, and languages.",
  },

  {
    id: "pdf-free-downloads",
    category: "documents",
    question: "Can I download my resume as a PDF for free?",
    answer:
      "Yes. Creating, editing, and exporting high-quality, print-ready PDF resumes and cover letters is completely free. There are no hidden fees or paywalled PDF downloads.",
  },

  // --- WEB PORTFOLIOS ---
  {
    id: "portfolio-difference",
    category: "portfolios",
    question: "How does the portfolio builder work?",
    answer:
      "The portfolio builder takes your profile facts and converts them into a modern, responsive website. You select a styled portfolio template, configure your public project displays, and publish instantly. The layout updates on the fly while preserving your text content.",
  },

  {
    id: "custom-subdomains",
    category: "portfolios",
    question: "How do subdomains and SSL certificates work?",
    answer:
      "Subdomain mapping is included in our Portfolio Pro tier. You can secure a unique URL (such as yourname.veriworkly.com). We automatically generate and renew SSL certificates to ensure your site is served securely via HTTPS.",
  },

  {
    id: "media-hosting-limits",
    category: "portfolios",
    question: "Is there a limit on image and media hosting?",
    answer:
      "Our paid tiers include fast, CDN-backed image hosting. You can upload project screenshots, avatars, custom icons, and portfolio assets. There are no hard limits on the number of projects you can showcase.",
  },

  {
    id: "portfolio-draft-previews",
    category: "portfolios",
    question: "Can I build and preview my portfolio before upgrading?",
    answer:
      "Yes. You can create portfolio drafts, select templates, arrange projects, and view live interactive previews in your dashboard completely free of charge before upgrading to public hosting.",
  },

  // --- BILLING & AI CREDITS ---
  {
    id: "pricing-tiers",
    category: "billing",
    question: "What paid plans are available?",
    answer:
      "We offer standalone Creator Pro ($9.99/mo, or $7.99/mo billed annually) for subdomain hosting, analytics, and watermark removal. The Job Hunter Bundle ($14.99/mo, or $11.99/mo billed annually) adds 1,000 monthly AI credits and unlocks full resume tailoring tools. Standalone AI Credits are available for $5.99/mo if you do not need hosting.",
  },

  {
    id: "short-term-passes",
    category: "billing",
    question: "Do you offer short-term passes instead of subscriptions?",
    answer:
      "Yes. We offer a 3-Day Sprint Pass ($2.99) with 150 AI credits and a 7-Day Hunt Pass ($5.99) with 400 AI credits. Both passes grant full Creator Pro subdomain publishing and expire automatically without recurring charges.",
  },

  {
    id: "ai-credits-reset",
    category: "billing",
    question: "How do AI credits work and do they roll over?",
    answer:
      "AI credits are consumed when generating cover letters, tailoring resumes, or optimizing summary statements. Unused credits do not roll over to the next month; subscriptions reset to 1,000 credits each billing cycle, and passes expire at the end of their term.",
  },

  {
    id: "payment-security-provider",
    category: "billing",
    question: "Is my payment information secure?",
    answer:
      "Yes. All payment and billing operations are securely processed by Dodo Payments in compliance with strict PCI-DSS standards. VeriWorkly never stores or handles your credit card credentials.",
  },

  // --- CONTRIBUTIONS & OPEN SOURCE ---
  {
    id: "bug-reporting-path",
    category: "contribute",
    question: "Where should I report bugs or regressions?",
    answer:
      "Please open an issue on our official GitHub repository. Provide a clear description, reproducible steps, expected vs. actual outcomes, and screenshots if possible.",
  },

  {
    id: "feature-proposals",
    category: "contribute",
    question: "How do I suggest features?",
    answer:
      "Review our public roadmap first. If your feature is not already planned, open a feature proposal on GitHub detailing your use case and design ideas.",
  },

  {
    id: "contribution-safety",
    category: "contribute",
    question: "How can I contribute code safely?",
    answer:
      "Check out our contributor guidelines. Start with small, focused pull requests, follow existing code formatting standards, and ensure your additions include verification steps.",
  },

  {
    id: "pull-request-quality",
    category: "contribute",
    question: "What makes a high-quality pull request here?",
    answer:
      "A high-quality pull request has a focused scope, clear reasoning, no unrelated style modifications, and verified local build outcomes before submission.",
  },

  {
    id: "large-contributions",
    category: "contribute",
    question: "Should I open an issue before a large contribution?",
    answer:
      "Yes. For larger features or system refactors, please open an issue first to discuss the scope and avoid duplicating efforts.",
  },

  {
    id: "open-source-licensing",
    category: "contribute",
    question: "How is the project licensed?",
    answer:
      "VeriWorkly's core document builder and web engines are licensed under the permissive MIT License, encouraging transparency, custom audits, and developer integrations.",
  },

  {
    id: "custom-domain-mapping",
    category: "portfolios",
    question: "Can I map a custom domain instead of a subdomain?",
    answer:
      "Currently, Portfolio Pro supports publishing to your unique VeriWorkly subdomain (e.g. yourname.veriworkly.com). Support for fully custom domains (e.g. yourname.com) is currently on our active engineering roadmap.",
  },

  {
    id: "local-data-migration",
    category: "general",
    question: "How do I move my local-first data to a new computer?",
    answer:
      "To migrate your local data without an account, export a backup JSON file from the dashboard on your old computer, then import it on your new computer. Alternatively, register for a free account to automatically sync your profile data securely to the cloud.",
  },

  {
    id: "credit-top-ups",
    category: "billing",
    question: "What happens if I run out of AI credits?",
    answer:
      "If you run out of credits, you can wait for your monthly cycle reset, buy standalone AI credit packs, or purchase short-term passes (like the 1-Day Pass) to immediately reload your credit balance.",
  },

  {
    id: "refund-policy",
    category: "billing",
    question: "Do you offer refunds on passes or subscriptions?",
    answer:
      "Because we offer very low-cost passes (like the $0.69 1-Day Pass) to fully test our hosting and AI systems, we generally do not issue refunds. However, if you experience double-billing or technical failures, please contact support to request a manual review.",
  },

  {
    id: "password-protection",
    category: "documents",
    question: "Can I password-protect shared documents or portfolio links?",
    answer:
      "Yes. When creating shared links for resumes, cover letters, or portfolio drafts, you can enable password protection. Only visitors or recruiters who enter the password will be able to view your public page.",
  },
];
