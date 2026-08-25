import type { LegalSection } from "@/components/legal/LegalSections";
import { siteConfig } from "@/config/site";

export const privacyEffectiveDate = "July 23, 2026";
export const privacyLastUpdated = "2026-07-23";

export const privacySections: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction & Scope",
    intro: [
      `This Privacy Policy explains how VeriWorkly ("VeriWorkly," "we," "us," or "our") collects, uses, stores, shares, and protects information when you use the VeriWorkly websites and applications, including ${siteConfig.url}, app.veriworkly.com, docs.veriworkly.com, blog.veriworkly.com, portfolio.veriworkly.com, and any subdomain of veriworkly.com you or another user publishes a portfolio to (together, the "Service").`,
      "We are a small, independent, open-core team. We are not a large corporation with a dedicated legal department, but we take the handling of your career data seriously, and this policy is written to be read and understood, not just filed away.",
      'This Policy applies to the Service as we operate it at veriworkly.com. It does not apply to independent self-hosted or forked deployments of our open-source code operated by third parties; see Section 18 ("Open Source & Self-Hosted Deployments") for how that distinction works.',
      "By using the Service, you agree to the collection and use of information in accordance with this Policy. If you do not agree, please do not use the Service.",
    ],
  },
  {
    id: "definitions",
    title: "Definitions",
    subsections: [
      {
        list: [
          '"Account" means a registered VeriWorkly user profile created via email OTP or OAuth sign-in.',
          '"Guest Session" means unauthenticated, local-only use of the Service without an Account, identified only by a browser-set session cookie.',
          '"Master Profile" means the single canonical record of your career facts (experience, education, skills, and similar sections) stored under your Account.',
          '"Document" means any resume, cover letter, portfolio, or link-in-bio record you create, whether stored locally, synced to our servers, or published publicly.',
          '"Local-First Storage" means data stored in your browser\'s LocalStorage rather than on our servers.',
          '"Personal Data" means any information that identifies or could reasonably be used to identify you.',
          '"Processing" means anything done with data - collecting, storing, using, disclosing, or deleting it.',
        ],
      },
    ],
  },
  {
    id: "controller",
    title: "Who We Are & How to Reach Us",
    intro: [
      `VeriWorkly is operated by an independent team. For all privacy questions, data requests, or complaints, contact us at ${siteConfig.email}. We aim to respond to privacy inquiries within 30 days, and typically much sooner.`,
      'If your jurisdiction requires you to be told the identity of the party responsible for processing your data (a "data controller" under GDPR or a similar concept elsewhere), that party is VeriWorkly, reachable at the email address above.',
    ],
  },
  {
    id: "information-we-collect",
    title: "Information We Collect",
    subsections: [
      {
        heading: "Information you provide directly",
        list: [
          "Account information: your email address, and if you sign in via Google, GitHub, or LinkedIn OAuth, the basic profile information those providers share with us (typically name, email, and avatar).",
          "Master Profile and document content: the career facts, work history, education, skills, and any other text, links, or details you type into the Document Studio, Master Profile editor, or Portfolio Builder.",
          "Portfolio content and media: text, project descriptions, and any images or screenshots you upload for a published portfolio (stored via Cloudflare R2 object storage).",
          "Billing information: when you subscribe or make a purchase, our payment processor, Dodo Payments, collects your payment card or payment method details directly. We do not receive or store your full card number.",
          "Support and contact form submissions: your name, email, subject, and message when you contact us.",
          "Affiliate and Ambassador program applications: referral codes, payout details necessary to pay commissions, and - for the Student Ambassador program - your college/university name and graduation year.",
          "Content you choose to import: if you use GitHub import, the repositories and profile data you authorize us to read. If you use LinkedIn import, the exported profile text you paste or upload. If you upload a legacy resume file (PDF, DOCX, TXT, MD, or JSON) for extraction, the contents of that file.",
        ],
      },
      {
        heading: "Information collected automatically",
        list: [
          "Aggregate, first-party product telemetry: counts of resumes created, documents exported, logins, and similar usage metrics, buffered and stored in aggregate form to help us understand product usage. This is not used to build individual behavioral profiles of you.",
          "Portfolio visitor analytics: if you publish a portfolio, we record aggregate view counts, a recent-activity trend, and referrer domains for that portfolio. This works without setting tracking cookies and does not attempt to identify individual visitors.",
          "Server and security logs: standard technical logs (IP address, user agent, request timestamps, and similar metadata) generated by normal web server and API operation, used for security, abuse prevention, and debugging, and retained only as long as reasonably necessary for those purposes.",
          "Essential cookies: an authentication session cookie once you log in, and a Guest Session cookie (valid for 30 days) that lets you use the Service without an Account. We do not use advertising cookies, cross-site tracking pixels, or third-party analytics trackers, and we do not run mouse-tracking or heatmap scripts.",
        ],
      },
      {
        heading: "Information from third parties",
        list: [
          "OAuth sign-in providers (Google, GitHub, LinkedIn) share the basic profile information you authorize when you use them to sign in.",
          "GitHub's API, when you use GitHub import, shares your public profile and repository data that you authorize us to access.",
          "Dodo Payments shares transaction status, subscription state, and the metadata necessary for us to grant entitlements and credits after a purchase - not your full payment credentials.",
        ],
      },
    ],
  },
  {
    id: "local-first-architecture",
    title: "Local-First Storage: Where Your Data Actually Lives",
    intro: [
      "VeriWorkly is built local-first. When you open the Document Studio or Portfolio Builder without logging in, your documents and Master Profile data are written directly to your browser's LocalStorage. Nothing is transmitted to our servers unless you take an action that requires it (for example, using an AI feature, requesting an ATS scan, importing from GitHub/LinkedIn, or logging in to enable cloud sync).",
      "If you never create an Account, your data lives only in that browser's local storage (plus a 30-day Guest Session cookie so you don't lose your place). Clearing your browser's site data, using a different browser or device, or reinstalling your OS will remove locally stored, un-synced data. We strongly recommend exporting a backup (available from the dashboard) or creating a free Account if you want durability across devices.",
      'If you log in, your Master Profile and documents are synchronized to our servers (PostgreSQL, with Redis used for caching and rate-limiting) so they\'re available across devices. You can opt individual documents out of cloud sync ("keep local only") from the dashboard.',
    ],
  },
  {
    id: "how-we-use-information",
    title: "How We Use Information",
    intro: ["We use the information described above to:"],
    subsections: [
      {
        list: [
          "Provide, operate, and maintain the Service - including the Document Studio, Master Profile, ATS Checker, Portfolio Builder, sharing, and export features.",
          'Process the AI features you explicitly trigger (see Section 8, "AI Features & Third-Party AI Processing").',
          "Process payments, manage subscriptions and credit balances, and enforce entitlements.",
          "Send transactional emails: welcome emails, new-device login alerts, and account-deletion confirmations. We do not send marketing email unless you separately opt in, and any such email would include an unsubscribe option.",
          "Detect, investigate, and prevent fraud, abuse, security incidents, and violations of our Terms of Service.",
          "Operate the affiliate and ambassador programs, including tracking referrals and calculating commissions.",
          "Understand aggregate product usage so we can prioritize what to build next.",
          "Comply with legal obligations and respond to lawful requests from public authorities.",
        ],
      },
    ],
  },
  {
    id: "legal-bases",
    title: "Legal Bases for Processing (EEA/UK Users)",
    intro: [
      "If you are located in the European Economic Area, the United Kingdom, or another jurisdiction that requires a stated legal basis for processing, we rely on the following bases:",
    ],
    subsections: [
      {
        list: [
          "Performance of a contract: processing your Account, Master Profile, and document data to provide the Service you've asked for.",
          "Consent: for optional features you explicitly enable, such as AI processing of your content, GitHub/LinkedIn import, or publishing a portfolio publicly. You can withdraw consent by not using the relevant feature or by deleting the associated content.",
          "Legitimate interests: aggregate product analytics, fraud and abuse prevention, and maintaining the security of the Service, balanced against your rights and freedoms.",
          "Legal obligation: where we must retain or disclose information to comply with applicable law.",
        ],
      },
    ],
  },
  {
    id: "ai-processing",
    title: "AI Features & Third-Party AI Processing",
    intro: [
      "VeriWorkly's AI writing assistant, resume tailoring, cover letter generation, portfolio copy generation, and the AI-powered layer of the ATS Checker are built on third-party large language model providers (currently including Anthropic's Claude and OpenAI's GPT models). This section explains, in plain terms, what that means for your data.",
    ],
    subsections: [
      {
        heading: "What gets sent, and when",
        paragraphs: [
          'Content is only sent to an AI model provider when you explicitly trigger an AI action - for example, clicking "Improve with AI," requesting AI resume tailoring against a job description, generating a cover letter, or requesting the AI-powered ATS deep-analysis layer. We do not run your Master Profile or documents through AI models in the background without your action.',
          "Before an AI action runs, the Service shows you the credit cost and mode (Standard or Expert) so you know what you're triggering. After generation, you explicitly choose to replace your existing text or discard the AI's draft - nothing is overwritten silently.",
        ],
      },
      {
        heading: "How third-party AI providers handle that data",
        paragraphs: [
          "Content sent for AI processing is transmitted to the relevant third-party model provider's API solely to generate the requested output, and is subject to that provider's own data handling, retention, and (where applicable) API-data-training policies, which are outside our direct control. We do not use your content to train our own foundation models, and to the extent we can configure it, we use API terms with model providers that are intended to exclude submitted content from being used to train their models - but you should not treat this Policy as a substitute for reading a given provider's own privacy documentation if you have specific concerns.",
          "We recommend avoiding pasting highly sensitive personal data (for example, government ID numbers, medical information, or financial account numbers) into AI-assisted fields beyond what is normal for a resume or cover letter.",
        ],
      },
      {
        heading: "Credits and processing records",
        paragraphs: [
          "We keep a ledger of AI credit grants, reservations, and debits tied to your Account so that a failed generation doesn't consume your balance, and so you can review your usage history from the Credits page. This ledger records that an AI action occurred and its cost - not necessarily the full content generated.",
        ],
      },
    ],
  },
  {
    id: "cookies",
    title: "Cookies & Similar Technologies",
    intro: [
      "We use a small number of essential, first-party cookies to operate the Service. We do not use third-party advertising cookies, cross-site tracking pixels, or session-replay/heatmap scripts.",
    ],
    subsections: [
      {
        list: [
          "Authentication session cookie (HttpOnly, Secure): keeps you logged in across VeriWorkly subdomains once you sign in via Better Auth.",
          "Guest Session cookie: a 30-day cookie that lets you use the Service without an Account and preserves your local session.",
          "Theme preference: a local, non-tracking preference for light/dark mode, stored in your browser.",
        ],
      },
      {
        paragraphs: [
          "Because these cookies are strictly necessary to operate the Service, we do not present a cookie-consent banner for them; disabling cookies in your browser will simply prevent login and guest-session persistence from working correctly.",
        ],
      },
    ],
  },
  {
    id: "sharing",
    title: "How We Share Information",
    intro: [
      "We do not sell your personal data, and we do not share it with data brokers, advertisers, or recruiter databases. We share information only in the following circumstances:",
    ],
    subsections: [
      {
        heading: "Service providers we use to operate VeriWorkly",
        list: [
          "Dodo Payments - payment processing and billing, under PCI-DSS-compliant handling. Dodo Payments processes your payment method directly; we receive transaction and subscription status, not your full card details.",
          "Cloudflare R2 - object storage for portfolio images and assets you upload.",
          "Infrastructure and hosting providers for our PostgreSQL database, Redis cache, and application servers.",
          "Better Auth (self-hosted authentication library) and, where you choose to use them, the OAuth providers Google, GitHub, and LinkedIn, solely to authenticate your sign-in.",
          "Third-party AI model providers (see Section 8) when you trigger an AI feature.",
        ],
      },
      {
        heading: "Public by your own choice",
        paragraphs: [
          "If you publish a portfolio, or create a public or unlisted share link for a document, the content of that portfolio or document becomes accessible to anyone with the URL (or, for public portfolios, to search engines and site visitors generally), until you unpublish it, revoke the link, or add password protection.",
        ],
      },
      {
        heading: "Legal and safety disclosures",
        paragraphs: [
          "We may disclose information if required to do so by law, subpoena, or other legal process, or where we believe in good faith that disclosure is reasonably necessary to protect the rights, property, or safety of VeriWorkly, our users, or the public, or to detect, prevent, or address fraud, security, or technical issues.",
        ],
      },
      {
        heading: "Business transfers",
        paragraphs: [
          "If VeriWorkly is involved in a merger, acquisition, financing, or sale of assets, your information may be transferred as part of that transaction. We will notify you (for example, via email or a prominent notice on the Service) before your Personal Data becomes subject to a different privacy policy.",
        ],
      },
    ],
  },
  {
    id: "retention",
    title: "Data Retention",
    intro: [
      "We retain different categories of information for different lengths of time, based on why we collected it:",
    ],
    subsections: [
      {
        list: [
          "Account, Master Profile, and synced document data: retained for as long as your Account is active. If you delete your Account, we delete or anonymize this data within a reasonable operational period, except where we are legally required or permitted to retain it longer (for example, billing records for tax/accounting purposes, or fraud-prevention records).",
          "Guest Session (local-first, no Account): data lives only in your browser and the Guest Session cookie, which expires automatically after 30 days of inactivity.",
          "Aggregate usage telemetry: retained in aggregate, de-identified form indefinitely, since it is not tied to identifying an individual once aggregated.",
          "Server and security logs: retained for a limited operational window sufficient for security and debugging purposes, then routinely purged or rotated.",
          "Billing records: retained as required by applicable tax, accounting, and financial regulations, generally several years after the relevant transaction.",
        ],
      },
    ],
  },
  {
    id: "your-rights",
    title: "Your Rights & Choices",
    intro: [
      "Regardless of where you live, we aim to give you meaningful control over your data. Depending on your jurisdiction, you may have some or all of the following rights:",
    ],
    subsections: [
      {
        list: [
          "Access: request a copy of the personal data we hold about you.",
          "Correction: fix inaccurate or incomplete data - most of this you can do yourself directly in the Master Profile or Account settings.",
          "Deletion: request deletion of your Account and associated data (available directly from Account settings, or by emailing us).",
          "Portability: export your data. A JSON export of your local or synced data is available from the dashboard at any time, without needing to contact support.",
          "Objection / restriction: object to or request that we restrict certain processing, such as aggregate analytics.",
          "Withdraw consent: for anything based on consent (for example, GitHub/LinkedIn import or AI processing), simply stop using that feature, or ask us to delete data already collected through it.",
          "Non-discrimination: we will not deny you service, charge you a different price, or provide a different level of service because you exercised a privacy right.",
        ],
      },
      {
        heading: "California residents (CCPA/CPRA)",
        paragraphs: [
          'California residents have the rights above, plus the right to know the categories of personal information we\'ve collected and the categories of third parties we\'ve shared it with (both described in this Policy), and the right to opt out of the "sale" or "sharing" of personal information - which we do not do; we do not sell or share your personal information for cross-context behavioral advertising.',
        ],
      },
      {
        heading: "How to exercise these rights",
        paragraphs: [
          `Use the self-service export and delete tools in your Account dashboard where available, or email ${siteConfig.email} with your request. We may need to verify your identity (typically by confirming the email address on your Account) before fulfilling certain requests.`,
        ],
      },
    ],
  },
  {
    id: "security",
    title: "Data Security",
    intro: ["We apply a defense-in-depth approach appropriate to a service of our size:"],
    subsections: [
      {
        list: [
          "Encryption in transit via HTTPS/TLS across all VeriWorkly domains and subdomains.",
          "Passwordless authentication (email OTP) plus OAuth, so there is no password database to compromise; sessions are secured with HttpOnly, Secure cookies.",
          "API keys and equivalent secrets are stored as irreversible hashes, never in plaintext.",
          "Tiered rate limiting across the API, with stricter limits on authentication endpoints and credit/quota-based (rather than raw-rate) limits on AI endpoints.",
          'Server-side-request-forgery (SSRF) protections on features that fetch external URLs (for example, the ATS Checker\'s "fetch job description from a URL" feature): HTTPS-only, private/loopback IP ranges blocked, resolved IPs pinned, and redirects/response size capped.',
          "Scoped CORS policy limited to VeriWorkly domains and portfolio subdomains, plus standard security headers applied globally.",
          "Internal audit logging of administrative actions (manual credit or entitlement grants, affiliate withdrawal approvals, and similar actions), so privileged access is accountable.",
        ],
      },
      {
        paragraphs: [
          "No method of transmission or storage is 100% secure, and we cannot guarantee absolute security. If you discover a security vulnerability, please report it responsibly per our Security Policy rather than disclosing it publicly.",
        ],
      },
    ],
  },
  {
    id: "international-transfers",
    title: "International Data Transfers",
    intro: [
      "VeriWorkly's infrastructure and service providers may process data in countries other than the one you live in, including the United States and other jurisdictions where our hosting, database, storage, payment, and AI-model providers operate. Where required, we rely on appropriate safeguards recognized under applicable law (such as standard contractual clauses or equivalent mechanisms) for these transfers. By using the Service, you understand that your information may be processed outside your home country.",
    ],
  },
  {
    id: "childrens-privacy",
    title: "Children's Privacy",
    intro: [
      "The Service is not directed to children under 16, and we do not knowingly collect personal data from anyone under that age. If we learn that we have inadvertently collected personal data from a child under 16, we will take reasonable steps to delete it. If you believe a child has provided us with personal data, please contact us.",
    ],
  },
  {
    id: "do-not-track",
    title: "Do Not Track Signals",
    intro: [
      'Some browsers offer a "Do Not Track" (DNT) signal. Because there is no single, industry-agreed way to interpret DNT signals, we do not currently respond to them differently - but as noted above, we already do not run third-party advertising trackers or cross-site behavioral tracking regardless of your browser\'s DNT setting.',
    ],
  },
  {
    id: "third-party-links",
    title: "Third-Party Links & Services",
    intro: [
      "The Service links to and integrates with third-party services - GitHub, LinkedIn, Google, and Dodo Payments among them - and published portfolios may link to other websites you or other users control. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies independently.",
    ],
  },
  {
    id: "open-source-self-hosted",
    title: "Open Source & Self-Hosted Deployments",
    intro: [
      "VeriWorkly's core document-builder and web engines are released under the MIT License. If you or someone else runs a self-hosted or forked instance of that code - rather than using the hosted Service at veriworkly.com and its official subdomains - this Privacy Policy does not apply to that independent deployment. The operator of that self-hosted instance is solely responsible for its own data practices, and you should direct privacy questions about it to them, not to us.",
    ],
  },
  {
    id: "automated-decisions",
    title: "Automated Decision-Making",
    intro: [
      "The ATS Checker's readiness score and keyword-match score, and the AI-powered analysis layered on top of it, are informational tools to help you improve your own documents. They are not used to make any decision about you (such as an employment or credit decision) with legal or similarly significant effect, and no output from VeriWorkly is shared with employers or recruiters unless you personally choose to share your resume, cover letter, or portfolio with them.",
    ],
  },
  {
    id: "changes-to-policy",
    title: "Changes to This Policy",
    intro: [
      `We may update this Privacy Policy from time to time to reflect changes in our practices, the Service, or applicable law. If we make material changes, we will update the "Last updated" date below and, where appropriate, provide additional notice (such as an in-app banner or an email to registered Accounts). Continued use of the Service after a change becomes effective constitutes acceptance of the revised Policy.`,
    ],
  },
  {
    id: "contact",
    title: "Contact Us",
    intro: [
      `Questions, requests, or concerns about this Privacy Policy or your data can be sent to ${siteConfig.email}. You can also reach us through the Contact page, or - for source-code-level questions about how data is handled - review the public repository at ${siteConfig.links.github}.`,
    ],
  },
];
