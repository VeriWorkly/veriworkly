import {
  Code,
  Globe,
  Shield,
  FileText,
  Sparkles,
  HelpCircle,
  DollarSign,
  CheckCircle2,
} from "lucide-react";

export const categories = [
  { id: "all", name: "All Questions", icon: HelpCircle },
  { id: "general", name: "General & Privacy", icon: Shield },
  { id: "documents", name: "Resumes & Documents", icon: FileText },
  { id: "ats", name: "ATS Resume Checker", icon: CheckCircle2 },
  { id: "portfolios", name: "Web Portfolios", icon: Globe },
  { id: "ai", name: "AI & Writing Credits", icon: Sparkles },
  { id: "billing", name: "Pricing, Passes & Billing", icon: DollarSign },
  { id: "developer", name: "Imports, API & Open Source", icon: Code },
] as const;

export interface FaqItem {
  id: string;
  category: (typeof categories)[number]["id"];
  question: string;
  answer: string;
}

export const faqs: FaqItem[] = [
  // 1. General & Privacy
  {
    id: "is-it-really-free",
    category: "general",
    question: "Is VeriWorkly really free, or will I hit a surprise paywall at the end?",
    answer:
      "You will never be tricked into paying at the end. On the free tier, you can create 1 resume and 1 cover letter, customize your layouts, and download your clean PDF, Word, or Markdown files as many times as you want without entering a credit card or hitting a paywall.",
  },
  {
    id: "data-privacy-storage",
    category: "general",
    question: "Where is my resume and personal career data stored?",
    answer:
      "Your data stays on your own device by default. VeriWorkly uses a local-first system that saves your resume drafts directly in your browser local storage. Nothing is sent to our servers or stored in any database unless you sign up for cloud sync or publish a web portfolio.",
  },
  {
    id: "account-requirement",
    category: "general",
    question: "Do I need to create an account to use VeriWorkly?",
    answer:
      "No. You can open the editor, create your resume and cover letter, and download your files right away without signing up. An account is only needed if you want cloud backups across devices, multiple documents, a public portfolio link, or paid AI writing credits.",
  },
  {
    id: "master-profile-concept",
    category: "general",
    question: "What is the Master Profile and how does it work?",
    answer:
      "The Master Profile is your personal career master file. You list all your past jobs, degrees, certifications, projects, and skills in one place. When you want to apply for a job, VeriWorkly creates a separate copy of that data for your new resume. You can edit and tailor that document as much as you like without changing your original master file.",
  },
  {
    id: "data-migration-transfer",
    category: "general",
    question: "How do I move my resume data to another computer?",
    answer:
      "You can download a backup JSON file from the editor settings and upload it to another computer or browser. If you prefer automatic sync, creating a free account backs up your data securely to the cloud so you can log in anywhere.",
  },
  {
    id: "analytics-tracking",
    category: "general",
    question: "Do you track visitors or sell user data?",
    answer:
      "No. We never sell personal data or track your activity across other websites. If you publish a public portfolio, our system counts basic page views and traffic sources anonymously so you can see how many people visited your link. We do not use third-party advertising cookies.",
  },
  {
    id: "mobile-support",
    category: "general",
    question: "Can I edit and download resumes on my phone or tablet?",
    answer:
      "Yes. The editor is fully mobile friendly. You can adjust bullet points, change templates, and download PDFs directly on your phone or tablet browser.",
  },

  // 2. Resumes & Cover Letters
  {
    id: "ats-friendly-templates",
    category: "documents",
    question: "Are your resume templates ATS-friendly?",
    answer:
      "Yes. Every template uses clear headings, standard system fonts, clean single-column reading hierarchy, and uncorrupted text streams. Standard applicant tracking systems can parse every section without jumbling your text or missing dates.",
  },
  {
    id: "watermarks-on-free-tier",
    category: "documents",
    question: "Do free PDF downloads have a watermark or logo?",
    answer:
      "No. Your exported PDF, Word, and Markdown files are 100% clean and professional. We never add VeriWorkly logos, watermarks, or promotional footer text to your documents.",
  },
  {
    id: "export-file-formats",
    category: "documents",
    question: "What file formats can I download?",
    answer:
      "You can export in PDF, Microsoft Word (DOCX), Markdown, HTML, plain text, and JSON backup format. Every export format is completely free.",
  },
  {
    id: "resume-customization-options",
    category: "documents",
    question: "How much can I customize the visual style of my resume?",
    answer:
      "You can adjust page margins, line spacing, font combinations, accent colors, and date formats. You can also reorder sections, hide sections you do not need, and watch changes update instantly in the live preview.",
  },
  {
    id: "custom-sections-support",
    category: "documents",
    question: "Can I add custom sections like Projects, Certifications, or Languages?",
    answer:
      "Yes. You can add as many custom sections as you want. Along with standard work experience and education, you can create sections for side projects, certifications, volunteer work, awards, publications, and languages.",
  },
  {
    id: "cover-letter-matching",
    category: "documents",
    question: "Can I create a matching cover letter for my resume?",
    answer:
      "Yes. You can build cover letters that automatically match your resume font, header style, and accent colors so your job application looks clean and consistent.",
  },
  {
    id: "password-protect-documents",
    category: "documents",
    question: "Can I password-protect shared links to my resume or cover letter?",
    answer:
      "Yes. If you share a live web link to your resume or cover letter, you can add a password so only recruiters or contacts with the password can open it.",
  },

  // 3. Free ATS Resume Checker
  {
    id: "ats-checker-overview",
    category: "ats",
    question: "How does the free ATS Resume Checker work?",
    answer:
      "Paste your resume text or upload your document, and optionally paste a job description. The scanner evaluates your document against core ATS requirements, checking formatting safety, contact info placement, clear headings, active verbs, and keyword alignment.",
  },
  {
    id: "ats-two-scores-explained",
    category: "ats",
    question: "What is the difference between the Readiness Score and Job Match Score?",
    answer:
      "The Readiness Score checks technical formatting, section order, and readability that apply to every job. The Job Match Score measures how closely your skills and experience match the specific job description you pasted. If you paste a job posting, you get both scores.",
  },
  {
    id: "ats-checker-limits",
    category: "ats",
    question: "How many free ATS scans do I get?",
    answer:
      "Free registered accounts get 2 full ATS scans every 24 hours. Visitors without an account get 1 scan every 48 hours. Paid plan and pass holders receive high-volume daily scans.",
  },
  {
    id: "ats-scan-privacy",
    category: "ats",
    question: "Do you save or train AI models on my scanned resume?",
    answer:
      "No. Scans are processed in-memory to generate your score report. We do not store your uploaded document text on our servers or use it to train public AI models.",
  },
  {
    id: "ats-improve-score",
    category: "ats",
    question: "How do I raise my Job Match Score?",
    answer:
      "Look at the missing keywords and skills identified in your report. Add the relevant tools, technologies, and responsibilities that you have real experience with into your work history and skills section.",
  },

  // 4. Web Portfolios & Hosting
  {
    id: "portfolio-builder-overview",
    category: "portfolios",
    question: "How does the personal portfolio website builder work?",
    answer:
      "The portfolio builder turns your career profile into a clean, mobile-friendly personal website in seconds. You can choose a template, select which projects and work experience to show, and publish it on your own custom subdomain (core templates are free to publish, with optional Pro themes available).",
  },
  {
    id: "custom-subdomain-setup",
    category: "portfolios",
    question: "How do custom subdomains and HTTPS work?",
    answer:
      "You can claim a clean web address like yourname.veriworkly.com. We take care of fast CDN hosting, DDoS protection, and automatic SSL certificates so your portfolio is always fast and secure over HTTPS.",
  },
  {
    id: "portfolio-free-preview",
    category: "portfolios",
    question: "Is portfolio website hosting free?",
    answer:
      "Yes. You can build, customize, and publish your portfolio website on a custom subdomain using our core templates completely free. Creator Pro or short-term passes unlock additional designer themes, custom analytics, and priority CDN image bandwidth.",
  },
  {
    id: "custom-apex-domains",
    category: "portfolios",
    question: "Can I connect my own custom domain like myname.com?",
    answer:
      "Right now, portfolios are hosted on clean veriworkly.com subdomains. Direct custom domain mapping (like yourname.com) is on our public roadmap and will be released in an upcoming update.",
  },
  {
    id: "media-hosting-limits",
    category: "portfolios",
    question: "Are there limits on images or project screenshots?",
    answer:
      "You can showcase as many projects as you need. Project screenshots and profile images are automatically optimized and served via our fast global CDN.",
  },
  {
    id: "portfolio-analytics-dashboard",
    category: "portfolios",
    question: "Can I see how many people visited my portfolio?",
    answer:
      "Creator Pro and pass holders get a private visitor dashboard showing total views and referral sources over time, with zero tracking cookies or invasive tracking.",
  },

  // 5. AI Assistant & Writing Credits
  {
    id: "ai-no-hallucinations",
    category: "ai",
    question: "How does the AI tailor resumes without inventing fake experience?",
    answer:
      "Our AI assistant is strictly grounded in the facts from your Master Profile. It rephrases bullet points, improves sentence flow, and aligns your wording with target job requirements, but it will never invent fake companies, unearned degrees, or fabricated metrics.",
  },
  {
    id: "ai-credits-usage",
    category: "ai",
    question: "What actions consume AI credits?",
    answer:
      "AI credits are only used when you generate a new cover letter, tailor bullet points to a specific job description, or rewrite summary text with AI. Standard editing, typing, changing templates, and exporting files are always free and use zero credits.",
  },
  {
    id: "ai-credits-rollover",
    category: "ai",
    question: "Do monthly AI credits roll over?",
    answer:
      "Monthly subscription plans reset to 1,000 fresh AI credits at the start of each billing cycle. If you purchase an individual one-time top-up pack, those extra credits never expire and stay in your account until you use them.",
  },
  {
    id: "ai-models-used",
    category: "ai",
    question: "Which AI models power the assistant?",
    answer:
      "We use top models from Anthropic, Google Gemini, and OpenAI. They are tuned to produce clear, natural, professional writing without generic corporate buzzwords or artificial phrasing.",
  },
  {
    id: "use-without-ai",
    category: "ai",
    question: "Can I use VeriWorkly completely without AI?",
    answer:
      "Yes. All templates, document editors, manual writing tools, and PDF exports work without using AI. You have total control over every single word in your document.",
  },

  // 6. Pricing, Passes & Billing
  {
    id: "flexible-passes-vs-subscriptions",
    category: "billing",
    question: "What are Flexible Sprint Passes and how do they work?",
    answer:
      "Flexible Sprint Passes are one-time purchases for active job searches. You pay once for 3 days ($2.99) or 7 days ($5.99) to get portfolio hosting and AI writing credits. They expire automatically with zero recurring charges, so you never have to worry about forgetting to cancel a subscription.",
  },
  {
    id: "paid-plans-summary",
    category: "billing",
    question: "What paid plans and passes are available?",
    answer:
      "We offer the 3-Day Sprint Pass ($2.99 one-time) and 7-Day Hunt Pass ($5.99 one-time). For ongoing searches, we offer the Job Hunter Bundle ($14.99/month, or $11.99/month billed annually with 1,000 monthly AI credits), Creator Pro hosting ($9.99/month, or $7.99/month billed annually), and AI Standalone ($5.99/month).",
  },
  {
    id: "payment-security",
    category: "billing",
    question: "How secure is the checkout process?",
    answer:
      "All payments are processed by Dodo Payments in compliance with strict PCI-DSS standards. We never see, store, or handle your credit card numbers.",
  },
  {
    id: "cancel-subscription",
    category: "billing",
    question: "How do I cancel my subscription?",
    answer:
      "You can cancel anytime with one click in your account settings. You will keep full access to your paid features until the end of your current billing period, and your card will never be charged again.",
  },
  {
    id: "refund-policy",
    category: "billing",
    question: "What is your refund policy?",
    answer:
      "Because we offer affordable short-term passes to try everything with no commitment, we generally do not offer refunds once a paid period begins. If you run into a technical bug or an accidental double charge, reach out to our support team and we will fix it for you promptly.",
  },
  {
    id: "affiliate-ambassador-programs",
    category: "billing",
    question: "Do you have an affiliate or campus ambassador program?",
    answer:
      "Yes. Our affiliate program offers 2% to 5% recurring monthly commissions on referred customers. We also run a Student Ambassador program with free pro access and career resources for campus organizers.",
  },

  // 7. Imports, API & Open Source
  {
    id: "linkedin-profile-import",
    category: "developer",
    question: "How does LinkedIn profile import work?",
    answer:
      "You can upload your exported LinkedIn profile data or paste the text directly into the importer. Our parser automatically organizes your job titles, company names, dates, descriptions, and skills into your Master Profile in seconds.",
  },
  {
    id: "github-repository-import",
    category: "developer",
    question: "Can I import projects directly from GitHub?",
    answer:
      "Yes. Connect your GitHub account via OAuth to import your public repositories, repository descriptions, star counts, and primary coding languages directly into your resume or portfolio projects.",
  },
  {
    id: "developer-api-access",
    category: "developer",
    question: "Does VeriWorkly have a developer API?",
    answer:
      "Yes. You can create secure, hashed API keys in your dashboard to access your profile data, document outputs, or public roadmap programmatically. API requests are rate-limited and protected by secure authentication.",
  },
  {
    id: "open-source-license",
    category: "developer",
    question: "Is VeriWorkly open-source and how is it licensed?",
    answer:
      "Yes. The core document builder and web engines are open-source under the MIT License on GitHub. You can view the source code, review our roadmap, or self-host the application.",
  },
  {
    id: "report-bugs-suggest-features",
    category: "developer",
    question: "Where can I report bugs or suggest new features?",
    answer:
      "You can open an issue or start a discussion on our official GitHub repository. You can also visit our public roadmap page to see what features we are building and vote on upcoming items.",
  },
];
