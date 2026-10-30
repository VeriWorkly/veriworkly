import { Globe, Layout, Settings, DollarSign, HelpCircle } from "lucide-react";

import {
  CREDIT_PACKS,
  CREDIT_PACK_VALID_DAYS,
  PASS_NAMES,
  PASS_PRICES,
  PLAN_NAMES,
  PLAN_PRICES,
  annualPerMonth,
  usd,
} from "@/features/pricing/data/offers";

export const categories = [
  { id: "all", name: "All Questions", icon: HelpCircle },
  { id: "general", name: "General & Product", icon: Layout },
  { id: "templates", name: "Templates & Media", icon: Settings },
  { id: "domains", name: "Subdomains & SEO", icon: Globe },
  { id: "billing", name: "Billing & Subscriptions", icon: DollarSign },
] as const;

const { portfolio_pro: pro, ai_credits: ai, bundle } = PLAN_NAMES;

/** "$9.99 a month or $95.88 a year ($7.99 a month)" from the shared price table. */
const planPrice = (plan: keyof typeof PLAN_PRICES) =>
  `${usd(PLAN_PRICES[plan].monthly)} a month or ${usd(PLAN_PRICES[plan].annual)} a year (${usd(annualPerMonth(plan))} a month)`;

const packList = CREDIT_PACKS.map(
  (pack) => `${pack.credits.toLocaleString("en-US")} credits for ${usd(pack.price)}`,
).join(", ");

const paidPortfolio = `${pro}, the ${bundle} or a pass`;

export const faqs = [
  {
    id: "diff",
    category: "general",
    question: "How does the portfolio builder differ from the resume builder?",
    answer:
      "The resume builder makes print-ready documents such as PDF and DOCX. The portfolio builder turns the same profile into a public website on your own yourname.veriworkly.com subdomain, made to be found and shared online.",
  },

  {
    id: "build-before-paying",
    category: "general",
    question: "Can I build and publish a portfolio for free?",
    answer: `Yes. You can build a draft, preview every template and publish on your own subdomain for free with Signal or Atelier. Free sites show a small "Built with VeriWorkly" badge. You only need ${paidPortfolio} for Nimbus, Cipher, badge removal, analytics and SEO controls. Publishing opens to everyone at launch.`,
  },

  {
    id: "export",
    category: "general",
    question: "Can I export my portfolio?",
    answer:
      "Not yet. The portfolio builder has no export. Your resumes and cover letters export from the VeriWorkly editor as PDF, DOCX, HTML, Markdown, plain text or JSON on every plan, with no watermark.",
  },

  {
    id: "pro-for",
    category: "general",
    question: `Who is ${pro} meant for?`,
    answer: `${pro} is for anyone who wants more than the free site: the Nimbus and Cipher templates, no "Built with VeriWorkly" badge, visitor analytics, SEO controls and multi-page portfolios. It has no AI credits; the ${bundle} adds those.`,
  },

  {
    id: "templates",
    category: "templates",
    question: "How do page templates work?",
    answer: `You can switch templates at any time. Your profile, projects, testimonials and SEO settings stay as they are; only the design changes. Signal and Atelier are free. Nimbus and Cipher need ${paidPortfolio}.`,
  },

  {
    id: "switch-changes",
    category: "templates",
    question: "What changes when I switch visual templates?",
    answer:
      "Only the design and layout. Your content, uploaded images, subdomain and SEO settings stay the same.",
  },

  {
    id: "images",
    category: "templates",
    question: "Is there a limit on images and projects?",
    answer:
      "You can upload project images, screenshots and a profile photo on every plan, free included. There is no set limit on the number of projects you can show.",
  },

  {
    id: "domain",
    category: "domains",
    question: "How do subdomains work?",
    answer:
      "Every portfolio, free or paid, is published on its own VeriWorkly subdomain (like yourname.veriworkly.com) that you choose. Every subdomain is served over HTTPS.",
  },

  {
    id: "analytics",
    category: "domains",
    question: "What does portfolio analytics track?",
    answer: `Analytics comes with ${paidPortfolio}. It counts page views, shows the trend over time and lists the sites that sent visitors to you. It does not track clicks.`,
  },

  {
    id: "pricing",
    category: "billing",
    question: "What plans are available and how do AI writing credits work?",
    answer: `The portfolio is free on Signal or Atelier. The ${PASS_NAMES.one_day} (${usd(PASS_PRICES.one_day)}, 150 AI credits) and the ${PASS_NAMES.seven_day} (${usd(PASS_PRICES.seven_day)}, 400 AI credits) are one-time purchases that give ${pro} features until they end. ${pro} is ${planPrice("portfolio_pro")}. ${ai} is ${planPrice("ai_credits")} for 1,000 AI credits a month. The ${bundle} is ${planPrice("bundle")} and combines both. Subscription credits reset every month and do not roll over.`,
  },

  {
    id: "credits",
    category: "billing",
    question: "How do AI writing credits work and when do they reset?",
    answer: `AI credits are spent when you generate or tailor resumes, cover letters and portfolio bios. ${ai} and the ${bundle} give 1,000 credits every month, on monthly and annual billing alike. They reset each month and do not roll over. The ${PASS_NAMES.one_day} gives 150 credits and the ${PASS_NAMES.seven_day} gives 400, which end with the pass. You have one credit balance across every VeriWorkly app.`,
  },

  {
    id: "rollover",
    category: "billing",
    question: "Do unused AI credits roll over to the next month?",
    answer: `No. Subscription credits reset each month, on annual plans too. Credit packs (${packList}) last ${CREDIT_PACK_VALID_DAYS} days from purchase, with or without a subscription. Pass credits end when the pass ends.`,
  },

  {
    id: "standalone",
    category: "billing",
    question: `Can I buy ${pro} or ${ai} separately?`,
    answer: `Yes. ${pro} is ${planPrice("portfolio_pro")} and adds Nimbus, Cipher, analytics, SEO controls and badge removal, with no AI credits. ${ai} is ${planPrice("ai_credits")} and gives 1,000 credits a month; your portfolio stays on the free plan.`,
  },

  {
    id: "subdomain-cost",
    category: "billing",
    question: "Do I have to pay for a subdomain?",
    answer: `No. Every portfolio gets its own VeriWorkly subdomain (like yourname.veriworkly.com), on the free plan too. ${pro} and the ${bundle} add the premium templates, analytics and badge removal.`,
  },

  {
    id: "upgrade",
    category: "billing",
    question: "Can I change my plan later?",
    answer: `A ${pro} or ${ai} subscriber can upgrade to the ${bundle} at any time from the billing page. The upgrade keeps your billing period (monthly stays monthly, annual stays annual) and you pay only the difference for the rest of that period. Any other change, such as moving to a smaller plan or between monthly and annual billing, works by cancelling in Manage billing and subscribing again when your current period ends. Passes and credit packs are one-time purchases that never renew.`,
  },

  {
    id: "cancel",
    category: "billing",
    question: "What happens if I decide to cancel my subscription?",
    answer:
      'Cancel any time in the billing portal. You keep your paid features until the end of the period you paid for. Your portfolio then gets 7 days of grace before it moves to the free plan: Nimbus becomes Atelier, Cipher becomes Signal, the "Built with VeriWorkly" badge comes back and paid SEO settings are dropped. Your site stays online on its subdomain, and your documents and drafts stay in your account.',
  },

  {
    id: "secure",
    category: "billing",
    question: "Is my payment information secure?",
    answer:
      "Payments are handled by Dodo Payments. VeriWorkly never sees or stores your card details.",
  },
];

export const landingFaqs = [
  faqs.find((f) => f.id === "diff"),
  faqs.find((f) => f.id === "build-before-paying"),
  faqs.find((f) => f.id === "pricing"),
  faqs.find((f) => f.id === "domain"),
  faqs.find((f) => f.id === "templates"),
].filter((f): f is (typeof faqs)[number] => !!f);

export const pricingFaqs = [
  faqs.find((f) => f.id === "credits"),
  faqs.find((f) => f.id === "rollover"),
  faqs.find((f) => f.id === "standalone"),
  faqs.find((f) => f.id === "subdomain-cost"),
  faqs.find((f) => f.id === "upgrade"),
  faqs.find((f) => f.id === "cancel"),
  faqs.find((f) => f.id === "secure"),
].filter((f): f is (typeof faqs)[number] => !!f);
