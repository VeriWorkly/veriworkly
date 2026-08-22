import { Globe, FileText, Code, DollarSign, HelpCircle, KeyRound, Shield } from "lucide-react";

export const categories = [
  { id: "all", name: "All Questions", icon: HelpCircle },
  { id: "general", name: "General & Privacy", icon: Shield },
  { id: "documents", name: "Resumes & Documents", icon: FileText },
  { id: "portfolios", name: "Web Portfolios", icon: Globe },
  { id: "billing", name: "Billing & AI Credits", icon: DollarSign },
  { id: "developer", name: "ATS, Imports & API", icon: KeyRound },
  { id: "contribute", name: "Open Source & Contributions", icon: Code },
] as const;

export const faqs = [
  {
    id: "data-privacy",
    category: "general",
    question: "Is my data really private?",
    answer:
      "Yes. VeriWorkly uses a local-first architecture. Your document drafts and profile data are stored directly inside your browser's local storage (LocalStorage). Optional features like cloud backups and web portfolio subdomains are only activated when you choose to register and log in.",
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
      "Subdomain mapping is included in our Creator Pro tier. You can secure a unique URL (such as yourname.veriworkly.com). We automatically generate and renew SSL certificates to ensure your site is served securely via HTTPS.",
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
      "Yes. We offer a 3-Day Sprint Pass with 150 AI credits and a 7-Day Hunt Pass with 400 AI credits. Both passes grant full Creator Pro subdomain publishing and expire automatically without recurring charges.",
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
      "Today, Creator Pro publishes to a unique VeriWorkly subdomain (e.g. yourname.veriworkly.com) with automatic SSL. Fully custom domains (e.g. yourname.com) are not available yet — check the public roadmap for the latest status on that request.",
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
      "If you run out of credits, you can wait for your next monthly cycle reset, buy a one-time AI credit top-up, or purchase a 3-Day or 7-Day pass to reload your credit balance.",
  },
  {
    id: "refund-policy",
    category: "billing",
    question: "Do you offer refunds on passes or subscriptions?",
    answer:
      "Because we offer low-cost, time-boxed passes to fully test our hosting and AI systems before committing to a subscription, we generally do not issue refunds. However, if you experience double-billing or a technical failure, contact support to request a manual review.",
  },
  {
    id: "password-protection",
    category: "documents",
    question: "Can I password-protect shared documents or portfolio links?",
    answer:
      "Yes. When creating shared links for resumes, cover letters, or portfolio drafts, you can enable password protection. Only visitors or recruiters who enter the password will be able to view your public page.",
  },
  {
    id: "cover-letter-ai",
    category: "documents",
    question: "Can AI write my cover letter, or just my resume?",
    answer:
      "Both. The same AI writing assistant covers resumes and cover letters: generate a full cover letter from a job description, rewrite a section in Standard or Expert mode, or tailor an existing letter to a specific role. You always see the AI's draft and choose to replace your text or discard it — nothing is overwritten silently.",
  },
  {
    id: "ats-checker-free",
    category: "developer",
    question: "Is there a free ATS resume checker?",
    answer:
      "Yes. The ATS Checker runs a free, rules-based core scan (word count, contact details, required sections, action verbs, quantified achievements, and formatting risks like tables or headers that confuse parsers) and gives a readiness score plus a keyword-match score against a pasted job description. Anonymous visitors get 1 scan every 48 hours, and free logged-in accounts get 2 scans every 24 hours. A deeper AI-powered analysis layer — with missing-evidence detection and prioritized recommendations — is available on paid plans.",
  },
  {
    id: "ats-two-scores-explained",
    category: "developer",
    question: "Why are there two scores, and why doesn't the readiness score change much?",
    answer:
      'The readiness score measures parsing and formatting only — contact details, section labels, action verbs, quantified evidence, length, and table/header risks. It has nothing to do with any specific job, so two well-formatted resumes will land in a similar range even if their content is very different. The job match score is the one that changes with the role: it compares your resume against the pasted job description using synonym- and phrase-aware keyword matching, weighted toward terms in a "Requirements" section over a "Nice to have" one. If you want the match score to move, add a job description — the readiness score alone won\'t.',
  },
  {
    id: "ats-scoring-transparency",
    category: "developer",
    question: "Can I see exactly how the ATS Checker calculates its score?",
    answer:
      "The scanning categories are public — parsing, contact details, structure, evidence, and format risk, described above and on the checker page itself. The exact rule weights, regex patterns, and the synonym/phrase dictionary behind keyword matching are kept private, the same way the rest of VeriWorkly's AI prompts are: publishing the literal answer key would let anyone reverse-engineer a resume that scores well without actually being easier to parse or a better match for the role.",
  },
  {
    id: "github-import",
    category: "developer",
    question: "Can I import my GitHub profile into a resume?",
    answer:
      "Yes. GitHub import is a real OAuth connection: it pulls your profile and up to 30 repositories, then deterministically (no AI guesswork) maps your languages to skills and repositories to project entries. Free accounts can import their own connected GitHub account once per day; paid accounts can import any public GitHub username up to 50 times per day.",
  },
  {
    id: "linkedin-import",
    category: "developer",
    question: "How does LinkedIn import actually work?",
    answer:
      "LinkedIn does not offer a public API for profile data, so import works by pasting or uploading your exported LinkedIn profile text (for example, LinkedIn's own \"Save to PDF\" export). An AI call parses that text into structured resume data. This is different from GitHub import, which is a true OAuth API connection — we're upfront about that distinction. Free accounts get 1 LinkedIn import per month; paid accounts get unlimited imports.",
  },
  {
    id: "export-formats",
    category: "documents",
    question: "What file formats can I export my resume in?",
    answer:
      "Every resume and cover letter exports as PDF, DOCX, HTML, Markdown, plain text, or JSON from the same export menu — all free, with no format locked behind a paywall.",
  },
  {
    id: "developer-api",
    category: "developer",
    question: "Does VeriWorkly have a developer API?",
    answer:
      "Yes. From the API Keys page you can generate scoped keys to read or write your account and resume data, or read the public roadmap and your GitHub import data programmatically. Keys are stored as irreversible hashes, are rate-limited, and expire automatically after 365 days by default.",
  },
  {
    id: "affiliate-program-summary",
    category: "billing",
    question: "Does VeriWorkly have an affiliate or referral program?",
    answer:
      "Yes. The affiliate program pays a recurring commission on referred subscriptions across three tiers — 2% with no minimum, 3% after 10 conversions, and 5% after 50 conversions — tracked through a partner dashboard with click and conversion analytics and a $25 minimum payout. There's also a separate Student Ambassador program for campus representatives. See the Affiliate and Ambassador pages for details.",
  },
];
