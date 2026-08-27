import type { Competitor } from "../types";

export const COMPETITORS: Competitor[] = [
  {
    id: "rezi",
    name: "Rezi",
    shortName: "Rezi",
    initials: "RZ",
    color: "#0EA5E9",
    website: "https://www.rezi.ai",
    positioning:
      "Rezi is an ATS resume builder built around the Rezi Score, grading your resume against job postings to find missing keywords.",
    verdict:
      "Rezi gives solid ATS feedback, but caps free users at just 3 PDF downloads total and forces you to sign up before you can type a word. VeriWorkly gives you the same job-matching ATS checks, but with unlimited downloads, no watermarks, and no login needed to start.",
    bestForCompetitor:
      "People who only need one resume and are ready to pay $29/month or $149 for a lifetime pass once they hit the 3-download limit.",
    bestForVeriworkly:
      "Job seekers who want to tailor resumes for multiple jobs, download as many PDFs or Word files as they need for free, and keep their information private.",
    pricingSummary:
      "The free plan stops after 1 resume and 3 PDF downloads. Upgrading to Pro costs $29/month or a one-time $149 lifetime fee.",
    pricingModel: "$29/month or $149 one-time lifetime",
    paidPlans: [
      "Pro Monthly: $29/month",
      "Lifetime Pass: $149 one-time payment",
      "Enterprise: $99/mo per 200 seats",
    ],
    standoutFeature:
      "Detailed ATS scoring: the Rezi Score checks your resume against pasted job posts and highlights missing keywords in real time.",
    knownLimitation:
      "The free plan locks you out after 3 PDF downloads. To keep applying, you have to buy the $29/month subscription or pay $149 upfront.",
    whySwitch:
      "You get the same job-description ATS keyword matching, but with unlimited free downloads in PDF, Word, and Markdown, plus a free online portfolio.",
    deepDive: [
      {
        title: "ATS Keyword Checks",
        competitorApproach:
          "Rezi compares your resume against a job post to calculate a score and list missing keywords.",
        veriworklyApproach:
          "VeriWorkly runs the same job-description keyword match and format checks without locking downloads afterwards.",
        takeaway:
          "Both tools help you beat automated filters; VeriWorkly lets you download your fixed resume for free.",
      },
      {
        title: "Download Limits",
        competitorApproach:
          "Caps you at 3 PDF downloads on the free plan, then asks for $29/month.",
        veriworklyApproach:
          "Unlimited PDF, Word (.docx), and Markdown downloads forever on the free plan.",
        takeaway: "No surprise paywalls when you are in the middle of sending job applications.",
      },
      {
        title: "Sign-Up Friction & Privacy",
        competitorApproach:
          "You must register an email and create an account before you can even see the editor.",
        veriworklyApproach:
          "Opens straight in your browser. Your data stays on your computer until you choose to sync.",
        takeaway:
          "You can finish a quick resume in minutes without handing over your personal email first.",
      },
    ],
    matrix: {
      loginRequired: "Required (free signup)",
      localFirst: false,
      openSource: false,
      freePlan: "1 resume, 3 downloads only",
      freeExport: "Capped at 3 PDF downloads",
      watermarkFree: true,
      atsChecker: "Included (Rezi Score)",
      coverLetterBuilder: true,
      portfolioBuilder: false,
      multiFormatExport: "PDF & DOCX",
      linkedinImport: "Not confirmed",
      githubImport: false,
    },
    faqs: [
      {
        question: "Is Rezi actually free to use?",
        answer:
          "Rezi has a free trial tier, but it stops after 3 PDF downloads. Once you reach that limit, you must pay $29 per month or $149 for a lifetime pass. VeriWorkly has no download limits on its free plan.",
      },
      {
        question: "Do I need an account to try Rezi?",
        answer:
          "Yes, Rezi asks for an email and account setup before letting you edit. VeriWorkly lets you build your resume immediately in your browser without logging in.",
      },
      {
        question: "Can Rezi build an online portfolio website?",
        answer:
          "No, Rezi only makes documents. VeriWorkly includes a personal portfolio builder with custom subdomain hosting (core templates are free, pro templates optional).",
      },
      {
        question: "How does VeriWorkly's ATS checker compare to Rezi?",
        answer:
          "Both tools let you paste a job posting and see which important keywords are missing from your resume. VeriWorkly gives you this check without restricting your downloads.",
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
      "Teal is a job-search tracker and resume builder with a browser extension that saves job postings from LinkedIn, Indeed, and other job boards.",
    verdict:
      "Teal is great if you want a Kanban board to bookmark jobs with a Chrome extension. But its in-depth ATS keyword matching costs ~$29/month with Teal+, and all your data lives on their servers. VeriWorkly is built for people who want private, local-first document creation, free ATS matching, and an online portfolio.",
    bestForCompetitor:
      "Job seekers who want an all-in-one bookmarking tool and tracker extension to organize dozens of job applications.",
    bestForVeriworkly:
      "People who want a private resume and portfolio maker with built-in ATS keyword matching and zero monthly fees.",
    pricingSummary:
      "Basic tracking and simple resume downloads are free. Full ATS matching and AI writing require Teal+ for roughly $29/month.",
    pricingModel: "~$29/month or ~$79/quarter for Teal+",
    paidPlans: ["Teal+ Monthly: ~$29/month", "Teal+ Quarterly: ~$79/quarter (~$26.33/mo)"],
    standoutFeature:
      "Job application tracker and Chrome extension that easily clips jobs from 50+ sites into an organized board.",
    knownLimitation:
      "In-depth ATS keyword matching against job postings requires the Teal+ upgrade (~$29/month), and some multi-column templates can confuse older ATS scanners.",
    whySwitch:
      "If you already organize your job hunt in a spreadsheet or Notion and just want a fast, private builder with full ATS checks and a personal website, VeriWorkly gives you that for free.",
    deepDive: [
      {
        title: "What Each Tool Is Built For",
        competitorApproach: "Teal is mainly a job application tracker with an added resume editor.",
        veriworklyApproach:
          "VeriWorkly is a focused workspace for creating resumes, cover letters, and web portfolios.",
        takeaway:
          "Use Teal if you need a job bookmarking board; use VeriWorkly if you want great documents and a live portfolio.",
      },
      {
        title: "Where Your Data Stays",
        competitorApproach: "Stored on central cloud servers under an account requirement.",
        veriworklyApproach:
          "Stored locally on your own computer first, with optional cloud backup when you want it.",
        takeaway: "Your career history and personal contact details stay under your control.",
      },
      {
        title: "Developer & Portfolio Features",
        competitorApproach:
          "Only creates PDF documents; does not build personal websites or sync with GitHub.",
        veriworklyApproach:
          "Syncs your GitHub repositories and hosts an online portfolio on your own subdomain.",
        takeaway: "Easily share both a traditional resume and an interactive project showcase.",
      },
    ],
    matrix: {
      loginRequired: "Required (free signup)",
      localFirst: false,
      openSource: false,
      freePlan: "Free basic tier",
      freeExport: "Unlimited basic PDFs",
      watermarkFree: true,
      atsChecker: "Basic (Full matching in Teal+)",
      coverLetterBuilder: true,
      portfolioBuilder: false,
      multiFormatExport: "PDF only",
      linkedinImport: true,
      githubImport: false,
    },
    faqs: [
      {
        question: "Is Teal free to use?",
        answer:
          "Teal has a helpful free plan for saving jobs and building basic resumes. However, full keyword matching against job descriptions and advanced AI features require Teal+ at around $29 per month.",
      },
      {
        question: "How is VeriWorkly different from Teal?",
        answer:
          "Teal is centered around tracking job applications with a browser extension. VeriWorkly focuses on crafting standout resumes, matching keywords for free, and hosting your personal portfolio website.",
      },
      {
        question: "Can I download a Word (DOCX) file from Teal?",
        answer:
          "Teal primarily exports PDF files. VeriWorkly gives you PDFs, editable Word (.docx) files, and Markdown so you are ready for any recruiter request.",
      },
      {
        question: "Do I have to sign up to use VeriWorkly?",
        answer:
          "No. You can start drafting and downloading right away without creating an account or providing an email.",
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
      "Kickresume is a template-focused resume, cover letter, and website builder with thousands of sample bullet points and hired examples.",
    verdict:
      "Kickresume offers nice visual templates and pre-written phrases, but locks fonts, colors, and premium designs behind monthly subscriptions ($4-$9/mo). VeriWorkly gives you clean typography, full styling freedom, and pay-as-you-go AI credits with no monthly commitments.",
    bestForCompetitor:
      "People who want to browse thousands of pre-written sample phrases and examples from hired candidates.",
    bestForVeriworkly:
      "Job seekers and developers who want clean designs, open-source privacy, zero sign-up friction, and easy GitHub syncing.",
    pricingSummary:
      "The free plan has limited styling and template options. Premium plans cost between $4 and $9/month depending on your billing term.",
    pricingModel: "$4 to $9/month depending on billing plan",
    paidPlans: [
      "Monthly: ~$9/month",
      "Quarterly: ~$6/month ($18 billed quarterly)",
      "Yearly: ~$4/month ($48 billed annually)",
    ],
    standoutFeature:
      "Huge library of 20,000+ pre-written bullet points and 1,500+ real resumes from hired applicants.",
    knownLimitation:
      "Font pairings, color options, and premium templates are locked on the free tier, and AI credits can run out mid-cycle even on paid plans.",
    whySwitch:
      "VeriWorkly does not hold fonts or styling hostage. You get great typography, free multi-format downloads, and no subscription traps.",
    deepDive: [
      {
        title: "Design Customization",
        competitorApproach:
          "Locks popular templates, colors, and custom fonts behind Kickresume Premium.",
        veriworklyApproach:
          "Gives you full control over typography, layouts, and document formatting with zero paywalls.",
        takeaway:
          "You will never spend an hour formatting a resume only to find out your font is locked.",
      },
      {
        title: "AI Writing & Credits",
        competitorApproach:
          "Bundles AI into recurring monthly plans with monthly limits that expire.",
        veriworklyApproach:
          "Uses simple pay-as-you-go AI credits with clear upfront pricing and no monthly fees.",
        takeaway: "Only pay for AI when you actually use it, instead of paying every single month.",
      },
      {
        title: "Online Portfolio Websites",
        competitorApproach:
          "Basic website conversion is free, but custom themes and custom links require a subscription.",
        veriworklyApproach:
          "Includes free core portfolio templates with custom subdomain hosting and GitHub project imports.",
        takeaway:
          "Get both a resume and an online portfolio ready for recruiters without extra software.",
      },
    ],
    matrix: {
      loginRequired: "Required (free signup)",
      localFirst: false,
      openSource: false,
      freePlan: "Limited templates & fonts",
      freeExport: "Basic templates only",
      watermarkFree: true,
      atsChecker: "Basic check",
      coverLetterBuilder: true,
      portfolioBuilder: "Included (Paid themes)",
      multiFormatExport: "PDF & DOCX (Premium)",
      linkedinImport: true,
      githubImport: false,
    },
    faqs: [
      {
        question: "Can I build a free portfolio on Kickresume?",
        answer:
          "Kickresume has basic web page conversion, but premium styles and custom domain options require a paid plan. VeriWorkly lets you host your portfolio on a custom subdomain for free using core templates, with optional Pro themes.",
      },
      {
        question: "Can I use Kickresume without creating an account?",
        answer:
          "No. You must sign up with email, Google, or LinkedIn before editing. VeriWorkly lets you start editing immediately with no sign-up.",
      },
      {
        question: "Are Kickresume templates ATS-friendly?",
        answer:
          "Many are, but some heavy multi-column and graphic designs can cause formatting issues with older company parsers. VeriWorkly templates are designed to be clean and readable for both humans and ATS scanners.",
      },
      {
        question: "How does VeriWorkly's pricing work compared to Kickresume?",
        answer:
          "Kickresume charges a recurring subscription ($4-$9/month). VeriWorkly has no monthly builder fee; the core editor is completely free, and AI suggestions use small, one-time credit packs.",
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
      "Novoresume is a minimalist, template-driven resume builder built for clean layouts and strict single-page resumes.",
    verdict:
      "Novoresume makes neat 1-page resumes, but locks 2-page resumes and extra fonts behind a $19.99/month paywall and cannot match your resume against specific job postings. VeriWorkly gives you multi-page flexibility, true job-matching ATS checks, and PDF/Word/Markdown downloads for free.",
    bestForCompetitor:
      "Students or entry-level candidates who want a strict 1-page template with rigid formatting rules.",
    bestForVeriworkly:
      "Experienced professionals, engineers, and career changers who need multi-page resumes, Word/Markdown downloads, and targeted ATS matching.",
    pricingSummary:
      "The free plan limits you to 1 page and 3 fonts. Premium costs ~$19.99/month, ~$39.99/quarter, or ~$99.99/year.",
    pricingModel: "$19.99/month or $99.99/year for Premium",
    paidPlans: [
      "Monthly: ~$19.99/month",
      "Quarterly: ~$39.99/quarter (~$13.33/mo)",
      "Annual: ~$99.99/year (~$8.33/mo)",
    ],
    standoutFeature:
      "Smart 1-page layout engine that keeps text neatly balanced on a single page without accidental page breaks.",
    knownLimitation:
      "Free resumes cannot exceed 1 page. There is no Word (DOCX) export, and the built-in checker only grades general completeness rather than comparing your text to a real job post.",
    whySwitch:
      "Novoresume charges $19.99/month as soon as your experience spills onto page two. VeriWorkly lets you write multi-page resumes and check them against real job descriptions for free.",
    deepDive: [
      {
        title: "Page Length Limits",
        competitorApproach:
          "Strict 1-page cap on the free plan; page 2 requires a $19.99/month Premium subscription.",
        veriworklyApproach:
          "Create 1-page, 2-page, or longer resumes on the free tier with complete page controls.",
        takeaway:
          "People with multiple years of experience can share their full background without paying a monthly fee.",
      },
      {
        title: "Job-Specific ATS Matching",
        competitorApproach:
          "Scores general resume neatness, but cannot compare your resume against a specific job post.",
        veriworklyApproach:
          "Compares your resume directly to the job description you want and lists exact missing skills.",
        takeaway: "Tailor your resume specifically for the job you are applying to today.",
      },
      {
        title: "File Formats",
        competitorApproach: "PDF only. Cannot produce editable Word (.docx) or Markdown files.",
        veriworklyApproach: "Exports instant PDF, editable Word (.docx), and clean Markdown files.",
        takeaway: "Ready for recruiters who specifically request a Word document.",
      },
    ],
    matrix: {
      loginRequired: "Required (free signup)",
      localFirst: false,
      openSource: false,
      freePlan: "1 single page only",
      freeExport: "PDF only (1 page max)",
      watermarkFree: true,
      atsChecker: "General neatness only (No job match)",
      coverLetterBuilder: true,
      portfolioBuilder: false,
      multiFormatExport: "PDF only",
      linkedinImport: false,
      githubImport: false,
    },
    faqs: [
      {
        question: "Can I make a 2-page resume for free on Novoresume?",
        answer:
          "No. Novoresume's free plan only permits a single page. Making a two-page resume requires the $19.99/month Premium plan. VeriWorkly supports multi-page resumes on its free plan.",
      },
      {
        question: "Does Novoresume check my resume against a job posting?",
        answer:
          "No. Novoresume grades general completeness (like whether you filled out all contact fields), but does not scan a job description for missing keywords. VeriWorkly checks your resume against the actual job you want.",
      },
      {
        question: "Can I export a Word file from Novoresume?",
        answer:
          "No. Novoresume only exports PDFs. VeriWorkly lets you download in PDF, Word (.docx), and Markdown formats.",
      },
      {
        question: "Do I have to sign up to use Novoresume?",
        answer:
          "Yes, Novoresume requires creating an account first. VeriWorkly works immediately in your browser with zero login friction.",
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
      "Zety is a step-by-step guided resume and cover letter wizard aimed at first-time job seekers, with pre-written bullet suggestions.",
    verdict:
      "Zety has a friendly step-by-step wizard, but only includes a plain text (.txt) download on the free plan. Downloading a formatted PDF or Word resume requires paying, usually through a $1.95 trial that turns into a recurring subscription. VeriWorkly gives you clean, formatted PDF and Word downloads 100% free with no credit card required.",
    bestForCompetitor:
      "First-time resume writers who want an interactive wizard to prompt them for every single field with pre-written sentences.",
    bestForVeriworkly:
      "Anyone who wants to build and download a real resume without hitting a credit card paywall or worrying about auto-renewing subscriptions.",
    pricingSummary:
      "Building is free, but formatted PDF/Word downloads require payment, usually a $1.95 14-day trial that renews into a ~$24.95/month subscription if not cancelled.",
    pricingModel: "$1.95 trial renewing into ~$24.95/month subscription",
    paidPlans: [
      "14-Day Trial: $1.95 (auto-renews to ~$24.95/mo unless cancelled)",
      "Annual Plan: ~$71.40/year",
    ],
    standoutFeature:
      "Step-by-step guided creation wizard with contextual pre-written phrases for hundreds of job titles.",
    knownLimitation:
      "The free download is plain text (.txt) only. To get a formatted PDF or Word file, you must enter a credit card for a trial that automatically renews monthly.",
    whySwitch:
      "Zety lets you finish your entire resume before telling you that formatted downloads cost money. VeriWorkly gives you free PDF and Word downloads from the very start, with no card needed.",
    deepDive: [
      {
        title: "Download Paywalls",
        competitorApproach:
          "Free plan only exports an unformatted plain-text (.txt) file; formatted PDFs require entering card details.",
        veriworklyApproach:
          "Formatted PDF, editable Word (.docx), and Markdown downloads are completely free.",
        takeaway: "We never hold your finished resume hostage after you spent time writing it.",
      },
      {
        title: "Auto-Renewing Trials",
        competitorApproach:
          "Offers a $1.95 14-day trial that turns into an ongoing monthly subscription ($24.95+/month) unless cancelled.",
        veriworklyApproach:
          "No credit card required. Free core builder forever, with optional one-time credit packs for AI.",
        takeaway:
          "You never need to remember to cancel a subscription after sending out a job application.",
      },
      {
        title: "Privacy & Account Safety",
        competitorApproach:
          "Requires creating an account and entering payment details on central servers.",
        veriworklyApproach:
          "Works locally in your browser. No account or credit card needed to download.",
        takeaway: "Zero risk of surprise billing on your bank statement.",
      },
    ],
    matrix: {
      loginRequired: "Required (free signup)",
      localFirst: false,
      openSource: false,
      freePlan: "Build only (Plain text export)",
      freeExport: "Plain text (.txt) only",
      watermarkFree: "N/A (PDF is paid only)",
      atsChecker: "Basic readability check",
      coverLetterBuilder: true,
      portfolioBuilder: false,
      multiFormatExport: "Paid for PDF/DOCX",
      linkedinImport: false,
      githubImport: false,
    },
    faqs: [
      {
        question: "Is Zety actually free to download a PDF resume?",
        answer:
          "No. You can write your resume for free, but downloading a formatted PDF or Word document requires payment. The only free download is a plain text (.txt) file. VeriWorkly gives you fully formatted PDF and Word downloads for free.",
      },
      {
        question: "What is Zety's $1.95 trial?",
        answer:
          "Zety offers an introductory 14-day trial for $1.95 to download your resume. If you do not cancel before the 14 days end, it auto-renews into a monthly charge (usually around $24.95/month). VeriWorkly requires no credit card and has no auto-renewing trials.",
      },
      {
        question: "Can I use Zety without creating an account?",
        answer:
          "No, Zety requires an email account before you can save or download. VeriWorkly works instantly with no account needed.",
      },
      {
        question: "Does Zety have a personal portfolio builder?",
        answer:
          "No, Zety only produces resumes and cover letters. VeriWorkly includes a portfolio builder to publish an online website alongside your documents.",
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
      "Enhancv is a design-focused resume builder featuring modern layouts, personal branding sections, and real-time writing tips.",
    verdict:
      "Enhancv offers sleek designs and unique personality sections, but puts an Enhancv watermark on free downloads and charges some of the highest subscription prices in the category ($13-$25/mo). VeriWorkly gives you modern typography, ATS checks, and clean unwatermarked exports without monthly fees.",
    bestForCompetitor:
      "Creatives who want unconventional resume sections (like 'Life Philosophy' or 'My Day') and are willing to pay $13 to $25 per month.",
    bestForVeriworkly:
      "Designers, developers, and professionals who want great typography and clean formatting with zero vendor watermarks and no recurring bills.",
    pricingSummary:
      "The free plan is a 7-day trial with a watermark on downloads. Pro plans cost ~$19.99/month (monthly) or ~$13.33/month (quarterly).",
    pricingModel: "$13.33 to $24.99/month depending on plan",
    paidPlans: [
      "Pro Weekly: $24.99/week",
      "Pro Monthly: $19.99/month",
      "Pro Quarterly: ~$39.99/quarter (~$13.33/mo)",
    ],
    standoutFeature:
      "Real-time writing auditor that flags passive voice, repetitive words, and missing numbers as you type.",
    knownLimitation:
      "Free downloads carry a permanent Enhancv watermark logo. Removing the watermark requires one of the most expensive subscriptions in the market.",
    whySwitch:
      "Enhancv stamps its logo on your free resume. VeriWorkly never adds watermarks to your downloads, keeping your resume 100% clean and professional for free.",
    deepDive: [
      {
        title: "Watermark Policy",
        competitorApproach:
          "Free and trial downloads include a visible Enhancv logo and watermark on your resume.",
        veriworklyApproach:
          "Zero watermarks or branding on your documents, whether you use free tools or paid add-ons.",
        takeaway:
          "Your resume is about you, not an advertisement for the tool you used to make it.",
      },
      {
        title: "Subscription Costs",
        competitorApproach:
          "Plans cost between $13.33/month and $24.99/week, adding up to significant expenses over a job search.",
        veriworklyApproach:
          "Core builder is free forever. AI credits are pay-as-you-go with no forced monthly subscriptions.",
        takeaway: "Save money during your job search while getting clean, professional results.",
      },
      {
        title: "ATS Compatibility vs Graphics",
        competitorApproach:
          "Visual widgets like pie charts and icons can sometimes confuse corporate ATS applicant parsers.",
        veriworklyApproach:
          "Clean typography-first layouts that look sharp for human recruiters and scan cleanly in ATS systems.",
        takeaway:
          "Great visual design without the risk of being filtered out by automated screening.",
      },
    ],
    matrix: {
      loginRequired: "Required (free signup)",
      localFirst: false,
      openSource: false,
      freePlan: "7-day trial with watermark",
      freeExport: "Watermarked on free tier",
      watermarkFree: "Paid plans only",
      atsChecker: "Included (Writing tips)",
      coverLetterBuilder: true,
      portfolioBuilder: false,
      multiFormatExport: "PDF & DOCX",
      linkedinImport: false,
      githubImport: false,
    },
    faqs: [
      {
        question: "Can I download an Enhancv resume for free without a watermark?",
        answer:
          "No. Free and trial downloads on Enhancv have a watermark and logo on the page. Removing the watermark requires upgrading to Pro ($13.33-$24.99/mo). VeriWorkly never puts watermarks or logos on your documents.",
      },
      {
        question: "Does Enhancv include an online portfolio builder?",
        answer:
          "No, Enhancv only makes resumes and cover letters. VeriWorkly includes a portfolio builder to publish a personal website on a custom subdomain (core templates free, pro templates optional).",
      },
      {
        question: "Is Enhancv worth the higher price?",
        answer:
          "Enhancv has nice design templates, but its monthly price is among the highest in the market. VeriWorkly gives you modern typography and ATS checks without recurring monthly bills.",
      },
      {
        question: "Can I use Enhancv without signing up?",
        answer:
          "No. You must create an account to edit and download. VeriWorkly works immediately in your browser with zero login friction.",
      },
    ],
  },
];

export function getCompetitor(id: string): Competitor | undefined {
  return COMPETITORS.find((competitor) => competitor.id.toLowerCase() === id.toLowerCase());
}
