import type { LegalSection } from "./types";

import { siteConfig } from "@/config/site";

export const termsEffectiveDate = "July 23, 2026";
export const termsLastUpdated = "2026-07-23";

export const termsSections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of Terms",
    intro: [
      `These Terms of Service ("Terms") are a binding agreement between you and VeriWorkly ("VeriWorkly," "we," "us," or "our") governing your access to and use of the VeriWorkly websites and applications, including ${siteConfig.url}, app.veriworkly.com, docs.veriworkly.com, blog.veriworkly.com, portfolio.veriworkly.com, and any subdomain published through the Portfolio Builder (together, the "Service").`,
      "By creating an Account, starting a Guest Session, or otherwise using the Service, you agree to these Terms and to our Privacy Policy, which is incorporated into these Terms by reference. If you do not agree, do not use the Service.",
      "We are a small, independent, open-core team, not a large corporation. These Terms are written to be genuinely readable, and to fairly balance your interests as a user against our need to operate a sustainable, honestly-run service.",
    ],
  },
  {
    id: "eligibility",
    title: "Eligibility",
    intro: [
      "You must be at least 18 years old to use the Service. By creating an Account or starting a Guest Session, you confirm that you are 18 or over and that you have the legal capacity to enter into these Terms. If you are using the Service on behalf of an organization, you represent that you have authority to bind that organization to these Terms.",
      "We set a flat 18+ floor deliberately. India's data protection framework treats everyone under 18 as a child, which brings requirements around verifiable parental consent and restrictions on tracking and targeted advertising that we are not equipped to meet responsibly. Rather than build partial machinery around them, we do not offer the Service to under-18s at all.",
      "We ask you to confirm your age when you create an Account and when you apply to the Student Ambassador programme, and we record that confirmation. If we learn that an account belongs to someone under 18, we will close it and delete the associated personal data. If you believe a child has created an account, contact our Grievance Officer using the details in Section 25.",
    ],
  },
  {
    id: "description-of-service",
    title: "Description of the Service",
    intro: [
      "VeriWorkly is a career workspace offering, among other things: a resume and cover letter document editor, a Master Profile, an ATS Checker, AI-assisted writing tools, GitHub and LinkedIn import, document sharing and export, a Portfolio Builder for publishing personal websites, a developer API, and affiliate/ambassador partner programs.",
      'Not every feature described in our marketing materials, blog, or public roadmap is available to every account at every time. Some features are gated by subscription tier, are in limited or admin-only rollout, or are still in development and shown on our public roadmap as planned or in-progress rather than shipped. We try to be precise about what is currently available versus planned, but the Service evolves, and features may be added, changed, limited, or removed as described in Section 19 ("Service Availability & Modifications").',
    ],
  },
  {
    id: "accounts",
    title: "Accounts & Registration",
    subsections: [
      {
        heading: "No account required to start",
        paragraphs: [
          "You can use the core Document Studio - building a resume or cover letter and exporting a PDF - without registering an Account. Logging in is required only for cloud sync, sharing, AI features, the ATS Checker beyond the anonymous quota, GitHub/LinkedIn import, portfolio publishing, billing, and the developer API.",
        ],
      },
      {
        heading: "Creating an account",
        paragraphs: [
          "Accounts are created via passwordless email OTP or OAuth sign-in (Google, GitHub, or LinkedIn). You agree to provide accurate information, to keep your Account credentials (including access to your email inbox or connected OAuth account) secure, and to notify us promptly of any unauthorized use of your Account. You are responsible for all activity that occurs under your Account.",
        ],
      },
      {
        heading: "One account per person",
        paragraphs: [
          "Accounts are personal to you. You may not create multiple Accounts to circumvent free-tier limits, AI credit quotas, ATS scan quotas, affiliate program rules, or any other restriction described in these Terms. We reserve the right to merge, suspend, or terminate Accounts we reasonably believe were created to evade these limits.",
        ],
      },
    ],
  },
  {
    id: "guest-local-first",
    title: "Guest Sessions & Local-First Data Risk",
    intro: [
      "If you use the Service without an Account, your documents and Master Profile are stored only in your browser's local storage (LocalStorage) and are tracked to a 30-day Guest Session cookie. This is a deliberate design choice to let you start immediately, without a signup wall - but it comes with a real risk you should understand and accept:",
    ],
    subsections: [
      {
        list: [
          "Clearing your browser's site data, browsing in a private/incognito window, switching browsers or devices, or reinstalling your operating system will permanently delete un-synced local data. We cannot recover it.",
          "The Guest Session cookie expires automatically after 30 days of inactivity, after which locally stored data associated with it may no longer be reachable through the normal UI flow.",
          "You are solely responsible for exporting a backup (available from the dashboard) or creating a free Account with cloud sync enabled if you want durability across sessions, browsers, or devices.",
          'We are not liable for any loss of locally stored data, however caused, as further described in Section 21 ("Limitation of Liability").',
        ],
      },
    ],
  },
  {
    id: "master-profile-documents",
    title: "Master Profile & Documents",
    intro: [
      'Your Master Profile is your canonical career record. New resumes, cover letters, and portfolios are seeded from a snapshot of your Master Profile at the moment you create them. Editing a specific document afterward does not write back to or overwrite your Master Profile - only an explicit "replace master" action (available in the GitHub/LinkedIn import flow) or directly editing the Master Profile page updates it. Understanding this one-way relationship is your responsibility if you tailor multiple documents from the same profile.',
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use Policy",
    intro: ["You agree not to use the Service to:"],
    subsections: [
      {
        list: [
          "Upload, generate, publish, or share content that is illegal, defamatory, harassing, hateful, obscene, or that infringes any person's intellectual property, privacy, or other legal rights.",
          "Submit another person's personal data (for example, building a resume, cover letter, or portfolio impersonating someone else) without that person's consent.",
          "Attempt to gain unauthorized access to any account, system, or data not belonging to you, including through credential stuffing, session hijacking, or exploiting a vulnerability rather than reporting it under our Security Policy.",
          "Scrape, crawl, or use automated means to extract data from the Service at a volume or pattern inconsistent with normal individual use, or to build a competing dataset or product from our template designs, roadmap content, or user-generated portfolio content.",
          "Circumvent, disable, or interfere with rate limits, AI credit quotas, ATS scan quotas, security features, or entitlement checks, including through the use of multiple accounts, automation, or technical workarounds.",
          "Reverse engineer, decompile, or attempt to derive source code from the closed portions of the Service (this restriction does not apply to the portions of our code already released under the MIT License in our public repository - see Section 18).",
          "Introduce malware, or engage in denial-of-service attacks, spamming, or any activity that disrupts the Service for other users.",
          "Use the developer API or any automated tooling in a way that exceeds the rate limits or scopes granted to your API key, or attempt to use AI-related scopes that have not been issued to you.",
          "Engage in fraudulent affiliate or ambassador activity, including self-referrals, fake accounts, incentivized/purchased traffic prohibited by the affiliate terms, or misrepresenting your relationship with VeriWorkly.",
          "Use the Service's AI features to generate content that is illegal, that impersonates a real person without consent, or that you intend to use to deceive an employer about facts that are not true (for example, fabricating credentials, employment history, or qualifications you do not hold).",
        ],
      },
      {
        paragraphs: [
          "We reserve the right to investigate suspected violations and to suspend or terminate access for accounts that violate this Acceptable Use Policy, with or without notice, at our reasonable discretion, particularly in cases involving security, fraud, or abuse.",
        ],
      },
    ],
  },
  {
    id: "ai-disclaimer",
    title: "AI Features: How They Work and Their Limits",
    subsections: [
      {
        heading: "AI output is a draft, not a guarantee",
        paragraphs: [
          "AI-generated text - whether from the resume/cover letter writing assistant, resume tailoring, portfolio copy generation, or the AI-powered layer of the ATS Checker - is produced by third-party large language models and is provided to help you draft faster, not as a finished, verified, or fact-checked product. AI output may contain factual inaccuracies, awkward phrasing, or content that does not reflect your actual experience.",
          "You are solely responsible for reviewing, editing, fact-checking, and approving any AI-generated content before you rely on it, submit it to an employer, or publish it publicly. Nothing in the Service constitutes a representation that AI-generated content is accurate, truthful, or appropriate for your specific situation.",
        ],
      },
      {
        heading: "Credits, cost, and consent",
        paragraphs: [
          "AI actions consume credits from your account's AI credit wallet at a cost shown to you before generation (Standard or Expert mode). Credits are reserved when an action starts and only committed (deducted) on success; a failed generation releases the reservation rather than charging you. Unused monthly subscription credits do not roll over to the next billing cycle. Purchased credit packs and time-boxed pass credits expire as described on the Pricing page.",
          "By triggering an AI action, you consent to your submitted content being transmitted to the relevant third-party AI model provider as described in our Privacy Policy.",
        ],
      },
      {
        heading: "Third-party AI provider availability",
        paragraphs: [
          "AI features depend on third-party model providers we do not control. We are not liable for outages, degraded output quality, rate limiting, or policy changes originating from those providers, though we will make reasonable efforts to keep AI features working and to communicate material disruptions.",
        ],
      },
    ],
  },
  {
    id: "ats-disclaimer",
    title: "ATS Checker & Career Tools Disclaimer",
    intro: [
      "The ATS Checker's readiness score, keyword-match score, and AI-powered analysis are heuristic, educational tools based on general, publicly known plain-text parsing patterns and job descriptions. They are not a simulation of, or guarantee of compatibility with, any specific employer's actual applicant tracking software (such as Workday, Greenhouse, Taleo, Lever, iCIMS, or any other commercial vendor), which we have no visibility into, do not partner with, and cannot test against.",
      "A high ATS score does not guarantee your application will be reviewed, shortlisted, or result in an interview or job offer, and a lower score does not mean your resume will be rejected. Use the ATS Checker as an informational guide when preparing your application materials, not as a substitute for your own professional judgment.",
      "You are solely responsible for ensuring the accuracy, truthfulness, and completeness of all information contained in your resumes, cover letters, and applications. VeriWorkly disclaims all liability for hiring, recruitment, or employment decisions made by prospective employers.",
    ],
  },
  {
    id: "user-content-license",
    title: "User Content & License Grant",
    intro: [
      'You retain all ownership rights in the resumes, cover letters, portfolio content, images, and other material you create or upload to the Service ("User Content"). We do not claim ownership of your career facts, your writing, or your personal brand.',
      "To operate the Service, you grant VeriWorkly a limited, worldwide, non-exclusive, royalty-free license to host, store, reproduce, and process your User Content solely as necessary to provide the Service to you - for example, rendering your document preview, compiling your PDF export, storing your Master Profile, or, if you choose to publish a portfolio or create a share link, displaying that content publicly at the URL you configure. This license ends when you delete the relevant content or your Account, except for residual copies retained in routine backups for a limited period, and except for content that has already been publicly shared and cached, mirrored, or downloaded by third parties beyond our control before deletion.",
    ],
  },
  {
    id: "public-portfolios-sharing",
    title: "Public Portfolios & Sharing",
    intro: [
      "If you publish a portfolio, or create a public or unlisted share link for a resume or cover letter, that content becomes accessible to anyone with the URL - and, for publicly published portfolios, potentially discoverable by search engines - until you unpublish it, revoke the link, or enable password protection. You are solely responsible for the content of anything you choose to publish or share, including ensuring you have the right to publish any third-party material (such as project screenshots or client work) it contains.",
      'Free-tier portfolios display a "Built with VeriWorkly" badge. Removing this badge is a paid feature; attempting to remove it through unauthorized means is a violation of these Terms.',
    ],
  },
  {
    id: "notice-and-takedown",
    title: "Reporting Content: Notice & Takedown",
    intro: [
      "We host content that our users publish - portfolios on veriworkly.com subdomains, and public or unlisted share links. If something published through our Service infringes your rights or breaks our Acceptable Use Policy, this section tells you how to tell us and what we will do about it.",
    ],
    subsections: [
      {
        heading: "Where to send a notice",
        paragraphs: [
          `Send takedown notices to our Grievance Officer at ${siteConfig.legalContact.email}, with "Takedown notice" in the subject line. The postal address is in Section 25. This is the same contact that handles grievances and data-protection questions, so you only ever have one address to find.`,
        ],
      },
      {
        heading: "What a notice must contain",
        list: [
          "The exact URL or URLs of the content you are reporting, so we can find it without guessing.",
          "What is wrong with it: the right you say it infringes, or the part of our Acceptable Use Policy you say it breaks.",
          "Enough about the underlying work or right for us to identify it (for a copyright claim, what the original is and where it can be seen).",
          "Your name, and an email address we can reply to. Say if you are acting for someone else, and for whom.",
          "A statement that you believe in good faith that the use is not authorised by the rights holder, an agent, or the law.",
          "A statement that the information in your notice is accurate, and that you are the rights holder or authorised to act for them.",
        ],
      },
      {
        heading: "What we do, and how fast",
        paragraphs: [
          "We acknowledge receipt within 3 business days, and aim to reach a decision within 10 business days of a complete notice. Where a notice is urgent and clearly well-founded - for example, non-consensual intimate imagery, content that endangers someone, or an obvious impersonation - we act as fast as we practically can, ahead of the general timeline.",
          "These are targets we can actually hold, not a marketing promise. VeriWorkly is run by a very small team, and we would rather publish a timeline we meet than a shorter one we miss. If a notice is incomplete we will tell you what is missing, and the clock starts again when you send it.",
          "If we act, we may unpublish the portfolio, revoke the share link, suspend the publication, or restrict the account, and we purge our caches so the content stops being served. We tell the person who published it what we did and why, unless the law stops us.",
        ],
      },
      {
        heading: "Counter-notice: if your content was removed",
        paragraphs: [
          `If we removed or restricted something of yours and you believe that was wrong, reply to our notice or write to ${siteConfig.legalContact.email} with "Counter-notice" in the subject line. Tell us what was removed, why you believe you have the right to publish it, and your contact details.`,
          "We will pass your counter-notice to the person who complained. If they do not tell us within 10 business days that they are pursuing the matter legally, we may restore the content. We are not a court, and we will not sit in judgment between two strangers each asserting rights - where a dispute is genuinely contested, our role is to keep both of you informed and let you resolve it properly.",
        ],
      },
      {
        heading: "Repeat infringers",
        paragraphs: [
          "We keep a record of takedown notices we act on. Where an account is the subject of repeated well-founded complaints, we will terminate it. We apply this judgement honestly rather than mechanically: notices that turn out to be unfounded, or that are withdrawn or successfully countered, do not count against you.",
        ],
      },
      {
        heading: "Abuse of this process",
        paragraphs: [
          "Sending a knowingly false takedown notice is itself a misuse of the Service, and may make you liable for the damage it causes. We would rather receive a good-faith notice that turns out to be mistaken than none at all, but we do not act on notices sent to silence criticism or competition.",
        ],
      },
    ],
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    subsections: [
      {
        heading: "Our brand is reserved; our code is not",
        paragraphs: [
          'The VeriWorkly name, wordmark, logo, and brand assets are our trademarks. They are not covered by the MIT License, which is a copyright licence and is silent on trademarks, and they are not licensed to you for reuse. "VeriWorkly" and our logo may not be used to imply endorsement, affiliation, or sponsorship without our written permission. If you fork our repository, you may use the code under MIT, but you must remove our branding and ship under a different name.',
          "This reservation is limited to the brand, and we state it that way deliberately. Templates and other assets published in our repository are covered by the MIT License like the rest of it, and we do not claim otherwise below.",
        ],
      },
      {
        heading: "Open-source code and templates",
        paragraphs: [
          `Our codebase, including the document and portfolio templates published in it, is released under the MIT License in our public repository at ${siteConfig.links.github}. There is a single LICENSE file at the repository root and no per-directory or per-file licence notices, so the same MIT terms apply throughout. That licence governs your rights to use, copy, modify, distribute, sublicense, and sell that code and those templates, independently of these Terms, which govern your use of the hosted Service at veriworkly.com.`,
          "We say this plainly because a reservation you can disprove in one click weakens every other reservation in this document. If we ever move a template out of the open-source tree, that change applies only to versions published after the move: anything already released under MIT stays released under MIT.",
          `See TRADEMARK.md and LICENSING.md in the repository for the precise boundary between what MIT covers and what it does not.`,
        ],
      },
      {
        heading: "Third-party trademarks",
        paragraphs: [
          "All third-party company names, product names, service names, and logos referenced on our website or within our documentation (including applicant tracking systems such as Workday, Greenhouse, Taleo, Lever, iCIMS, SAP, Oracle, and others) are the trademarks or registered trademarks of their respective holders. Reference to them is made solely for nominative, descriptive, or educational identification purposes. Use of these names does not imply or constitute any affiliation with, endorsement by, or sponsorship from the respective trademark owners.",
        ],
      },
      {
        heading: "Feedback",
        paragraphs: [
          "If you send us feedback, suggestions, or feature ideas (including through the public roadmap or GitHub), you grant us a perpetual, irrevocable, royalty-free license to use that feedback without any obligation to you, unless we agree otherwise in writing.",
        ],
      },
    ],
  },
  {
    id: "third-party-integrations",
    title: "Third-Party Integrations & Services",
    intro: [
      "The Service integrates with third-party providers, including Google, GitHub, and LinkedIn (for OAuth sign-in and, for GitHub, data import), and Dodo Payments (for billing). Your use of those integrations is also subject to the relevant third party's own terms of service and privacy policy. We are not responsible for the availability, accuracy, or practices of these third-party services, and we are not liable for any loss arising from their outages, policy changes, or discontinuation.",
    ],
  },
  {
    id: "billing",
    title: "Subscriptions, Billing & Payments",
    subsections: [
      {
        heading: "Payment processing",
        paragraphs: [
          "All payments are processed by Dodo Payments. By subscribing or making a purchase, you authorize Dodo Payments to charge your chosen payment method for the applicable fees. Prices are listed in USD unless stated otherwise, and applicable taxes may be added at checkout depending on your location.",
        ],
      },
      {
        heading: "Subscriptions & auto-renewal",
        paragraphs: [
          "Subscription plans (Creator Pro, AI Credits Standalone, and the Job Hunter Bundle) automatically renew at the end of each billing period at the then-current price, until you cancel.",
          "We do not offer free trials on any plan. There is no trial period to forget about and no automatic conversion from free to paid: when you subscribe, you are charged at checkout for the period you chose, and the price and billing period are shown before you pay. The 3-Day Sprint and 7-Day Hunt passes are one-time purchases that simply expire — they do not renew.",
          "You can cancel a subscription at any time from the Billing page, which opens our payment provider's portal; cancellation takes effect at the end of the current billing period, and you retain access to paid features until then.",
        ],
      },
      {
        heading: "Time-boxed passes & one-time purchases",
        paragraphs: [
          "Passes (such as the 3-Day Sprint or 7-Day Hunt pass) and one-time AI credit top-ups are single, non-recurring purchases that grant time-boxed or expiring access as described on the Pricing page at the time of purchase. They do not auto-renew.",
        ],
      },
      {
        heading: "Credit expiration",
        paragraphs: [
          "Monthly subscription AI credits do not roll over between billing cycles. One-time credit-pack purchases expire 90 days after purchase, or immediately upon cancellation of an associated subscription where stated. Pass-granted credits expire when the pass's time window ends.",
        ],
      },
      {
        heading: "Grace periods & suspension",
        paragraphs: [
          "If a subscription payment fails or lapses, portfolio publish access enters a grace period (7 days by default) before the published site is suspended. We may change grace period lengths with notice.",
        ],
      },
      {
        heading: "Your right to cancel a purchase (EEA & UK consumers)",
        paragraphs: [
          "If you are a consumer in the European Economic Area or the United Kingdom, you normally have 14 days from purchase to withdraw from a contract for digital services and get your money back, without giving a reason.",
          "Because our paid features work the moment you buy them, we ask you at checkout to consent to us starting straight away, and to acknowledge that once we have fully performed you lose that 14-day right. You do not have to agree: if you would rather keep the full withdrawal period, say so at checkout and we will hold delivery until it expires.",
          "If you withdraw after performance has begun with your consent but before it is complete, you pay only for what you actually used, in proportion to the whole contract. To withdraw, write to our Grievance Officer (Section 25) — a clear statement is enough, no particular form is needed.",
          "Nothing here limits any statutory cancellation or refund right you have under the consumer law of your own country. Where the two differ, whichever gives you more wins.",
        ],
      },
      {
        heading: "Refunds",
        paragraphs: [
          "Outside the statutory cancellation right above, purchases and subscription charges are generally non-refundable — our lowest-cost passes are deliberately priced so you can test the Service before committing to anything recurring. We do refund demonstrable double-billing, unauthorized charges, and technical failures that stopped you receiving the feature you paid for, and we will use discretion sensibly beyond that.",
          `Refund requests go to ${siteConfig.legalContact.email}. Because Dodo Payments is the merchant of record for your purchase, some refunds are processed by them under their own terms; we will tell you if that applies to yours rather than sending you back and forth.`,
        ],
      },
      {
        heading: "What we tell you before and after you buy",
        paragraphs: [
          "Before you pay, checkout shows the price, the billing period, whether the plan auto-renews, and — for a trial — the date it converts and the amount you will then be charged. After you pay, we email you a confirmation repeating those terms.",
          "Cancelling is self-service and never harder than signing up was: open the Billing page and use the Manage Subscription link, which takes you to our payment provider's portal where you can cancel immediately. We will not make you call us, or sit through a retention flow to leave. Cancellation takes effect at the end of the current billing period, and you keep paid features until then.",
        ],
      },
      {
        heading: "Price changes",
        paragraphs: [
          "We may change our prices from time to time. For active subscribers, we will provide reasonable advance notice before a price change takes effect on your next renewal; continuing your subscription after that notice constitutes acceptance of the new price.",
        ],
      },
    ],
  },
  {
    id: "affiliate-ambassador",
    title: "Affiliate & Ambassador Program Terms",
    intro: [
      "Participation in the Affiliate Program or Student Ambassador Program is subject to these Terms and any additional program-specific guidelines posted on the Affiliate or Ambassador pages, which are incorporated by reference.",
    ],
    subsections: [
      {
        list: [
          "Commission tiers (currently Tier 1 at 2% with no minimum, Tier 2 at 3% after 10 conversions, and Tier 3 at 5% after 50 conversions) and the $25 minimum withdrawal threshold may change with notice posted on the Affiliate page.",
          "Self-referrals, purchasing traffic through prohibited channels, misrepresenting your affiliation with VeriWorkly, spamming referral links, or any other fraudulent activity will result in forfeiture of unpaid commissions and may result in termination from the program and/or your Account.",
          "We reserve the right to withhold, claw back, or reverse commissions we reasonably determine were generated through fraudulent, abusive, or bad-faith activity, including after payout, to the extent recoverable.",
          "We may modify or discontinue the Affiliate or Ambassador programs, or a given participant's enrollment, at our discretion, with commissions earned in good faith prior to discontinuation paid out according to the standard payout process.",
        ],
      },
    ],
  },
  {
    id: "fair-use",
    title: "Free Tier Limits & Fair Use",
    intro: [
      "Free-tier usage (including anonymous ATS scan quotas, free-account ATS scan quotas, and document limits) is subject to the limits described on the Pricing and FAQ pages, which may change over time. Rate limits and quotas exist to keep the Service usable and affordable for everyone; automated or bulk use inconsistent with normal individual, human use of a career workspace may be throttled, blocked, or result in account review, even if a technical limit has not been explicitly exceeded.",
    ],
  },
  {
    id: "developer-api",
    title: "Developer API",
    intro: [
      "Registered users may generate API keys to access account and resume data programmatically, subject to the scopes granted to that key. API keys are stored by us as irreversible hashes, are rate-limited per key, expire automatically (365 days by default unless configured otherwise), and are immediately invalidated if the owning Account's subscription lapses to canceled or inactive where the API access itself is a paid entitlement.",
      'The developer API is provided on an "as available" basis without an uptime service-level agreement, particularly for free-tier or beta-designated endpoints. We may change API scopes, rate limits, or endpoints, including in breaking ways, with reasonable notice where feasible.',
    ],
  },
  {
    id: "open-source-license",
    title: "Open Source License",
    intro: [
      `Portions of VeriWorkly's codebase are released under the MIT License and available at ${siteConfig.links.github}. That license permits you to use, copy, modify, merge, publish, distribute, and self-host that code, subject to its terms (including retaining the copyright and license notice). Running a self-hosted or forked instance of that code is governed by the MIT License, not by these Terms - the two are separate. Operating a self-hosted instance does not entitle you to support, uptime, or any obligation from us regarding the hosted Service at veriworkly.com, and these Terms govern your relationship with us only with respect to your use of that hosted Service.`,
    ],
  },
  {
    id: "availability",
    title: "Service Availability & Modifications",
    intro: [
      'We provide the Service on an "as available" basis. We do not guarantee that the Service will be uninterrupted, timely, secure, or error-free, and we do not offer an uptime SLA for the free tier or for beta/roadmap features. We may modify, suspend, or discontinue any part of the Service - including individual features - at any time, with notice where reasonably feasible for material changes affecting paid functionality. Features described as "planned" or "in progress" on our public roadmap are not commitments and may change, be delayed, or not ship at all.',
    ],
  },
  {
    id: "disclaimer-of-warranties",
    title: "Disclaimer of Warranties",
    intro: [
      'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, THAT DEFECTS WILL BE CORRECTED, OR THAT AI-GENERATED CONTENT, ATS SCORES, OR ANY OTHER OUTPUT WILL BE ACCURATE, COMPLETE, OR SUITABLE FOR YOUR PURPOSES. WE DO NOT WARRANT OR GUARANTEE ANY PARTICULAR JOB-SEARCH, HIRING, RECRUITMENT, OR CAREER OUTCOME FROM USING THE SERVICE.',
      "Some jurisdictions do not allow the exclusion of certain warranties, so some of the above exclusions may not apply to you, in which case our warranties are limited to the minimum extent permitted by applicable law.",
    ],
  },
  {
    id: "limitation-of-liability",
    title: "Limitation of Liability",
    intro: [
      "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW: VERIWORKLY AND ITS TEAM WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (A) YOUR USE OF OR INABILITY TO USE THE SERVICE; (B) LOSS OF LOCALLY STORED, UN-SYNCED DATA (SEE SECTION 5); (C) ANY AI-GENERATED CONTENT OR ATS SCORE, INCLUDING ANY DECISION YOU MAKE BASED ON IT; (D) ANY JOB-SEARCH, RECRUITMENT, HIRING, OR CAREER OUTCOME, INCLUDING LOST EMPLOYMENT OPPORTUNITIES; (E) UNAUTHORIZED ACCESS TO OR ALTERATION OF YOUR CONTENT; OR (F) ANY THIRD-PARTY CONDUCT OR CONTENT ON THE SERVICE, INCLUDING PUBLISHED PORTFOLIOS OF OTHER USERS.",
      "IN NO EVENT WILL VERIWORKLY'S TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THE SERVICE OR THESE TERMS EXCEED THE GREATER OF (I) THE TOTAL AMOUNT YOU PAID TO VERIWORKLY IN THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM, OR (II) USD $100. BECAUSE MOST USE OF THE SERVICE IS FREE, THIS CAP WILL, FOR MOST USERS, BE THE FLAT USD $100 FIGURE.",
      "Nothing in these Terms excludes or limits our liability for: (a) death or personal injury caused by our negligence; (b) fraud or fraudulent misrepresentation; (c) gross negligence or wilful misconduct; (d) any statutory rights you have as a consumer that cannot be excluded or limited by agreement; (e) our obligations and liability under applicable data-protection law; or (f) anything else for which liability cannot lawfully be excluded or limited. Where any of these apply, the exclusions and the cap above do not.",
      "Some jurisdictions do not allow the limitation or exclusion of liability for certain damages, so some of the above limitations may not apply to you, in which case our liability is limited to the minimum extent permitted by applicable law.",
      "We want to be straightforward about what this section is doing. A total exclusion of liability is not achievable in the places we operate, and a clause that tries to reach one is more likely to be struck down in full, which would leave you and us with less certainty rather than more. So this section is capped, carved out, and severable on purpose.",
    ],
  },
  {
    id: "indemnification",
    title: "Indemnification",
    intro: [
      "If a third party brings a claim against us because of something you did, you agree to indemnify us for that claim. Specifically, you will indemnify and hold harmless VeriWorkly and its team against third-party claims, and the damages and reasonable legal fees finally awarded or agreed in settlement for them, to the extent they arise from: (a) User Content you published through the Service; (b) your breach of these Terms or the Acceptable Use Policy; or (c) your infringement of a third party's intellectual property, privacy, or other rights, or your unlawful conduct.",
      "This is limited to claims actually brought by someone else. It does not make you responsible for our own acts or omissions, for claims arising from our negligence or breach, or for amounts attributable to our own fault.",
      "If we want to rely on this, we must: notify you promptly in writing once we are aware of the claim; give you the option to take over the defence and settlement of it with counsel of your choosing, provided any settlement that admits fault on your behalf or imposes an obligation on you needs your agreement; and give you reasonable cooperation and information at our own expense. If we do not do those things and you are prejudiced as a result, your obligation is reduced accordingly.",
      "If you are a consumer, this section applies only to the extent permitted by the consumer-protection law that applies to you, and never further.",
    ],
  },
  {
    id: "termination",
    title: "Termination",
    subsections: [
      {
        heading: "By you",
        paragraphs: [
          `You may stop using the Service at any time. You can permanently delete your Account and all associated data from the "Danger Zone" on your Profile page in the Studio, or by emailing ${siteConfig.legalContact.email}. Deleting your Account does not automatically entitle you to a refund of prior payments, subject to Section 14 ("Billing").`,
        ],
      },
      {
        heading: "By us",
        paragraphs: [
          "We may suspend or terminate your access to the Service, with or without notice, if we reasonably believe you have violated these Terms (including the Acceptable Use Policy), created legal exposure or risk to VeriWorkly or other users, or if required to comply with law. Where practical and where the violation is not severe (fraud, security abuse, or illegal content), we will attempt to notify you and, where appropriate, give you an opportunity to remedy the issue before termination.",
        ],
      },
      {
        heading: "Effect of termination",
        paragraphs: [
          "Upon termination, your right to use the Service ends immediately. We will handle your data on termination consistent with our Privacy Policy's retention terms. Sections of these Terms that by their nature should survive termination - including Intellectual Property, Disclaimer of Warranties, Limitation of Liability, Indemnification, Dispute Resolution, and this sentence - will survive.",
        ],
      },
    ],
  },
  {
    id: "dispute-resolution",
    title: "Governing Law & Dispute Resolution",
    intro: [
      "We encourage you to contact us first at " +
        siteConfig.email +
        " to resolve any dispute informally - most issues can be sorted out directly and faster than through any formal process.",
      "These Terms are governed by the laws of India, without regard to conflict-of-laws principles. Subject to the paragraph below, the courts at Bengaluru, Karnataka, India have exclusive jurisdiction over any dispute arising out of or relating to these Terms or the Service, and you and we each consent to that jurisdiction and venue.",
      "Nothing in this section takes away rights you cannot be deprived of by contract. If you are a consumer, you keep the benefit of any mandatory consumer-protection rules of the country where you live, and you keep the right to bring proceedings in the courts of that country where local law gives you that right. If you are a consumer in the European Economic Area or the United Kingdom, this clause does not deprive you of the protection of your home law or your home forum.",
      "Nothing in this section prevents either of us from seeking urgent injunctive or equitable relief from any court of competent jurisdiction, or from you complaining to a regulator or supervisory authority rather than going to court.",
      "We have not included an arbitration clause or a class-action waiver, and this is a deliberate choice rather than an oversight. For a service that is free for most users and carries the liability cap in Section 20, we do not think forcing individual arbitration is worth the cost to you or to us.",
    ],
  },
  {
    id: "changes-to-terms",
    title: "Changes to These Terms",
    intro: [
      'We may revise these Terms from time to time. If we make material changes, we will update the "Last updated" date below and, where appropriate, provide additional notice (such as an in-app banner or email to registered Accounts). Continued use of the Service after a revised version becomes effective constitutes your acceptance of the changes. If you do not agree to a revision, your only recourse is to stop using the Service and, if applicable, delete your Account.',
    ],
  },
  {
    id: "miscellaneous",
    title: "General Provisions",
    subsections: [
      {
        heading: "Severability",
        paragraphs: [
          "If any provision of these Terms is found unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will remain in full force and effect.",
        ],
      },
      {
        heading: "Entire agreement",
        paragraphs: [
          "These Terms, together with our Privacy Policy and any program-specific terms referenced within them (such as affiliate program guidelines), constitute the entire agreement between you and VeriWorkly regarding the Service, and supersede any prior agreements on the subject.",
        ],
      },
      {
        heading: "No waiver",
        paragraphs: [
          "Our failure to enforce any right or provision of these Terms will not be considered a waiver of that right or provision.",
        ],
      },
      {
        heading: "Assignment",
        paragraphs: [
          "You may not assign or transfer these Terms, by operation of law or otherwise, without our prior written consent. We may assign these Terms without restriction, including in connection with a merger, acquisition, or sale of assets, subject to Section 10's business-transfer notice obligations under our Privacy Policy.",
        ],
      },
      {
        heading: "Force majeure",
        paragraphs: [
          "We are not liable for any failure or delay in performance to the extent caused by circumstances beyond our reasonable control, including acts of God, natural disaster, war, terrorism, labor disputes, internet or infrastructure failures, or actions of third-party service or AI model providers.",
        ],
      },
      {
        heading: "Export & sanctions compliance",
        paragraphs: [
          "You represent that you are not located in, and are not a national or resident of, any country subject to comprehensive trade sanctions, and are not on any restricted-party list, and that you will comply with applicable export control and sanctions laws in your use of the Service.",
        ],
      },
    ],
  },
  {
    id: "contact-terms",
    title: "Contact Information",
    intro: [
      `Questions about these Terms can be sent to ${siteConfig.email}, or through the Contact page. Our public repository is available at ${siteConfig.links.github} for anyone who wants to review how the Service is actually built.`,
    ],
    subsections: [
      {
        heading: "Grievance Officer & Data Protection Contact",
        paragraphs: [
          "For complaints about the Service, takedown notices, and questions about how we handle your personal data, there is one named person to write to rather than a shared alias:",
        ],
        list: [
          `${siteConfig.legalContact.name}, ${siteConfig.legalContact.role}`,
          `Email: ${siteConfig.legalContact.email}`,
          `Post: ${siteConfig.legalContact.postalAddress}`,
        ],
      },
      {
        heading: "How we handle complaints",
        paragraphs: [
          "We acknowledge grievances within 3 business days and aim to resolve them within 30 days. If we cannot resolve something in that time, we will tell you where it stands and why rather than letting it go quiet.",
          "If you are not satisfied with how we handle your complaint, you can escalate it to the data protection authority in your jurisdiction. Nothing in these Terms requires you to come to us first before doing that.",
        ],
      },
    ],
  },
];
