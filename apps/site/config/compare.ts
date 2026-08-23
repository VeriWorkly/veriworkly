export const PRICING_VERIFIED_AT = "August 2026";

export type MatrixValue = boolean | string;

export interface CompetitorFeatureMatrix {
  loginRequired: MatrixValue;
  localFirst: MatrixValue;
  openSource: MatrixValue;
  freePlan: MatrixValue;
  freeExport: MatrixValue;
  atsChecker: MatrixValue;
  portfolioBuilder: MatrixValue;
  linkedinImport: MatrixValue;
  githubImport: MatrixValue;
}

export interface CompetitorFaq {
  question: string;
  answer: string;
}

export interface Competitor {
  id: string;
  name: string;
  shortName: string;
  initials: string;
  color: string;
  website: string;
  positioning: string;
  pricingSummary: string;
  paidPlans: string[];
  standoutFeature: string;
  knownLimitation: string;
  whySwitch: string;
  matrix: CompetitorFeatureMatrix;
  faqs: CompetitorFaq[];
}

export const VERIWORKLY_MATRIX: CompetitorFeatureMatrix = {
  loginRequired: "Not required to start",
  localFirst: true,
  openSource: true,
  freePlan: true,
  freeExport: "Unlimited, no watermark",
  atsChecker: true,
  portfolioBuilder: true,
  linkedinImport: true,
  githubImport: true,
};

export const FEATURE_ROWS: Array<{ key: keyof CompetitorFeatureMatrix; label: string }> = [
  { key: "loginRequired", label: "Account required to start building" },
  { key: "localFirst", label: "Local-first storage (data stays on your device first)" },
  { key: "openSource", label: "Open-source codebase" },
  { key: "freePlan", label: "Free plan available" },
  { key: "freeExport", label: "Free export / download" },
  { key: "atsChecker", label: "ATS resume checker" },
  { key: "portfolioBuilder", label: "Portfolio / personal website builder" },
  { key: "linkedinImport", label: "LinkedIn import" },
  { key: "githubImport", label: "GitHub import" },
];

export const COMPETITORS: Competitor[] = [
  {
    id: "rezi",
    name: "Rezi",
    shortName: "Rezi",
    initials: "RZ",
    color: "#0EA5E9",

    website: "https://www.rezi.ai",

    positioning:
      "Rezi is an ATS resume builder built around the Rezi Score, a keyword and formatting checker that grades your resume against a target job post.",
    pricingSummary:
      "Free plan caps you at 1 resume and 3 PDF downloads. Pro is $29/month, or $149 once for lifetime access.",

    paidPlans: ["Pro — $29/month", "Lifetime — $149 one-time", "Enterprise — $99/mo per 200 seats"],

    standoutFeature:
      "Deep ATS keyword scoring — the Rezi Score checker is a core, heavily-used part of the product, not an afterthought.",
    knownLimitation:
      "The free tier caps you at 3 PDF downloads and 1 resume, and the interface prioritizes function over design polish.",
    whySwitch:
      "Want Rezi's scoring rigor without the download cap or the account wall? VeriWorkly runs the same kind of keyword and formatting checks, with unlimited free exports and no login to start.",

    matrix: {
      loginRequired: "Required (free, no card)",
      localFirst: false,
      openSource: false,
      freePlan: true,
      freeExport: "Limited — 3 PDF downloads, unlimited DOCX",
      atsChecker: true,
      portfolioBuilder: false,
      linkedinImport: "Not confirmed",
      githubImport: false,
    },

    faqs: [
      {
        question: "Is Rezi free?",
        answer:
          "Rezi has a free plan, but it's capped at one resume and three PDF downloads total. Unformatted, unlimited exports require the $29/month Pro plan or the $149 one-time lifetime plan.",
      },

      {
        question: "Do I need an account to use Rezi?",
        answer:
          "Yes — Rezi requires a free account before you can start building. VeriWorkly lets you start building a resume immediately, with no login and no email required.",
      },

      {
        question: "Does Rezi have a portfolio or personal website builder?",
        answer:
          "No — Rezi is focused on the resume and its ATS checker; it doesn't build a personal website. VeriWorkly bundles a portfolio builder alongside the resume and cover letter tools at no extra cost.",
      },

      {
        question: "What's a good free alternative to Rezi?",
        answer:
          "VeriWorkly is the closest free match: an ATS checker with the same keyword-and-formatting logic, plus unlimited PDF/DOCX exports with no watermark and no download cap, starting with no account.",
      },
    ],
  },

  {
    id: "teal",
    name: "Teal",
    shortName: "Teal",
    initials: "TL",
    color: "#14B8A6",

    website: "https://www.tealhq.com",

    positioning:
      "Teal is a job-search organization platform — job tracker, browser extension, and resume builder in one product, built for more than just the document.",
    pricingSummary:
      "The free plan is unusually generous (unlimited resumes and PDFs). Teal+ adds AI writing and unlimited ATS matching for roughly $29/month.",

    paidPlans: ["Teal+ Monthly — ~$29/month", "Teal+ Quarterly — ~$79/quarter"],

    standoutFeature:
      "A job tracker and Chrome extension (4.9/5 on the Chrome Web Store) that auto-captures postings from 50+ job boards — a genuinely different tool than a resume builder.",
    knownLimitation:
      "Premium pricing has been reported as confusing across weekly, monthly, and quarterly framing, and some users flag formatting issues with two-column templates in ATS parsers.",
    whySwitch:
      "Teal's free tier is genuinely generous for a resume builder, but it's still account-based and cloud-only. If local-first storage, no login, and an open-source codebase matter to you, that's the gap VeriWorkly fills.",

    matrix: {
      loginRequired: "Required (free, no card)",
      localFirst: false,
      openSource: false,
      freePlan: true,
      freeExport: "Yes — unlimited on the free tier",
      atsChecker: true,
      portfolioBuilder: false,
      linkedinImport: true,
      githubImport: false,
    },

    faqs: [
      {
        question: "Is Teal actually free?",
        answer:
          "Yes, more so than most competitors — unlimited resumes and PDF downloads, plus the job tracker, are free. Teal+ (around $29/month) adds AI writing tools and unlimited ATS keyword matching.",
      },

      {
        question: "Do I need to sign up to use Teal?",
        answer:
          "Yes — Teal requires a free account before you can build a resume or use the tracker. VeriWorkly's resume and portfolio builder works immediately with no login required.",
      },

      {
        question: "What does Teal do that VeriWorkly doesn't?",
        answer:
          "Teal's job-application tracker and browser extension are its strongest differentiators — VeriWorkly doesn't track applications. VeriWorkly's focus is the document side: resume, cover letter, portfolio, and Master Profile sync, without an account requirement.",
      },

      {
        question: "Is there a local-first alternative to Teal?",
        answer:
          "VeriWorkly is the closer fit if privacy is the priority: it's open-source, stores data locally first, and doesn't require an account to build a resume, cover letter, or portfolio.",
      },
    ],
  },

  {
    id: "kickresume",
    name: "Kickresume",
    shortName: "Kickresume",
    initials: "KR",
    color: "#F97316",

    website: "https://www.kickresume.com",

    positioning:
      "Kickresume is a design-forward resume, cover letter, and personal-website builder with a large template and phrase library.",
    pricingSummary:
      "Free plan has limited customization. Paid plans run from about $4 to $9/month depending on billing term, cheapest when paid yearly.",

    paidPlans: ["Monthly — ~$9/month", "Quarterly — ~$6/month", "Yearly — ~$4/month"],

    standoutFeature:
      "Combines a resume builder, cover letter builder, and personal website builder with a 20,000+ phrase and 1,500+ example library in one product.",
    knownLimitation:
      "Some users describe the AI suggestions as generic, and there are reports of hitting AI usage caps mid-cycle even on paid plans.",
    whySwitch:
      "Kickresume is the closest of these competitors to VeriWorkly in scope — resume, cover letter, and a website builder. The difference is the account model: Kickresume requires login and stores everything in its cloud, while VeriWorkly starts local, requires no login, and is open-source.",

    matrix: {
      loginRequired: "Required — no way to try without an account",
      localFirst: false,
      openSource: false,
      freePlan: true,
      freeExport: "Limited customization on free plan",
      atsChecker: true,
      portfolioBuilder: true,
      linkedinImport: true,
      githubImport: false,
    },

    faqs: [
      {
        question: "Does Kickresume have a website builder like VeriWorkly?",
        answer:
          "Yes — Kickresume includes personal website templates, similar to VeriWorkly's portfolio builder. Kickresume gates more website templates behind Premium; VeriWorkly's portfolio builder is free to start.",
      },

      {
        question: "Can I try Kickresume without signing up?",
        answer:
          "No — Kickresume requires an account (email, Google, LinkedIn, Facebook, or Apple) before you can start building. VeriWorkly doesn't require login to start a resume, cover letter, or portfolio.",
      },

      {
        question: "Is Kickresume's free plan good enough to actually use?",
        answer:
          "It's usable but limited — customization options are restricted on the free tier, and Premium unlocks the full template and phrase library. VeriWorkly's free tier isn't gated behind a customization paywall.",
      },

      {
        question: "What's a free, open-source alternative to Kickresume?",
        answer:
          "VeriWorkly covers the same ground — resume, cover letter, and portfolio in one place — but is open-source, local-first, and doesn't require an account to start building.",
      },
    ],
  },

  {
    id: "novoresume",
    name: "Novoresume",
    shortName: "Novoresume",
    initials: "NV",
    color: "#6366F1",

    website: "https://novoresume.com",

    positioning:
      "Novoresume is a clean, minimalist, template-driven resume builder aimed at simplicity over feature breadth.",
    pricingSummary:
      "Free plan is capped at one single-page resume with 3 fonts. Premium runs from about $20 to $100 depending on billing term.",

    paidPlans: ["Monthly — ~$19.99", "Quarterly — ~$39.99", "Annual — ~$99.99"],

    standoutFeature:
      "A simple, uncluttered editor and template design — PDF-only export keeps formatting reliable across every template.",
    knownLimitation:
      "No Word/DOCX export (PDF only), the free plan caps you at one single-page resume, and its ATS checker scores general completeness rather than matching a specific job description.",
    whySwitch:
      "Novoresume's simplicity is real, but the free plan caps you at one page and its ATS checker doesn't do job-description keyword matching. VeriWorkly's checker matches against a target job description, and the free plan isn't limited to a single page.",

    matrix: {
      loginRequired: "Required",
      localFirst: false,
      openSource: false,
      freePlan: "Yes — capped at 1 page",
      freeExport: "PDF only, 1-page limit on free plan",
      atsChecker: "Limited — no job-description keyword match",
      portfolioBuilder: false,
      linkedinImport: false,
      githubImport: false,
    },

    faqs: [
      {
        question: "Does Novoresume's free plan let me export a full resume?",
        answer:
          "It's capped at one page, three fonts, and no cover letter. VeriWorkly's free tier doesn't cap you to one page or restrict which document types you can build.",
      },

      {
        question: "Does Novoresume check my resume against a specific job posting?",
        answer:
          "No — its ATS checker scores general resume quality and completeness rather than matching keywords against a specific job description. VeriWorkly's ATS checker is built around matching a resume to a target job posting.",
      },

      {
        question: "Can I export a Word (DOCX) file from Novoresume?",
        answer:
          "No — Novoresume only exports to PDF. VeriWorkly exports to PDF, DOCX, and Markdown, which matters if a recruiter or ATS specifically asks for a Word file.",
      },

      {
        question: "What's a free alternative to Novoresume without the 1-page limit?",
        answer:
          "VeriWorkly matches Novoresume's clean, template-driven approach but doesn't cap free users to a single page, and adds PDF, DOCX, and Markdown export plus a job-description-aware ATS checker.",
      },
    ],
  },

  {
    id: "zety",
    name: "Zety",
    shortName: "Zety",
    initials: "ZT",
    color: "#EC4899",

    website: "https://zety.com",

    positioning:
      "Zety is a guided, wizard-style resume and cover letter builder aimed at first-time resume writers, with pre-written bullet-point suggestions at every step.",
    pricingSummary:
      "Building is free, but only a plain-text download is included. A formatted PDF or Word file requires a paid plan, usually a $1.95 trial that renews into a subscription.",

    paidPlans: [
      "14-day trial — $1.95, then a recurring subscription if not cancelled",
      "Annual — ~$71.40/year",
    ],

    standoutFeature:
      "A step-by-step guided wizard with pre-written bullet-point suggestions, popular with people writing a resume for the first time.",
    knownLimitation:
      "A low-cost trial converting into a recurring subscription is Zety's most consistently reported complaint, with some users describing difficulty cancelling once a file has been downloaded. Check the cancellation terms closely before entering payment details.",
    whySwitch:
      "Zety's guided wizard is genuinely useful for a first resume, but a formatted download requires paying — typically through a trial that renews into a subscription. VeriWorkly's full PDF and DOCX export is free, with no trial-to-subscription conversion.",

    matrix: {
      loginRequired: "Required",
      localFirst: false,
      openSource: false,
      freePlan: "Build only — plain text export only",
      freeExport: "Plain text (.txt) only; PDF/Word requires a paid plan",
      atsChecker: "Not confirmed as a dedicated feature",
      portfolioBuilder: false,
      linkedinImport: false,
      githubImport: false,
    },

    faqs: [
      {
        question: "Is Zety really free?",
        answer:
          "You can build a resume for free, but only a plain-text download is included. A formatted PDF or Word document requires a paid plan — commonly a 14-day, $1.95 trial that renews into a subscription if not cancelled.",
      },

      {
        question: "Why do people complain about Zety's pricing?",
        answer:
          "The most common complaint is the low-cost trial converting into a recurring subscription, with some users reporting difficulty cancelling. If you go this route, check the cancellation terms closely before entering payment details.",
      },

      {
        question: "Can I download a formatted resume from Zety without paying?",
        answer:
          "No — the free tier only exports plain text (.txt), which most recruiters and ATS systems won't accept as a final document. A paid plan is required for a formatted PDF or Word file.",
      },

      {
        question: "What's a free alternative to Zety with no trial-to-subscription trap?",
        answer:
          "VeriWorkly offers the same guided building experience with formatted PDF and DOCX exports free from the start — no trial, no card required, and no auto-renewing subscription to remember to cancel.",
      },
    ],
  },

  {
    id: "enhancv",
    name: "Enhancv",
    shortName: "Enhancv",
    initials: "EN",
    color: "#8B5CF6",

    website: "https://enhancv.com",

    positioning:
      "Enhancv is a design-forward resume builder with distinctive templates and personal-branding sections, like a life-philosophy block.",
    pricingSummary:
      "The 7-day free plan is capped and watermarked. Pro plans run $13-$25/month depending on billing term, on the higher end for this category.",

    paidPlans: ["Pro Weekly — $24.99", "Pro Monthly — $19.99", "Pro Quarterly — ~$13.33/month"],

    standoutFeature:
      "A real-time content analyzer that flags vague phrasing and missing metrics as you write, plus visually modern templates built around personal-branding sections.",
    knownLimitation:
      "Pricing is on the higher end of this category, the free plan forces an Enhancv watermark onto downloads, and some users report surprise renewal charges.",
    whySwitch:
      "Enhancv's content analyzer is a genuinely useful writing aid, but the free plan is time-limited and watermarked. VeriWorkly's AI writing tools are credit-metered with the cost shown before you generate, and free exports carry no watermark, ever.",

    matrix: {
      loginRequired: "Required",
      localFirst: false,
      openSource: false,
      freePlan: "7-day trial, capped and watermarked",
      freeExport: "Branded/watermarked on the free plan",
      atsChecker: true,
      portfolioBuilder: false,
      linkedinImport: false,
      githubImport: false,
    },

    faqs: [
      {
        question: "Does Enhancv's free plan remove the watermark?",
        answer:
          "No — free and trial downloads on Enhancv carry Enhancv branding. Removing the watermark requires a paid Pro plan, priced from about $13 to $25 per month depending on billing term.",
      },

      {
        question: "Is Enhancv worth the higher price?",
        answer:
          "Its content analyzer and personal-branding template sections are distinctive. Whether that justifies a $19.99+/month plan depends on how much you value that specific writing feedback versus a free, unwatermarked alternative.",
      },

      {
        question: "Can I download an Enhancv resume for free without a watermark?",
        answer:
          "No — Enhancv's free tier is a 7-day trial that watermarks every download and caps content at 12 items. VeriWorkly's free exports have no time limit, no watermark, and no content cap.",
      },

      {
        question: "What's a free alternative to Enhancv without a watermark or trial limit?",
        answer:
          "VeriWorkly offers an ATS checker and unlimited PDF/DOCX exports with no watermark and no 7-day countdown, so you can keep refining a resume for as long as you need.",
      },
    ],
  },
];

export function getCompetitor(id: string): Competitor | undefined {
  return COMPETITORS.find((competitor) => competitor.id === id);
}
